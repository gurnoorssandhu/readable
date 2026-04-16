import { create } from 'zustand';
import type { Point, Stroke } from '@/types/annotation';

interface AnnotationState {
  annotationMode: 'off' | 'pen' | 'highlighter';
  activeColor: string;
  strokesByPage: Map<number, Stroke[]>;
  undoStack: Stroke[];
  currentStroke: { pageNumber: number; points: Point[] } | null;

  setAnnotationMode: (mode: 'off' | 'pen' | 'highlighter') => void;
  setActiveColor: (color: string) => void;
  addStroke: (stroke: Stroke) => void;
  undo: () => void;
  clearPage: (pageNumber: number) => void;
  loadStrokes: (strokes: Stroke[]) => void;
  setCurrentStroke: (stroke: { pageNumber: number; points: Point[] } | null) => void;
  getAllStrokes: () => Stroke[];
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotationMode: 'off',
  activeColor: '#000000',
  strokesByPage: new Map(),
  undoStack: [],
  currentStroke: null,

  setAnnotationMode: (mode) => set({ annotationMode: mode }),

  setActiveColor: (color) => set({ activeColor: color }),

  addStroke: (stroke) =>
    set((state) => {
      const newMap = new Map(state.strokesByPage);
      const existing = newMap.get(stroke.pageNumber) ?? [];
      newMap.set(stroke.pageNumber, [...existing, stroke]);
      return { strokesByPage: newMap, undoStack: [] };
    }),

  undo: () =>
    set((state) => {
      // Find the last stroke across all pages by timestamp
      let lastStroke: Stroke | null = null;
      let lastPage: number | null = null;

      for (const [pageNumber, strokes] of state.strokesByPage) {
        for (const stroke of strokes) {
          if (!lastStroke || stroke.timestamp > lastStroke.timestamp) {
            lastStroke = stroke;
            lastPage = pageNumber;
          }
        }
      }

      if (!lastStroke || lastPage === null) return state;

      const newMap = new Map(state.strokesByPage);
      const pageStrokes = newMap.get(lastPage) ?? [];
      const filtered = pageStrokes.filter((s) => s.id !== lastStroke!.id);

      if (filtered.length === 0) {
        newMap.delete(lastPage);
      } else {
        newMap.set(lastPage, filtered);
      }

      return {
        strokesByPage: newMap,
        undoStack: [...state.undoStack, lastStroke],
      };
    }),

  clearPage: (pageNumber) =>
    set((state) => {
      const newMap = new Map(state.strokesByPage);
      const removed = newMap.get(pageNumber) ?? [];
      newMap.delete(pageNumber);
      return {
        strokesByPage: newMap,
        undoStack: [...state.undoStack, ...removed],
      };
    }),

  loadStrokes: (strokes) =>
    set(() => {
      const newMap = new Map<number, Stroke[]>();
      for (const stroke of strokes) {
        const existing = newMap.get(stroke.pageNumber) ?? [];
        newMap.set(stroke.pageNumber, [...existing, stroke]);
      }
      return { strokesByPage: newMap, undoStack: [] };
    }),

  setCurrentStroke: (stroke) => set({ currentStroke: stroke }),

  getAllStrokes: () => {
    const state = get();
    const all: Stroke[] = [];
    for (const strokes of state.strokesByPage.values()) {
      all.push(...strokes);
    }
    return all.sort((a, b) => a.timestamp - b.timestamp);
  },
}));
