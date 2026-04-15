import Anthropic from '@anthropic-ai/sdk';
import { Session } from '@/types/session';
import { PdfMeta } from '@/types/pdf';
import { CondensationResult } from '@/types/vault';
import { generateSlug, formatDate } from '@/lib/utils';
import {
  ensureVaultStructure,
  readNote,
  writeNote,
  getConceptNotes,
  getQuestionNotes,
  getSessionNotes,
} from './vaultManager';
import { addBacklink, updateMOC } from './linker';
import path from 'path';

/**
 * System prompt for the condensation Claude call.
 * Instructs the model to act as a knowledge organizer with structured JSON output.
 */
export const condenserSystemPrompt = `You are a knowledge organizer for an academic reading assistant called Readable. Your job is to condense a co-reading session (a conversation between a reader and an AI about a PDF document) into structured knowledge artifacts for an Obsidian vault.

You will receive:
- PDF metadata (title, authors)
- The full conversation transcript from the session
- A list of existing concept notes in the vault (to avoid duplicates and encourage linking)
- A list of existing open questions in the vault

Your task: Produce a JSON object with the following structure:
{
  "sessionSummary": "A concise markdown summary of what was discussed, key insights gained, and conclusions reached during this session.",
  "concepts": [
    {
      "slug": "kebab-case-concept-name",
      "title": "Human Readable Concept Title",
      "content": "Markdown content explaining this concept as understood from the reading. Include references to the source PDF using [[wiki-links]]."
    }
  ],
  "questions": [
    {
      "slug": "kebab-case-question",
      "title": "The question in human readable form?",
      "content": "Markdown elaboration on why this question matters and what partial answers exist.",
      "status": "open"
    }
  ],
  "tags": ["tag1", "tag2"]
}

Rules:
- sessionSummary should be 3-8 paragraphs of markdown.
- Extract 1-5 concepts that were substantively discussed. Reuse existing concept slugs when the session revisits a known concept (append new insights to the content instead of starting fresh).
- Extract 0-3 open questions that emerged and remain unanswered.
- Use [[wiki-links]] in content to cross-reference other concepts or the PDF.
- Tags should be 2-5 topical tags relevant to the session.
- Output ONLY valid JSON. No markdown fences, no commentary outside the JSON.

## Examples

### Example 1

Input: A session about a machine learning paper discussing gradient descent optimization.

Output:
{
  "sessionSummary": "This session focused on understanding the paper's novel approach to adaptive learning rates. The reader explored how the proposed method differs from Adam and SGD by dynamically adjusting per-parameter rates based on gradient curvature rather than just magnitude.\\n\\nKey insight: the curvature-based approach helps escape saddle points more effectively, which the authors demonstrate on both synthetic benchmarks and CIFAR-10.\\n\\nThe reader noted a potential connection to natural gradient methods, though the authors don't cite this line of work.",
  "concepts": [
    {
      "slug": "adaptive-learning-rates",
      "title": "Adaptive Learning Rates",
      "content": "Optimization methods that adjust the learning rate during training rather than using a fixed schedule.\\n\\nFrom [[gradient-curvature-optimization]]: The paper proposes using gradient curvature (second-order information) rather than gradient magnitude to set per-parameter rates. This contrasts with Adam, which uses first and second moment estimates of the gradient."
    },
    {
      "slug": "saddle-point-escape",
      "title": "Saddle Point Escape in Optimization",
      "content": "Saddle points are critical points where the gradient is zero but the point is neither a local minimum nor maximum. In high-dimensional optimization, saddle points are far more common than local minima.\\n\\nThe curvature-based method in [[gradient-curvature-optimization]] helps escape saddle points by detecting directions of negative curvature and increasing the learning rate along those dimensions."
    }
  ],
  "questions": [
    {
      "slug": "connection-to-natural-gradient",
      "title": "What is the relationship between curvature-based learning rates and natural gradient methods?",
      "content": "The paper's approach of using curvature information is reminiscent of [[natural-gradient-descent]], but the authors don't discuss this connection. Is the proposed method a special case of natural gradient? Does it share the same computational benefits or limitations?",
      "status": "open"
    }
  ],
  "tags": ["optimization", "machine-learning", "gradient-descent", "deep-learning"]
}

### Example 2

Input: A session about a philosophy paper on personal identity and consciousness.

Output:
{
  "sessionSummary": "The session covered Parfit's arguments against the importance of personal identity. The reader worked through the thought experiments involving teleportation and brain fission, focusing on how Parfit uses these to argue that what matters in survival is psychological continuity, not strict identity.\\n\\nThe reader found the Reduplication Argument particularly compelling: if a perfect copy of you is created, both copies have equal claim to being 'you,' which means identity can't be what matters (since it requires uniqueness).\\n\\nSome discussion centered on whether Parfit's view is compatible with moral responsibility. If identity doesn't matter, can we hold a future person-stage responsible for past actions?",
  "concepts": [
    {
      "slug": "psychological-continuity",
      "title": "Psychological Continuity Theory",
      "content": "The view that personal identity over time consists in overlapping chains of psychological connections (memories, intentions, beliefs, desires).\\n\\nParfit in [[reasons-and-persons]] distinguishes between:\\n- **Psychological connectedness**: direct memory/intention links between time-slices\\n- **Psychological continuity**: overlapping chains of such connections\\n\\nHe argues continuity (not identity) is what matters for survival."
    }
  ],
  "questions": [
    {
      "slug": "parfit-moral-responsibility",
      "title": "Is Parfit's view of identity compatible with moral responsibility?",
      "content": "If personal identity is not what matters in survival, and a future person-stage is only psychologically continuous (not identical) with a past person-stage, what grounds moral responsibility? This question connects to [[moral-responsibility]] and [[free-will]] debates.",
      "status": "open"
    }
  ],
  "tags": ["philosophy", "personal-identity", "consciousness", "parfit"]
}`;

