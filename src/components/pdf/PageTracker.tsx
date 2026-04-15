'use client';

import { useEffect, type RefObject } from 'react';
import { useSessionStore } from '@/store/sessionStore';

interface PageTrackerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  pageCount: number;
}

export function PageTracker({ containerRef, pageCount }: PageTrackerProps) {
  const setVisiblePages = useSessionStore((s) => s.setVisiblePages);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageCount === 0) return;

    const visibleSet = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const pageNum = parseInt(el.dataset.pageNumber || '0', 10);
          if (pageNum <= 0) return;

          if (entry.isIntersecting) {
            visibleSet.add(pageNum);
          } else {
            visibleSet.delete(pageNum);
          }
        });

        const sorted = [...visibleSet].sort((a, b) => a - b);
        setVisiblePages(sorted);
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: [0, 0.1, 0.5],
      },
    );

    // Wait briefly for pages to render before observing
    const timeoutId = setTimeout(() => {
      const pageElements = container.querySelectorAll('.pdf-page[data-page-number]');
      pageElements.forEach((el) => observer.observe(el));
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      visibleSet.clear();
    };
  }, [containerRef, pageCount, setVisiblePages]);

  // This is an invisible tracking component
  return null;
}
