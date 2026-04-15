'use client';

import React from 'react';
import { Globe, FileText, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import type { ToolCall } from '@/types/session';

interface ToolCallIndicatorProps {
  toolCalls: ToolCall[];
}

const toolIcons: Record<string, React.ReactNode> = {
  brave_search: <Globe size={12} />,
  read_file: <FileText size={12} />,
};

const toolLabels: Record<string, string> = {
  brave_search: 'Searching the web',
  read_file: 'Reading file',
};

export function ToolCallIndicator({ toolCalls }: ToolCallIndicatorProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {toolCalls.map((tc) => (
        <div
          key={tc.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-subtle text-xs text-[var(--text-secondary)]"
        >
          {toolIcons[tc.name] ?? <FileText size={12} />}
          <span>{toolLabels[tc.name] ?? tc.name}</span>
          {tc.status === 'running' ? (
            <Spinner size="sm" className="w-3 h-3" />
          ) : (
            <Check size={12} className="text-[var(--success)]" />
          )}
        </div>
      ))}
    </div>
  );
}