/**
 * Build the message array for the condensation Claude call.
 */
export function buildCondensationMessages(
  session: Session,
  pdfMeta: PdfMeta,
  existingConcepts: string[],
  existingQuestions: string[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  // Format the conversation transcript
  const transcript = session.messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const role = m.role === 'user' ? 'Reader' : 'Assistant';
      return `**${role}**: ${m.content}`;
    })
    .join('\n\n');

  const userMessage = `## PDF Metadata
- **Title**: ${pdfMeta.title}
- **Authors**: ${pdfMeta.authors.join(', ')}
- **Pages**: ${pdfMeta.pageCount}
- **PDF Slug**: ${pdfMeta.slug}

## Session Info
- **Session ID**: ${session.id}
- **Started**: ${session.startedAt}
- **Pages Viewed**: ${session.viewedPages.join(', ') || 'none recorded'}

## Existing Concepts in Vault
${existingConcepts.length > 0 ? existingConcepts.map((c) => `- ${c}`).join('\n') : '_None yet_'}

## Existing Open Questions in Vault
${existingQuestions.length > 0 ? existingQuestions.map((q) => `- ${q}`).join('\n') : '_None yet_'}

## Conversation Transcript
${transcript}

Please condense this session into structured knowledge artifacts. Output ONLY valid JSON.`;

  return [{ role: 'user' as const, content: userMessage }];
}

/**
 * Parse the structured JSON response from Claude's condensation output.
 */
