import { NextRequest } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { ChatRequest, ChatStreamEvent } from '@/types/chat';
import type { Session, ChatMessage, ToolCall, AttachedFile } from '@/types/session';
import { anthropicClient, CO_READING_SYSTEM_PROMPT, TOOL_DEFINITIONS } from '@/lib/claude';
import { buildContext } from '@/lib/context/contextBuilder';
import { extractPagesText } from '@/lib/pdf/extractText';
import { getPdfPath } from '@/lib/pdf/pdfStorage';
import { executeBraveSearch } from '@/lib/tools/braveSearch';
import { executeFileRead } from '@/lib/tools/fileRead';
import { generateId } from '@/lib/utils';
import type Anthropic from '@anthropic-ai/sdk';

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');
const MAX_TOOL_ITERATIONS = 5;

async function loadSession(sessionId: string): Promise<Session> {
  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  const raw = await readFile(sessionPath, 'utf-8');
  return JSON.parse(raw) as Session;
}

async function saveSession(session: Session): Promise<void> {
  const sessionPath = path.join(SESSIONS_DIR, `${session.id}.json`);
  await writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
}

function encodeSSE(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const {
      sessionId,
      message,
      snapshot,
      attachedFiles,
      viewedPages,
      visiblePages,
      pdfId,
    } = body;

    if (!sessionId || !message) {
      return new Response(JSON.stringify({ error: 'sessionId and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load session
    let session: Session;
    try {
      session = await loadSession(sessionId);
    } catch {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract page texts for viewed pages
    const pdfPath = getPdfPath(pdfId);
    let pageTexts = new Map<number, string>();

    if (viewedPages.length > 0) {
      const minPage = Math.min(...viewedPages);
      const maxPage = Math.max(...viewedPages);
      try {
        pageTexts = await extractPagesText(pdfPath, minPage, maxPage);
      } catch (err) {
        console.error('Page text extraction error:', err);
        // Continue without page texts rather than failing
      }
    }

    // Add user message to session
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      snapshot: snapshot ?? undefined,
      attachedFiles: attachedFiles ?? undefined,
    };
    session.messages.push(userMessage);

    // Update viewed pages in session
    for (const p of viewedPages) {
      if (!session.viewedPages.includes(p)) {
        session.viewedPages.push(p);
      }
    }

    // Build context for Claude
    const { system, messages: anthropicMessages } = buildContext({
      messages: session.messages,
      viewedPages,
      visiblePages,
      snapshot,
      attachedFiles,
      pdfId,
      vaultContext: '',
      pageTexts,
    });

    // Set up SSE streaming
    const encoder = new TextEncoder();
    const assistantMessageId = generateId();
    let fullAssistantContent = '';
    const toolCalls: ToolCall[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages: Anthropic.MessageParam[] = [...anthropicMessages];
          let iterations = 0;

          // Tool-use loop
          while (iterations < MAX_TOOL_ITERATIONS) {
            iterations++;

            const response = await anthropicClient.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 4096,
              system,
              tools: TOOL_DEFINITIONS,
              messages: currentMessages,
              stream: true,
            });

            let hasToolUse = false;
            const toolUseBlocks: Array<{
              id: string;
              name: string;
              input: Record<string, unknown>;
            }> = [];
            let currentToolId = '';
            let currentToolName = '';
            let inputJson = '';

            for await (const event of response) {
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'text') {
                  // Text block starting
                } else if (event.content_block.type === 'tool_use') {
                  hasToolUse = true;
                  currentToolId = event.content_block.id;
                  currentToolName = event.content_block.name;
                  inputJson = '';

                  const toolStartEvent: ChatStreamEvent = {
                    type: 'tool_use_start',
                    toolName: currentToolName,
                  };
                  controller.enqueue(encoder.encode(encodeSSE(toolStartEvent)));
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  const text = event.delta.text;
                  fullAssistantContent += text;

                  const textEvent: ChatStreamEvent = {
                    type: 'text_delta',
                    text,
                  };
                  controller.enqueue(encoder.encode(encodeSSE(textEvent)));
                } else if (event.delta.type === 'input_json_delta') {
                  inputJson += event.delta.partial_json;
                }
              } else if (event.type === 'content_block_stop') {
                if (currentToolName && currentToolId) {
                  let parsedInput: Record<string, unknown> = {};
                  try {
                    parsedInput = inputJson ? JSON.parse(inputJson) : {};
                  } catch {
                    parsedInput = {};
                  }

                  toolUseBlocks.push({
                    id: currentToolId,
                    name: currentToolName,
                    input: parsedInput,
                  });

                  currentToolId = '';
                  currentToolName = '';
                  inputJson = '';
                }
              }
            }

            // If no tool use, we're done
            if (!hasToolUse || toolUseBlocks.length === 0) {
              break;
            }

            // Execute tools and feed results back
            const assistantContent: Anthropic.ContentBlockParam[] = [];

            // Reconstruct the assistant message with text and tool_use blocks
            if (fullAssistantContent.trim()) {
              assistantContent.push({
                type: 'text',
                text: fullAssistantContent,
              });
            }

            for (const tool of toolUseBlocks) {
              assistantContent.push({
                type: 'tool_use',
                id: tool.id,
                name: tool.name,
                input: tool.input,
              });
            }

            // Add assistant message with tool use to conversation
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: assistantContent },
            ];

            // Execute each tool and build tool_result messages
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const tool of toolUseBlocks) {
              let result: string;

              try {
                if (tool.name === 'brave_search') {
                  result = await executeBraveSearch(
                    tool.input.query as string,
                    tool.input.count as number | undefined
                  );
                } else if (tool.name === 'read_file') {
                  result = await executeFileRead(
                    tool.input.file_path as string,
                    attachedFiles ?? []
                  );
                } else {
                  result = `Unknown tool: ${tool.name}`;
                }
              } catch (err) {
                result = `Tool error: ${err instanceof Error ? err.message : 'Unknown error'}`;
              }

              // Track tool call for the message
              toolCalls.push({
                id: tool.id,
                name: tool.name,
                input: tool.input,
                result,
                status: 'complete',
              });

              const toolResultEvent: ChatStreamEvent = {
                type: 'tool_use_result',
                toolName: tool.name,
                result,
              };
              controller.enqueue(encoder.encode(encodeSSE(toolResultEvent)));

              toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: result,
              });
            }

            // Add tool results as a user message
            currentMessages = [
              ...currentMessages,
              { role: 'user', content: toolResults },
            ];

            // Reset for next iteration: Claude will respond to the tool results
            // and we clear accumulated text so we only capture the new response
            fullAssistantContent = '';
          }

          // Send message complete event
          const completeEvent: ChatStreamEvent = {
            type: 'message_complete',
            messageId: assistantMessageId,
          };
          controller.enqueue(encoder.encode(encodeSSE(completeEvent)));

          // Persist assistant message to session
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: fullAssistantContent,
            timestamp: Date.now(),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          };
          session.messages.push(assistantMessage);
          await saveSession(session);
        } catch (err) {
          console.error('Chat stream error:', err);
          const errorEvent: ChatStreamEvent = {
            type: 'error',
            message: err instanceof Error ? err.message : 'An unexpected error occurred',
          };
          controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
