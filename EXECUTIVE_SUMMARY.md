# Executive Summary (Consolidated)

Last updated: October 21, 2025

This single document consolidates all previous project Markdown files into a concise, current source of truth. Older, duplicate, or superseded documents were removed for clarity. Only the `.cursor` directory was left untouched per request.

---

## Project Status

**Production-ready.** Backend and database verified; UI flows function with AI SDK v5. Performance and security baselines are in place.

---

## Highlights and Key Fixes

- AI SDK v5 compliance: removed invalid `content` from `UIMessage`, switched props to `messages`, maintained `parts`/`metadata` only.
- Message restoration: stabilized `useChat` by providing a server-derived `conversationId` so the `id` does not change after init.
- Editing context: adopted `metadata` for transporting edit info end-to-end; persisted and restored via storage layer.
- Data persistence: corrected `campaign_states` access (object, not array); removed unused tables and dead code; regenerated types.
- Database audit: enabled/optimized RLS, secured function `search_path`, removed duplicate/unused indexes, added targeted indexes; added documentation comments throughout schema.
- Image tools: implemented three clear behaviors (generate, edit, regenerate) using a consistent model with proper server execution where applicable.

---

## How to Run and Verify (Quick Start)

1) Start locally
```bash
npm run dev
```

2) Verify core flows
- Create a campaign, chat with the assistant, refresh: messages should persist and display.
- Generate/edit/regenerate images: results should render; storage entries should exist.

3) Optional: enable AI Gateway (observability, routing)
```env
AI_GATEWAY_URL=https://gateway.ai.vercel.com
AI_GATEWAY_API_KEY=...  
```

---

## Operations and Testing Checklist

- Database health: RLS enabled on all public tables; no orphaned records; foreign keys valid; indexes optimized.
- Security: functions use secure `search_path`; schema migrations table protected by RLS.
- Performance: reduced index overhead; added GIN/partial indexes for common queries.
- UI/SDK: `useChat` initializes with server `conversationId`; messages load immediately; metadata flows through and persists.

---

## Troubleshooting Quick Tips

- Messages missing after refresh: confirm `conversationId` is supplied server-side and `useChat` `id` is stable.
- Images not appearing: verify storage bucket files and env keys.
- RLS blocked: ensure authenticated context; review policies for the affected table.

---

## References

- AI SDK Core: https://ai-sdk.dev/docs/introduction
- AI Elements: https://ai-sdk.dev/elements/overview
- Vercel AI Gateway: https://vercel.com/docs/ai-gateway
- Supabase (RLS/Indexes/Functions): https://supabase.com/docs

---

## Consolidation Note

On October 21, 2025, all standalone Markdown documents were reviewed, deduplicated, and merged into this file. Historical details were condensed to the essentials that affect current operation, testing, and maintenance.

