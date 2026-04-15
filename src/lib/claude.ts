import Anthropic from '@anthropic-ai/sdk';

export const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CO_READING_SYSTEM_PROMPT = `You are a co-reading assistant for academic texts — mathematics, physics, computer science, and research papers. You help the reader understand what they are reading.

Guidelines:
- Only reference content from pages the user has actually viewed. Do not assume knowledge of unviewed pages.
- Remain faithful to the text. Do not fabricate claims, results, or citations that are not present in the provided content.
- When shown a snapshot (a selected region of a page), describe what you see and answer questions about it.
- Use web search when the user's question requires external knowledge beyond the document (e.g., background on a cited paper, definitions of unfamiliar terms, historical context).
- Be concise but thorough. Prioritize clarity over brevity when explaining technical material.
- For math and physics content, show step-by-step reasoning when explaining derivations, proofs, or conceptual arguments.
- When referencing content, mention the page number so the reader can verify.
- If the user asks about something not covered in the viewed pages, say so rather than guessing.`;

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'brave_search',
    description:
      'Search the web for information. Use this when the user asks about something not covered in the document, needs background on a cited work, or asks for definitions or context beyond the PDF.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default 5, max 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_file',
    description:
      'Read the contents of an attached context file. Use this when the user has attached a supplementary file and you need to read its contents.',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'The name of the attached file to read',
        },
      },
      required: ['file_path'],
    },
  },
];
