import type Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, AttachedFile } from '@/types/session';
import type { Snapshot } from '@/types/pdf';
import { CO_READING_SYSTEM_PROMPT } from '@/lib/claude';
import { truncateToTokenBudget, estimateTokens } from '@/lib/utils';
import { DEFAULT_CONTEXT_BUDGET } from '@/types/chat';
import {
  shouldCompactConversation,
  compactConversation,
  estimateTokenCount,
} from './budgetManager';

export interface BuildContextParams {
  messages: ChatMessage[];
  viewedPages: number[];
  visiblePages: number[];
  snapshot?: Snapshot;
  attachedFiles?: AttachedFile[];
  pdfId: string;
  vaultContext?: string;
  pageTexts: Map<number, string>;
  annotationSummary?: string;
}

type ContentBlockParam = Anthropic.ContentBlockParam;
type MessageParam = Anthropic.MessageParam;

export function buildSystemPrompt(vaultContext?: string): string {
  let systemPrompt = CO_READING_SYSTEM_PROMPT;

  if (vaultContext && vaultContext.trim().length > 0) {
    const truncatedVault = truncateToTokenBudget(
      vaultContext,
      DEFAULT_CONTEXT_BUDGET.vaultContext
    );
    systemPrompt += `\n\n--- Prior Knowledge Context ---\n${truncatedVault}`;
  }

  return systemPrompt;
}

export function buildContext(params: BuildContextParams): {
  system: string;
  messages: MessageParam[];
} {
  const {
    messages,
    viewedPages,
    visiblePages,
    snapshot,
    attachedFiles,
    vaultContext,
    pageTexts,
  } = params;

  const system = buildSystemPrompt(vaultContext);

  // ---- Build page content text ----
  const sortedViewedPages = [...viewedPages].sort((a, b) => a - b);
  let pageContentParts: string[] = [];
  let pageTextTokensUsed = 0;

  for (const pageNum of sortedViewedPages) {
    const text = pageTexts.get(pageNum);
    if (!text) continue;

    const tokensNeeded = estimateTokens(text);
    if (pageTextTokensUsed + tokensNeeded > DEFAULT_CONTEXT_BUDGET.pageText) {
      // Truncate this page's text to fit the remaining budget
      const remainingBudget =
        DEFAULT_CONTEXT_BUDGET.pageText - pageTextTokensUsed;
      if (remainingBudget > 100) {
        const truncated = truncateToTokenBudget(text, remainingBudget);
        pageContentParts.push(`[Page ${pageNum}]\n${truncated}`);
      }
      break;
    }

    pageContentParts.push(`[Page ${pageNum}]\n${text}`);
    pageTextTokensUsed += tokensNeeded;
  }

  // ---- Prepare the Anthropic messages array ----
  const anthropicMessages: MessageParam[] = [];

  // Add page text context as the first user message if we have page content
  if (pageContentParts.length > 0 || visiblePages.length > 0 || snapshot) {
    const contextBlocks: ContentBlockParam[] = [];

    // Page text content
    if (pageContentParts.length > 0) {
      contextBlocks.push({
        type: 'text',
        text: `--- Document Content (pages you have viewed) ---\n${pageContentParts.join('\n\n')}`,
      });
    }

    // Visible page images (currently rendered pages)
    for (const pageNum of visiblePages.slice(0, 3)) {
      const text = pageTexts.get(pageNum);
      if (text) {
        contextBlocks.push({
          type: 'text',
          text: `[Currently viewing page ${pageNum}]`,
        });
      }
    }

    // Snapshot image
    if (snapshot) {
      contextBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: snapshot.imageBase64,
        },
      });
      contextBlocks.push({
        type: 'text',
        text: `[Snapshot from page ${snapshot.pageNumber}, region: x=${snapshot.rect.x}, y=${snapshot.rect.y}, w=${snapshot.rect.w}, h=${snapshot.rect.h}]`,
      });
    }

    // Annotation summary
    if (params.annotationSummary) {
      contextBlocks.push({
        type: 'text',
        text: params.annotationSummary,
      });
    }

    // Attached files summary
    if (attachedFiles && attachedFiles.length > 0) {
      const fileList = attachedFiles.map((f) => f.name).join(', ');
      contextBlocks.push({
        type: 'text',
        text: `[Attached files available: ${fileList}. Use the read_file tool to access their contents.]`,
      });
    }

    contextBlocks.push({
      type: 'text',
      text: 'The above is the document context. Please answer the user\'s questions based on this content.',
    });

    anthropicMessages.push({
      role: 'user',
      content: contextBlocks,
    });

    anthropicMessages.push({
      role: 'assistant',
      content:
        'I have the document context loaded. I can see the pages you\'ve viewed and I\'m ready to help you understand the content. What would you like to discuss?',
    });
  }

  // ---- Add conversation history ----
  let conversationMessages = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  );

  // Compact if exceeding budget
  if (
    shouldCompactConversation(
      conversationMessages,
      DEFAULT_CONTEXT_BUDGET.conversationHistory
    )
  ) {
    conversationMessages = compactConversation(conversationMessages).filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    // If compaction produced a system message, prepend it as a user message
    const systemMsgs = compactConversation(messages).filter(
      (m) => m.role === 'system'
    );
    if (systemMsgs.length > 0) {
      anthropicMessages.push({
        role: 'user',
        content: systemMsgs[0].content,
      });
      anthropicMessages.push({
        role: 'assistant',
        content: 'Understood. I have the conversation summary and will continue from here.',
      });
    }
  }

  // Convert ChatMessages to Anthropic MessageParams
  for (const msg of conversationMessages) {
    if (msg.role === 'user') {
      const userContent: ContentBlockParam[] = [];

      // Include snapshot if the user message had one
      if (msg.snapshot) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: msg.snapshot.imageBase64,
          },
        });
        userContent.push({
          type: 'text',
          text: `[Snapshot from page ${msg.snapshot.pageNumber}]`,
        });
      }

      userContent.push({
        type: 'text',
        text: msg.content,
      });

      anthropicMessages.push({
        role: 'user',
        content: userContent,
      });
    } else if (msg.role === 'assistant') {
      // Truncate very long assistant messages to save context
      const content = truncateToTokenBudget(
        msg.content,
        DEFAULT_CONTEXT_BUDGET.conversationHistory / 4
      );
      anthropicMessages.push({
        role: 'assistant',
        content,
      });
    }
  }

  // Ensure messages alternate correctly: must start with user and alternate
  // If somehow we end up with consecutive same-role messages, merge them
  const cleaned = ensureAlternating(anthropicMessages);

  return { system, messages: cleaned };
}

