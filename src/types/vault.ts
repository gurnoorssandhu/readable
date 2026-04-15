export interface VaultNote {
  path: string;
  type: 'pdf-index' | 'session' | 'concept' | 'question' | 'moc';
  frontmatter: Record<string, unknown>;
  content: string;
}

export interface VaultLink {
  from: string;
  to: string;
  context?: string;
}

export interface CondensationResult {
  sessionNote: {
    path: string;
    content: string;
  };
  concepts: Array<{
    slug: string;
    content: string;
    isNew: boolean;
  }>;
  questions: Array<{
    slug: string;
    content: string;
    isNew: boolean;
  }>;
  pdfIndexUpdates: {
    newSessionLinks: string[];
    newConceptLinks: string[];
    newQuestionLinks: string[];
  };
}

export interface VaultContext {
  pdfSummary: string;
  priorSessions: string[];
  concepts: string[];
  questions: string[];
  fullText: string;
}
