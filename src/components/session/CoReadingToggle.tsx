'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface CoReadingToggleProps {
  pdfId: string;
  onEndRequest?: () => void;
  compact?: boolean;
}

export function CoReadingToggle({ pdfId, onEndRequest, compact }: CoReadingToggleProps) {
  const isCoReading = useSessionStore((s) => s.isCoReading);
  const { startSession, isLoading } = useSession();

  const handleClick = async () => {
    if (isCoReading) {
      // Opening the end-session confirmation dialog is handled by the parent
      onEndRequest?.();
    } else {
      await startSession(pdfId);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
        title={isCoReading ? 'End Co-Reading' : 'Start Co-Reading'}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <BookOpen
            size={16}
            className={
              isCoReading
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }
          />
        )}
      </button>
    );
  }

  return (
    <Button
      variant={isCoReading ? 'secondary' : 'primary'}
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="relative"
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <>
          {isCoReading && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]" />
            </span>
          )}
          <BookOpen size={16} />
          <span>{isCoReading ? 'Co-Reading' : 'Start Co-Reading'}</span>
        </>
      )}
    </Button>
  );
}