function ensureAlternating(messages: MessageParam[]): MessageParam[] {
  if (messages.length === 0) return messages;

  const result: MessageParam[] = [];

  for (const msg of messages) {
    if (result.length === 0) {
      // First message must be from user
      if (msg.role === 'user') {
        result.push(msg);
      } else {
        // Insert a placeholder user message
        result.push({ role: 'user', content: 'Hello.' });
        result.push(msg);
      }
    } else {
      const lastRole = result[result.length - 1].role;
      if (msg.role === lastRole) {
        // Merge with previous message of the same role
        const prev = result[result.length - 1];
        const prevContent =
          typeof prev.content === 'string'
            ? [{ type: 'text' as const, text: prev.content }]
            : (prev.content as ContentBlockParam[]);
        const currContent =
          typeof msg.content === 'string'
            ? [{ type: 'text' as const, text: msg.content }]
            : (msg.content as ContentBlockParam[]);
        result[result.length - 1] = {
          role: msg.role,
          content: [...prevContent, ...currContent],
        };
      } else {
        result.push(msg);
      }
    }
  }

  // Ensure last message is from user (required by Claude API)
  if (result.length > 0 && result[result.length - 1].role !== 'user') {
    // This shouldn't normally happen since we add conversation messages
    // and the last one should be the new user message. But just in case:
    result.push({ role: 'user', content: 'Please continue.' });
  }

  return result;
}
