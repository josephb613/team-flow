# TeamFlow PM - Worklog

## Project Status
- **App**: TeamFlow PM - Collaborative Project Management Software
- **Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, Zustand, Prisma+SQLite, Recharts
- **Color palette**: Teal/emerald `oklch(0.55_0.15_160)` — NO blue/indigo

## Session: Bug Fix - Application Not Displaying

### Issues Found and Fixed

1. **TypeError: Cannot read properties of undefined (reading 'todo')** — CRITICAL
   - **Root cause**: The `create-task-dialog.tsx` and `tasks-view.tsx` components referenced `t.tasks.todo`, `t.tasks.inProgress`, etc., but there was NO `tasks` section in the i18n translations file
   - **Fix**: Added a complete `tasks` translation section to both French and English translations in `src/lib/i18n/translations.ts`
   - **Also made safe**: Changed `t.tasks[opt.labelKey]` to `(t.tasks as Record<string, string>)?.[opt.labelKey] || opt.value` in create-task-dialog.tsx

2. **ChunkLoadError: Failed to load chunk** — CRITICAL
   - **Root cause**: The Next.js dev server crashes under load (especially parallel requests from browser through Caddy gateway). When the server dies mid-load, chunks fail to load
   - **Partial fix**: Added error boundary with auto-reload on chunk load errors in `src/app/page.tsx`
   - **Partial fix**: Made CreateTaskDialog conditionally rendered (only when dialog is open) to reduce initial chunk load

3. **Server stability issue** — ONGOING
   - The Next.js dev server dies after handling ~5-6 requests through the Caddy gateway
   - Direct requests to port 3000 are more stable
   - Setting `NODE_OPTIONS="--max-old-space-size=2048"` helps but doesn't fully solve it
   - The Turbopack compiler uses significant memory during on-demand compilation
   - **Mitigation**: Auto-restart mechanism using a Node.js parent process

4. **next.config.ts improvements**
   - Removed `output: "standalone"` (not needed for dev mode, was causing issues)
   - Added `allowedDevOrigins` for Caddy gateway
   - Added `experimental.optimizePackageImports` for lucide-react, framer-motion, recharts

### Files Modified
- `src/lib/i18n/translations.ts` — Added `tasks` translation section (FR + EN)
- `src/components/create-task-dialog.tsx` — Safe access for t.tasks, conditional rendering
- `src/components/views/tasks-view.tsx` — Added safe tasks accessor
- `src/components/main-app.tsx` — Conditional rendering of CreateTaskDialog
- `src/app/page.tsx` — Added error boundary with chunk load error recovery
- `next.config.ts` — Removed standalone output, added optimizePackageImports

### Current State
- Login page works correctly
- Main app dashboard renders after login
- Server is unstable under browser load (dies after ~5 requests through Caddy)
- Auto-restart mechanism in place but server still crashes frequently
- The app DOES work when the server is alive — the ChunkLoadError was a symptom of the server crashing

### Unresolved Issues / Risks
1. **Server crashes under browser load** — The Next.js dev server dies when the browser makes parallel requests through the Caddy gateway. This is the most critical issue. Possible solutions:
   - Reduce the number of view components loaded at once (lazy loading)
   - Switch from Turbopack to Webpack (not supported in Next.js 16 dev mode)
   - Optimize component imports
   - Add connection throttling
2. **Caddy gateway configuration** — The root-owned Caddy config at `/app/Caddyfile` cannot be modified. The proxy behavior may be contributing to server crashes.
3. **Memory pressure** — Even with 2GB heap limit, the server eventually runs out of memory

### Priority Recommendations for Next Phase
1. Fix server stability — investigate lazy loading of view components to reduce initial memory footprint
2. Continue PM software transformation (from previous session's request)
3. Add more features and functionality
4. Improve styling details
