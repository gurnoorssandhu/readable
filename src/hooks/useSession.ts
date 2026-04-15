'use client';

import { useState, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { SessionCreateResponse, Session } from '@/types/session';

interface UseSessionResult {
  startSession: (pdfId: string) => Promise<void>;
  endSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
}

export function useSession(): UseSessionResult {
  const [isLoading, setIsLoading] = useState(false);
  const store = useSessionStore();

  const startSession = useCallback(
    async (pdfId: string) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create session');
        }

        const data: SessionCreateResponse = await res.json();
        store.startSession(data.sessionId, data.vaultContext);
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  const endSession = useCallback(async () => {
    const { sessionId, viewedPages } = useSessionStore.getState();
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end',
          viewedPages: Array.from(viewedPages),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to end session');
      }

      store.endSession();
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/session/${sessionId}`);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load session');
        }

        const { session }: { session: Session } = await res.json();

        // Populate the store from the persisted session
        store.startSession(session.id, '');
        session.viewedPages.forEach((p) => store.addViewedPage(p));
        session.messages.forEach((m) => store.addMessage(m));
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  return { startSession, endSession, loadSession, isLoading };
}
