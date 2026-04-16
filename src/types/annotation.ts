export interface Point {
  x: number;  // normalized to page scale=1 coordinates
  y: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;           // hex: #000000, #ef4444, #3b82f6, #22c55e, #ffffff
  points: Point[];
  pageNumber: number;
  timestamp: number;
}

export interface AnnotationData {
  pdfId: string;
  strokes: Stroke[];
  updatedAt: string;
}
