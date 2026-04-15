'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePdfStore } from '@/store/pdfStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { SessionEndDialog } from '@/components/session/SessionEndDialog';
import { Spinner } from '@/components/ui/Spinner';
import type { PdfMeta } from '@/types/pdf';

function ReaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pdfId = searchParams.get('pdf');
  const setPdf = usePdfStore((s) => s.setPdf);
  const isCoReading = useSessionStore((s) => s.isCoReading);
  const setChatPanelOpen = useUiStore((s) => s.setChatPanelOpen);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load PDF metadata
  useEffect(() => {
    if (!pdfId) return;
    fetch('/api/pdf/upload')
      .then((r) => r.json())
      .then((data) => {
        const pdf = (data.pdfs as PdfMeta[])?.find((p) => p.id === pdfId);
        if (pdf) {
          setPdf(pdfId, pdf);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [pdfId, setPdf]);

  // Auto-open chat panel when co-reading starts
  useEffect(() => {
    if (isCoReading) {
      setChatPanelOpen(true);
    }
  }, [isCoReading, setChatPanelOpen]);

  if (!pdfId) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">No PDF selected</p>
        </div>
      </AppShell>
    );
  }

  if (!loaded) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar pdfId={pdfId} onBack={() => router.push('/')} onEndRequest={() => setShowEndDialog(true)} />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          onSelectPdf={(id) => router.push(`/reader?pdf=${id}`)}
          currentPdfId={pdfId}
        />

        {/* PDF Viewer - main content */}
        <div className="flex-1 overflow-hidden">
          <PdfViewer pdfId={pdfId} />
        </div>

        {/* Chat panel overlay */}
        <ChatPanel />
      </div>

      {/* Session end dialog */}
      <SessionEndDialog
        open={showEndDialog}
        onClose={() => setShowEndDialog(false)}
      />
    </AppShell>
  );
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        </AppShell>
      }
    >
      <ReaderContent />
    </Suspense>
  );
}
