# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdPilot is a Next.js 15 application for creating Meta (Facebook/Instagram) ads with AI-generated content. The app uses Vercel AI SDK v5, Supabase for backend services, and integrates with Meta's Marketing API to create and manage ad campaigns.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
```

### Important Build Configuration
- **ESLint is disabled during builds** (`next.config.ts` has `eslint: { ignoreDuringBuilds: true }`)
- Run `npm run lint` locally to catch issues before deployment
- TypeScript strict mode is enabled - avoid `any` types

## High-Level Architecture

### Tech Stack Requirements (Non-Negotiable)
From `.cursor/rules/cursor-project-rule.mdc`, this project MUST use:
- **Vercel AI SDK V5 (Core)** - https://ai-sdk.dev/docs/introduction
- **AI Elements** - https://ai-sdk.dev/elements/overview
- **Vercel AI Gateway** - https://vercel.com/docs/ai-gateway
- **Supabase** - https://supabase.com/docs (Auth, Database, Storage)

When implementing features, always consult official docs first and cite sources in code comments.

### Application Flow

1. **Homepage** (`app/page.tsx`) - Entry point with hero section
2. **Authentication** - Supabase Auth with email verification flow
   - Auth modals trigger signup/signin
   - Post-login redirect to `/auth/post-login` processes campaign creation
   - Post-verify redirect to `/auth/post-verify` handles email verification
3. **Campaign Creation** - User creates campaign, system generates conversation
4. **Campaign Editor** (`app/[campaignId]/page.tsx`) - Multi-step campaign builder
5. **Meta Integration** - Connect Meta account, select ad account, publish ads

### Data Model Architecture

**Core Entities:**
- `campaigns` - Campaign metadata (name, status, current_step)
- `campaign_states` - 1-to-1 relationship storing all campaign data:
  - `goal_data` - Campaign objective (calls/leads/website-visits)
  - `location_data` - Targeting locations
  - `audience_data` - Audience targeting
  - `budget_data` - Budget and schedule
  - `ad_copy_data` - Ad copy and creative content
  - `ad_preview_data` - Generated ad variations
  - `meta_connect_data` - Meta account connection
- `conversations` - AI chat conversations (1-to-1 with campaigns)
- `messages` - Chat messages with sequence ordering
- `creative_plans` - AI-generated creative strategies

**Key Pattern:** Campaign state is centralized in `campaign_states` table. Use `CampaignContext` (`lib/context/campaign-context.tsx`) to read/write state with automatic retries.

### AI System Architecture

**Conversation Management:**
- Each campaign has ONE conversation (`conversationManager.getOrCreateForCampaign()`)
- Messages stored in `messages` table with `seq` for ordering
- Use `messageStore.loadMessages()` for optimized retrieval
- System messages can be injected for context changes

**AI Gateway Integration:**
- AI SDK v5 automatically uses AI Gateway when `AI_GATEWAY_API_KEY` is set
- Just pass model strings like `'openai/gpt-4o'` - no manual gateway config needed
- See `lib/ai/gateway-provider.ts` for model resolution

**AI Chat Route** (`app/api/chat/route.ts`):
- Central streaming endpoint for all AI interactions
- Handles tool calling, message persistence, auto-summarization
- Goal-aware system prompts based on campaign objective
- Edit mode for modifying specific ad variations
- CreativePlan integration for consistent creative execution

**Tools** (`tools/` directory):
- `generate-image-tool` - Generate 6 ad variations (client-side confirmation)
- `edit-image-tool` - Modify existing image variation
- `regenerate-image-tool` - Create new version of single variation
- `location-targeting-tool` - Set geographic targeting
- `audience-targeting-tool` - Define audience parameters
- `setup-goal-tool` - Configure campaign objective
- `edit-ad-copy-tool` - Update ad copy text

**Tool Execution Pattern:**
- Client-side tools show confirmation dialogs before execution
- Server-side tools execute immediately and return results
- Edit mode locks variation index to prevent wrong image updates

### Meta Integration

**Authentication Flow:**
- User initiates OAuth via MetaConnectCard component
- Popup window opens to `/meta/payment-bridge` for Facebook Login
- After auth, selects Business Manager and Ad Account
- Selection stored in `campaign_states.meta_connect_data`

**Facebook SDK:**
- Loaded in `app/layout.tsx` via Script tags
- SDK initialized with `FB.init()` in `fbAsyncInit`
- Payment dialogs opened via `FB.ui()` (must be synchronous on user click)

**API Routes:**
- `/api/meta/auth/callback` - OAuth callback handler
- `/api/meta/businesses` - Fetch Business Managers
- `/api/meta/business/adaccounts` - Fetch Ad Accounts
- `/api/meta/ads/*` - Create campaigns, ad sets, ads, creatives
- `/api/meta/instant-forms/*` - Lead form management

**Important Notes:**
- Popup lifecycle is app-controlled (don't force-close via timeouts)
- Use `postMessage` for cross-origin communication between popup and opener
- Always check FB SDK ready state before calling `FB.ui()`

### Frontend Architecture

**Context Providers (Wrap entire app):**
- `ThemeProvider` - Dark/light mode
- `AuthProvider` - Supabase auth state
- `CampaignProvider` - Campaign data and state management

**Key Components:**
- `campaign-stepper.tsx` - Multi-step wizard navigation
- `ai-chat.tsx` - Chat interface using AI Elements
- `ad-preview-context.tsx` - Manages selected ad variations for editing
- `MetaConnectCard.tsx` - Meta account connection UI

**AI Elements Pattern:**
- Use components from `components/ai-elements/` for chat UI
- These wrap AI SDK v5 primitives with custom styling
- Follow AI Elements docs when modifying chat interface

### State Management Patterns

**Campaign State Updates:**
```typescript
// Always use CampaignContext for state updates
const { saveCampaignState } = useCampaignContext()

// Save with automatic retries
await saveCampaignState('goal_data', { goalType: 'leads' })
```

**Auto-save Pattern:**
- Use `use-auto-save.ts` hook for debounced state persistence
- Automatically saves after user stops typing (500ms default)
- Shows save indicator during save operations

### Type Safety

**Strict TypeScript Configuration:**
- `strict: true` in tsconfig.json
- Avoid `any` - use `unknown` and type narrowing
- React event types: `React.ChangeEvent<HTMLInputElement>` etc.
- API types: `NextRequest`/`NextResponse`
- Fetch responses: Type as `unknown`, then narrow before use

**Database Types:**
- Auto-generated types in `lib/supabase/database.types.ts`
- Import `Database` type for Supabase queries
- Use type assertions carefully with campaign_states JSON fields

## Common Patterns

### Adding a New Tool

1. Create tool file in `tools/` directory
2. Define schema with Zod
3. Implement execute function (if server-side) or return client-side invocation
4. Register in `app/api/chat/route.ts` tools object
5. Update system prompt to explain when/how to use the tool

### Working with Campaign State

```typescript
// Read campaign state
const { campaign } = useCampaignContext()
const goalData = campaign?.campaign_states?.goal_data

// Write campaign state (with retries)
await saveCampaignState('goal_data', {
  goalType: 'leads',
  conversionMethod: 'instant-forms'
}, { retries: 3 })
```

### Meta API Calls

- Use `lib/meta/graph.ts` for Graph API calls
- Store access token in `meta_connect_data.accessToken`
- Ad Account ID format: `act_123456789`
- Always handle rate limiting and errors gracefully

## Environment Variables

Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Gateway (optional but recommended)
AI_GATEWAY_API_KEY=

# Facebook/Meta
NEXT_PUBLIC_FB_APP_ID=
NEXT_PUBLIC_FB_GRAPH_VERSION=v24.0

# Model providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

## Important Conventions

### File Headers
Include reference comments in new files:
```typescript
/**
 * Feature: <short title>
 * Purpose: <what this file does>
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#<section>
 *  - Supabase: https://supabase.com/docs/<product>/<section>
 */
```

### Git Commits
- Commit messages should focus on "why" not "what"
- Include references to Meta API docs when working with integrations
- Always include coauthor footer for AI-assisted commits

### Code Style
- Use TypeScript's strict mode - no implicit any
- Prefer functional components with hooks
- Use async/await over promises chains
- Handle errors explicitly - don't swallow exceptions

## Meta-Specific Gotchas

1. **Payment Dialog:** Must call `FB.ui()` synchronously on user click (preserves gesture)
2. **Popup Handling:** Never auto-close popups - let app control lifecycle
3. **Ad Account Format:** Always prefix with `act_` (e.g., `act_123456789`)
4. **Image Uploads:** Use hash for image reuse (`{hash: 'abc123'}`)
5. **Lead Forms:** Use `page_id` for instant forms, not ad account ID

## Debugging

- AI Gateway logs show in console with `[AI Gateway]` prefix
- Campaign state logs show with `[CampaignContext]` prefix
- Message persistence logs show with `[SAVE]`, `[FINISH]` prefixes
- Meta API errors often in tool result objects

## Testing Locally

1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Sign up with email (check console for verification link in dev)
4. Create campaign to test full flow
5. Meta integration requires valid FB App ID and test ad account
