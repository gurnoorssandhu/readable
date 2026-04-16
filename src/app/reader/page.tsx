'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePdfStore } from '@/store/pdfStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ReaderToolbar } from '@/components/layout/ReaderToolbar';
import TOCSidebar from '@/components/pdf/TOCSidebar';
import { SessionEndDialog } from '@/components/session/SessionEndDialog';
import { Spinner } from '@/components/ui/Spinner';
import { usePdfDocument } from '@/hooks/usePdfDocument';
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

  // Load PDF metadata from API
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

  // Load PDF document for TOC sidebar
  const pdfUrl = pdfId ? `/data/pdfs/${pdfId}.pdf` : null;
  const { pdfDocument } = usePdfDocument(pdfUrl);

  if (!pdfId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-dark">
        <p className="text-[var(--text-muted)]">No PDF selected</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-dark">
      {/* TOC Sidebar — slide-over from left */}
      <TOCSidebar pdfDocument={pdfDocument} />

      {/* PDF Viewer — full viewport */}
      <PdfViewer pdfId={pdfId} />

      {/* Chat Panel — slide-over from right */}
      <ChatPanel />

      {/* Floating Toolbar — centered at bottom */}
      <ReaderToolbar pdfId={pdfId} onEndRequest={() => setShowEndDialog(true)} onBack={() => router.push('/')} />

      {/* Session end dialog */}
      <SessionEndDialog
        open={showEndDialog}
        onClose={() => setShowEndDialog(false)}
      />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-dark">
          <Spinner size="lg" />
        </div>
      }
    >
      <ReaderContent />
    </Suspense>
  );
}
