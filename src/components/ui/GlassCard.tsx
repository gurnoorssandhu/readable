'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'subtle';
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', variant = 'default', hover = false, onClick }: GlassCardProps) {
  const variantClass = {
    default: 'glass',
    strong: 'glass-strong',
    subtle: 'glass-subtle',
  }[variant];

  return (
    <div
      className={`${variantClass} ${hover ? 'glass-hover cursor-pointer transition-glass' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
