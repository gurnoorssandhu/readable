'use client';

import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gradient-radial">
      {children}
    </div>
  );
}
