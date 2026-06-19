# TeamFlow AI Integration Test Report

**Generated:** 2026-06-15T16:32:55Z (UTC)  
**Project:** `c:\Users\pc\Desktop\SAAS\gestion`  
**Runner:** automated suite (`bun run build`, API smoke via `scripts/test-ai-integration.mjs`)

## Summary

| Category | Result |
|----------|--------|
| Environment & build | **PASS** |
| Database / pgvector | **PASS** |
| Phase 1 - Chat, suggestions, legacy proxy | **PASS** |
| Phase 2 - Tool calling (chat) | **PASS** |
| Phase 3 - RAG index / search | **PASS** |
| Phase 3 - RAG-aware chat | **PASS** |

---

## Fixes applied (2026-06-15)

1. **Migration** — Executed `prisma/migrations/20250615000000_add_pgvector_document_chunks/migration.sql` via `prisma db execute`; marked applied with `prisma migrate resolve` (DB was non-empty; `migrate dev` had drift).
2. **NVIDIA embeddings** — Removed forbidden `dimensions` and nested `extra_body` from `src/lib/ai/embeddings/nvidia-client.ts`; pass `input_type` / `truncate` at top level; slice 4096-dim API vectors to configured `AI_EMBED_DIMENSIONS` (default 1024) for `vector(1024)` storage.
3. **Indexer** — Quoted JSON metadata in `insertChunk` (`'{}'::jsonb`) to fix SQL syntax error on insert.

---

## 2. Database / pgvector

- `"DocumentChunk"` table: **EXISTS**
- pgvector extension: enabled by migration

---

## 3. API smoke tests

**Base URL:** `http://127.0.0.1:3000`

| Test | HTTP | Result | Notes |
|------|------|--------|-------|
| `POST /api/ai/chat?stream=false` | 200 | **PASS** | |
| `POST /api/ai/suggestions` | 200 | **PASS** | |
| `POST /api/ai-chat` (legacy proxy) | 200 | **PASS** | |
| `POST /api/ai/chat` - list projects | 200 | **PASS** | |
| `POST /api/ai/index` | 200 | **PASS** | indexed workspace (skipped unchanged entities) |
| `GET /api/ai/search?q=project&limit=3` | 200 | **PASS** | returned 3 hits |
| RAG-style chat question | 200 | **PASS** | |

### Build

- `bun run build`: **PASS** (after fixes)

---

## 4. Re-run tests

```bash
bun run dev
bun scripts/test-ai-integration.mjs
```
