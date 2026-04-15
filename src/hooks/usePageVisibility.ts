'use client';

import { useEffect, useState, useCallback, type RefObject } from 'react';
import { useSessionStore } from '@/store/sessionStore';

interface UsePageVisibilityResult {
  visiblePages: number[];
  viewedPages: number[];
}

export function usePageVisibility(
  containerRef: RefObject<HTMLDivElement | null>,
  pageCount: number,
): UsePageVisibilityResult {
  const [visiblePages, setVisiblePages] = useState<number[]>([]);
  const [viewedPages, setViewedPages] = useState<number[]>([]);

  const setVisiblePagesStore = useSessionStore((s) => s.setVisiblePages);
  const addViewedPage = useSessionStore((s) => s.addViewedPage);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const container = containerRef.current;
      if (!container) return;

      const pageElements = container.querySelectorAll<HTMLElement>('[data-page-number]');
      const currentlyVisible: number[] = [];

      pageElements.forEach((el) => {
        const pageNum = parseInt(el.dataset.pageNumber || '0', 10);
        if (pageNum <= 0) return;

        // Check if this element is in the intersecting entries
        const entry = entries.find((e) => e.target === el);
        if (entry && entry.isIntersecting) {
          currentlyVisible.push(pageNum);
        }
      });

      // Also include pages that were already visible but not in this batch of entries
      pageElements.forEach((el) => {
        const pageNum = parseInt(el.dataset.pageNumber || '0', 10);
        if (pageNum <= 0) return;
        const entry = entries.find((e) => e.target === el);
        if (!entry) {
          // This element wasn't in the current batch; check its bounding rect
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (
            rect.bottom > containerRect.top &&
            rect.top < containerRect.bottom
          ) {
            currentlyVisible.push(pageNum);
          }
        }
      });

      const uniqueVisible = [...new Set(currentlyVisible)].sort((a, b) => a - b);

      setVisiblePages(uniqueVisible);
      setVisiblePagesStore(uniqueVisible);

      uniqueVisible.forEach((page) => {
        addViewedPage(page);
      });

      setViewedPages((prev) => {
        const combined = new Set([...prev, ...uniqueVisible]);
        return [...combined].sort((a, b) => a - b);
      });
    },
    [containerRef, setVisiblePagesStore, addViewedPage],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageCount === 0) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: container,
      rootMargin: '0px',
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    });

    // Small delay to let pages render
    const timeoutId = setTimeout(() => {
      const pageElements = container.querySelectorAll('[data-page-number]');
      pageElements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [containerRef, pageCount, handleIntersection]);

  return { visiblePages, viewedPages };
}
