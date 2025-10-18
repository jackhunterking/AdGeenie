# AdGeenie - AI-Powered Meta Ads Platform

Launch Facebook & Instagram ads that drive calls and leads. Built for business owners who want results without the marketing complexity.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Features

- ✅ **Auto-Save**: All campaign data saves automatically after 1 second
- ✅ **Persistence**: Data survives page refreshes and browser sessions
- ✅ **AI Image Generation**: Gemini-powered image creation with permanent storage
- ✅ **Type-Safe**: Full TypeScript support with Supabase types
- ✅ **6-Step Campaign Builder**: Goal → Location → Audience → Ad Copy → Preview → Budget

## Environment Setup

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get keys from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Backend**: Supabase (PostgreSQL + Storage)
- **AI**: Google Gemini 2.5 Flash
- **Styling**: Tailwind CSS
- **State**: React Context with auto-save

## Documentation

- **SUPABASE.md** - Complete setup and technical reference
- **supabase-master-plan.plan.md** - Implementation plan

## Project Structure

```
app/
├── api/campaigns/          # Campaign CRUD API
├── actions/                # Server actions
components/                 # React components
lib/
├── context/                # State management (auto-save enabled)
├── hooks/                  # Custom hooks (useCampaign, useDebounce)
└── supabase/               # Supabase clients + types
server/images.ts            # AI image generation
```

## Testing

1. Start app: `npm run dev`
2. Select a goal (Leads/Calls)
3. Wait 2 seconds
4. Refresh page
5. ✅ Goal still selected!

See **SUPABASE.md** for complete testing guide.

## Supabase Schema

- **campaigns**: Main campaign tracking
- **campaign_states**: JSONB storage for all 6 steps
- **generated_assets**: Permanent image URLs and metadata

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm build

# Type check
npx tsc --noEmit
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Failed to save" | Check `.env.local` has service role key, restart server |
| "Image upload failed" | Verify `campaign-assets` bucket exists and is PUBLIC |
| Data not persisting | Wait 2 seconds after changes, check console logs |

## Database Access

View data: https://supabase.com/dashboard/project/YOUR_PROJECT/editor

```sql
SELECT * FROM campaigns ORDER BY updated_at DESC LIMIT 5;
SELECT * FROM campaign_states ORDER BY updated_at DESC LIMIT 5;
```

## License

Private project

## Support

See **SUPABASE.md** for detailed documentation.
