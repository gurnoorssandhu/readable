# Readable

AI-powered PDF co-reading assistant. Local browser-based MVP.

## Commands
- `npm run dev` — Start dev server at localhost:3000
- `npm run build` — Production build
- `npm test` — Run test suite (Jest)
- `npm run lint` — ESLint

## Required Environment
- `ANTHROPIC_API_KEY` (required) — Claude API key
- `BRAVE_SEARCH_API_KEY` (optional) — Brave Search for web queries

## Architecture
- **Frontend**: Next.js 15 + React 19 + Tailwind v4 (glassmorphic dark mode)
- **State**: Zustand stores (pdfStore, sessionStore, uiStore)
- **Backend**: Next.js API routes, Claude API streaming with tool use
- **Persistence**: JSON files (data/sessions/), Obsidian vault (readable-vault/)
- **PDF**: pdfjs-dist for client rendering + server text extraction

## Key Paths
- `src/lib/context/contextBuilder.ts` — Assembles Claude context (budget-managed)
- `src/app/api/chat/route.ts` — Streaming chat with tool execution loop
- `src/lib/vault/condenser.ts` — Session → Obsidian vault condensation
- `src/store/sessionStore.ts` — Core session state (viewed pages, messages, snapshots)

## Context Budget Strategy
Text for all viewed pages, images only for visible pages + snapshots.
150K token budget split: system 5K, vault 10K, page text 40K, page images 15K, conversation 60K, files 15K, snapshot 3K, headroom 2K.

## Conventions
- All components use 'use client' directive
- Glassmorphic styling via CSS classes: glass, glass-strong, glass-subtle
- File-based persistence (no database) — single-user local MVP
- Obsidian vault uses YAML frontmatter + [[wiki-links]]