export function parseCondensationResponse(response: string): {
  sessionSummary: string;
  concepts: Array<{ slug: string; title: string; content: string }>;
  questions: Array<{
    slug: string;
    title: string;
    content: string;
    status: string;
  }>;
  tags: string[];
} {
  // Strip markdown code fences if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  // Validate the required fields
  if (!parsed.sessionSummary || typeof parsed.sessionSummary !== 'string') {
    throw new Error('Invalid condensation response: missing sessionSummary');
  }

  return {
    sessionSummary: parsed.sessionSummary,
    concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}

/**
 * Orchestrate the full condensation pipeline:
 * 1. Load existing vault state (concepts, questions)
 * 2. Call Claude to condense the session
 * 3. Parse the response
 * 4. Write files to the vault via vaultManager
 * 5. Update links via linker
 */
export async function condenseSession(
  session: Session,
  pdfMeta: PdfMeta
): Promise<CondensationResult> {
  await ensureVaultStructure();

  // 1. Load existing vault state
  const existingConceptNotes = await getConceptNotes();
  const existingQuestionNotes = await getQuestionNotes();

  const existingConcepts = existingConceptNotes.map(
    (n) => (n.frontmatter.title as string) || path.basename(n.path, '.md')
  );
  const existingQuestions = existingQuestionNotes.map(
    (n) => (n.frontmatter.title as string) || path.basename(n.path, '.md')
  );

  // 2. Call Claude
  const client = new Anthropic();
  const messages = buildCondensationMessages(
    session,
    pdfMeta,
    existingConcepts,
    existingQuestions
  );

  const completion = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: condenserSystemPrompt,
    messages,
  });

  const responseText =
    completion.content[0].type === 'text' ? completion.content[0].text : '';

  // 3. Parse response
  const parsed = parseCondensationResponse(responseText);

  // 4. Write files to vault
  const writtenFiles: string[] = [];

  // Ensure PDF directory structure exists
  const pdfDir = path.join('PDFs', pdfMeta.slug);
  const sessionsDir = path.join(pdfDir, 'sessions');

  // Write session note
  const sessionNotePath = path.join(sessionsDir, `${session.id}.md`);
  const sessionFrontmatter = {
    type: 'session',
    sessionId: session.id,
    pdfId: pdfMeta.id,
    pdfSlug: pdfMeta.slug,
    pdfTitle: pdfMeta.title,
    date: formatDate(session.startedAt),
    tags: parsed.tags,
  };
  await writeNote(sessionNotePath, sessionFrontmatter, parsed.sessionSummary);
  writtenFiles.push(sessionNotePath);

  // Write/update concept notes
  const conceptResults: CondensationResult['concepts'] = [];
  const existingConceptSlugs = new Set(
    existingConceptNotes.map((n) => path.basename(n.path, '.md'))
  );

  for (const concept of parsed.concepts) {
    const slug = concept.slug || generateSlug(concept.title);
    const conceptPath = path.join('Concepts', `${slug}.md`);
    const isNew = !existingConceptSlugs.has(slug);

    if (isNew) {
      const conceptFrontmatter = {
        type: 'concept',
        title: concept.title,
        created: formatDate(new Date()),
        sources: [pdfMeta.title],
        tags: parsed.tags,
      };
      await writeNote(conceptPath, conceptFrontmatter, concept.content);
    } else {
      // Append new insights to existing concept
      const existing = await readNote(conceptPath);
      const appendedContent = `${existing.content}\n\n---\n\n### From session ${session.id} (${formatDate(session.startedAt)})\n\n${concept.content}`;
      const updatedFrontmatter = {
        ...existing.frontmatter,
        sources: [
          ...((existing.frontmatter.sources as string[]) || []),
          pdfMeta.title,
        ].filter((v, i, a) => a.indexOf(v) === i), // dedupe
      };
      await writeNote(conceptPath, updatedFrontmatter, appendedContent);
    }

    conceptResults.push({ slug, content: concept.content, isNew });
    writtenFiles.push(conceptPath);
  }

  // Write/update question notes
  const questionResults: CondensationResult['questions'] = [];
  const existingQuestionSlugs = new Set(
    existingQuestionNotes.map((n) => path.basename(n.path, '.md'))
  );

  for (const question of parsed.questions) {
    const slug = question.slug || generateSlug(question.title);
    const questionPath = path.join('Questions', `${slug}.md`);
    const isNew = !existingQuestionSlugs.has(slug);

    if (isNew) {
      const questionFrontmatter = {
        type: 'question',
        title: question.title,
        status: question.status || 'open',
        created: formatDate(new Date()),
        sources: [pdfMeta.title],
        tags: parsed.tags,
      };
      await writeNote(questionPath, questionFrontmatter, question.content);
    } else {
      // Append new context to existing question
      const existing = await readNote(questionPath);
      const appendedContent = `${existing.content}\n\n---\n\n### Additional context from session ${session.id} (${formatDate(session.startedAt)})\n\n${question.content}`;
      await writeNote(questionPath, existing.frontmatter, appendedContent);
    }

    questionResults.push({ slug, content: question.content, isNew });
    writtenFiles.push(questionPath);
  }

  // Write/update PDF index note
  const pdfIndexPath = path.join(pdfDir, '_index.md');
  let pdfIndexFrontmatter: Record<string, unknown>;
  let pdfIndexContent: string;

  try {
    const existingIndex = await readNote(pdfIndexPath);
    pdfIndexFrontmatter = {
      ...existingIndex.frontmatter,
      lastSession: formatDate(session.startedAt),
    };
    // Append new session reference
    pdfIndexContent = `${existingIndex.content}\n- [[${session.id}]] (${formatDate(session.startedAt)})`;
  } catch {
    // Create new PDF index
    pdfIndexFrontmatter = {
      type: 'pdf-index',
      pdfId: pdfMeta.id,
      title: pdfMeta.title,
      authors: pdfMeta.authors,
      pageCount: pdfMeta.pageCount,
      created: formatDate(new Date()),
      lastSession: formatDate(session.startedAt),
    };
    pdfIndexContent = `# ${pdfMeta.title}

**Authors**: ${pdfMeta.authors.join(', ')}
**Pages**: ${pdfMeta.pageCount}

## Sessions
- [[${session.id}]] (${formatDate(session.startedAt)})

## Concepts
${conceptResults.map((c) => `- [[${c.slug}]]`).join('\n') || '_None yet_'}

## Questions
${questionResults.map((q) => `- [[${q.slug}]]`).join('\n') || '_None yet_'}`;
  }
  await writeNote(pdfIndexPath, pdfIndexFrontmatter, pdfIndexContent);
  writtenFiles.push(pdfIndexPath);

  // 5. Update links
  // Add backlinks from concepts/questions to the session
  for (const concept of conceptResults) {
    await addBacklink(
      path.join('Concepts', `${concept.slug}.md`),
      session.id,
      `Discussed in session on ${pdfMeta.title}`
    );
  }

  for (const question of questionResults) {
    await addBacklink(
      path.join('Questions', `${question.slug}.md`),
      session.id,
      `Raised during session on ${pdfMeta.title}`
    );
  }

  // Update MOC
  await updateMOC({
    pdfs: [pdfMeta.title],
    sessions: [`${session.id}`],
    concepts: conceptResults.map((c) => c.slug),
    questions: questionResults.map((q) => q.slug),
  });

  // Build the result
  const result: CondensationResult = {
    sessionNote: {
      path: sessionNotePath,
      content: parsed.sessionSummary,
    },
    concepts: conceptResults,
    questions: questionResults,
    pdfIndexUpdates: {
      newSessionLinks: [session.id],
      newConceptLinks: conceptResults.map((c) => c.slug),
      newQuestionLinks: questionResults.map((q) => q.slug),
    },
  };

  return result;
}
