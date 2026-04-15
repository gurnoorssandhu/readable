'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useSessionStore } from '@/store/sessionStore';
import { useSession } from '@/hooks/useSession';

interface SessionEndDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SessionEndDialog({ open, onClose }: SessionEndDialogProps) {
  const viewedPages = useSessionStore((s) => s.viewedPages);
  const messages = useSessionStore((s) => s.messages);
  const { endSession, isLoading } = useSession();

  const pagesViewed = viewedPages.size;
  const messagesSent = messages.filter((m) => m.role === 'user').length;
  const assistantReplies = messages.filter((m) => m.role === 'assistant').length;

  const handleConfirm = async () => {
    await endSession();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="End Co-Reading Session">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Are you sure you want to end this co-reading session? Here is a
          summary of your progress:
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div className="glass-subtle rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {pagesViewed}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {pagesViewed === 1 ? 'Page' : 'Pages'} Viewed
            </div>
          </div>
          <div className="glass-subtle rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {messagesSent}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {messagesSent === 1 ? 'Message' : 'Messages'} Sent
            </div>
          </div>
          <div className="glass-subtle rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {assistantReplies}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {assistantReplies === 1 ? 'Reply' : 'Replies'}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : 'End Session'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
