# Meta Marketing Pro - AI Ad Creative Generator

## 🎯 Overview

Meta-native ad creative generator powered by AI. Creates scroll-stopping, platform-optimized ad creatives for Facebook and Instagram with professional visual quality and automatic format optimization.

### Core Features
- **Action-Oriented AI**: Friendly creative partner that generates quickly with smart defaults
- **Universal Format**: ONE square creative that works perfectly across Feed, Stories, and Reels
- **Visual Guardrails**: Super-realistic, natural imagery with mobile-optimized framing
- **Automatic Safe Zones**: 10-12% margins on all sides for platform UI elements
- **Text-Free by Default**: Clean, unbranded images ready for immediate use
- **Conversational Guidance**: Brief, natural explanations without interrogation

---

## 🚀 Quick Start

### 1) Prerequisites
- Node.js 18.17+ (Node 20+ recommended)
- npm, yarn, pnpm, or bun
- AI Gateway or Google Gemini API key

### 2) Install Dependencies
```bash
pnpm install
# or: npm install / yarn / bun install
```

### 3) Configure Environment
Create `.env.local`:
```bash
# Option A: AI Gateway (recommended)
AI_GATEWAY_URL=https://your-gateway-url.com
AI_GATEWAY_API_KEY=your_api_key_here

# Option B: Direct Google API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
```

### 4) Start Development Server
```bash
pnpm dev
# or: npm run dev / yarn dev / bun dev
```

Open `http://localhost:3000`

### 5) Quick Test (2 minutes)
```
User: "Create an ad for a coffee shop"
Expected: Brief enthusiastic response → Generates immediately → Invites refinement
```

---

## 🎨 How It Works

### User Experience Flow

#### 1. Clear Request → Immediate Generation
```
User: "Create a coffee shop ad"

AI: "Perfect! Creating a warm, inviting coffee shop creative for you right now. 
I'll go with a cozy morning vibe that stops the scroll 🎨"

[Generates image immediately]

AI: "Here's your Meta creative! Works beautifully across Feed, Stories, and Reels. 
Want to adjust anything?"
```

#### 2. Vague Request → ONE Question
```
User: "Make me an ad"

AI: "I'd love to! What are you promoting?"

User: "A restaurant"

AI: "Perfect! Creating a mouth-watering restaurant creative for you..."
[Generates immediately]
```

### What Makes It Special

**Conversational & Action-Oriented**
- Bias toward action: generates quickly with smart defaults
- Only asks ONE question if request is genuinely unclear
- Enthusiastic and confident in creative choices
- Natural, brief explanations (not lectures)

**Fully Automated Format**
- Always generates ONE square (1080×1080) creative
- Designed with universal format flexibility
- Works perfectly in both square AND vertical placements
- No format questions asked—fully automated

**Visual Intelligence**
- Super-realistic, natural photography (not stock/CGI)
- Mobile-optimized composition
- Centrally-weighted with 10-12% safe zones on ALL sides
- Clean, uncluttered Meta-native aesthetic

---

## ✅ What's Implemented

### 1. Meta Marketing Pro Identity
**File**: `app/api/chat/route.ts`

The AI operates as a friendly, action-oriented creative partner:
- Acts like an excited creative expert, not a cautious consultant
- Generates first with smart defaults, refines based on results
- Only asks ONE question if request is vague
- Shares insights naturally during the process
- Enthusiastic and brief

### 2. Visual Guardrails Layer
**File**: `server/images.ts`

Automatic prompt enhancement ensures:
- **Style**: Super-realistic, natural photography
- **Quality**: Professional lighting, authentic moments
- **Composition**: Mobile-optimized, rule of thirds
- **Safe Zones**: 10-12% margins on all edges
- **Format**: Square (1080×1080) universal creative
- **Content**: Text-free and unbranded by default

### 3. Universal Format Strategy

Every creative is automatically designed with:
- Square (1080×1080) base format
- Centrally-weighted composition
- 10-12% margins/padding on ALL sides
- Key elements within central 80% safe zone

**Why This Works**:
- **Feed**: Shows full square creative with all safe zones intact
- **Stories/Reels**: Vertical crop uses center portion, all important elements still visible
- **No modifications needed**: Same creative works everywhere

---

## 🧪 Testing

### Quick Test Commands
```
1. "Hi, what can you help me with?" → Should introduce as Meta Marketing Pro
2. "Create a coffee shop ad" → Should generate immediately, no questions
3. "Make me an ad" → Should ask ONE question: "What are you promoting?"
4. "Create a luxury villa ad" → Should generate immediately with enthusiasm
```

### Visual Quality Checks
When images are generated, verify:
- ✅ Subject is clearly visible with proper framing
- ✅ Looks realistic, not stock photo aesthetic
- ✅ Clear margins around edges (10-12%)
- ✅ Correct aspect ratio (1:1 square)
- ✅ Text-free (unless explicitly requested)

For comprehensive testing scenarios, see [TESTING.md](./TESTING.md)

---

## 🎯 Core Principles

### 1. Bias Toward Action
- Generate first, refine later
- Don't ask questions you can answer with smart defaults
- Trust your expertise as Meta Marketing Pro

### 2. Maximum ONE Question
- Only if genuinely unclear
- Make it conversational, not formal
- Get straight to generation after answer

### 3. Be Enthusiastic
- Show excitement: "Great!", "Perfect!", "Love it!"
- Make it feel collaborative, not transactional

### 4. Fully Automated
- ONE universal creative automatically
- Never ask about formats or offer variations
- Design with universal compatibility built-in

### 5. Invite Refinement
- After generation: "Want to adjust anything?"
- User-driven refinement vs AI-driven interrogation

---

## 🔧 Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **AI SDK 5** (`ai`, `@ai-sdk/react`)
- **Google Gemini 2.5 Flash Image Preview**
- **Radix UI** + custom UI components

---

## 🗂️ Project Structure

```
/app/api/chat/route.ts          # System prompt & API route
/server/images.ts                # Visual guardrails layer
/tools/generate-image-tool.ts    # Image generation tool
/tools/edit-image-tool.ts        # Image editing tool
/components/ai-chat.tsx          # Chat interface
/components/ai-elements/         # UI components
```

---

## 📊 Key Features Summary

| Aspect | Behavior |
|--------|----------|
| **Questions** | Max ONE if vague, otherwise generate immediately |
| **Format** | Always square (1080×1080) universal creative |
| **Text/Logos** | None by default (unless explicitly requested) |
| **Composition** | Centrally-weighted, 10-12% safe zones |
| **Style** | Super-realistic, natural, mobile-optimized |
| **Tone** | Enthusiastic, action-oriented, brief |

---

## 🔮 Next Steps

### Immediate (Optional)
1. Test thoroughly using [TESTING.md](./TESTING.md)
2. Adjust guardrails if needed (safe zone %, style preferences)
3. Customize messaging to match your brand voice

### Backend Integration (Recommended)
Set up Supabase for:
- Image metadata storage
- User preferences and brand defaults
- Dynamic guardrail configurations
- Performance tracking and analytics

See [SUPABASE.md](./SUPABASE.md) for detailed implementation guide.

### Future Enhancements
1. **Style Presets**: Lifestyle, Product Hero, Testimonial, BTS
2. **Industry-Specific Rules**: E-commerce, Real Estate, F&B, Fashion
3. **Performance Insights**: Track which creative patterns perform best
4. **Admin Dashboard**: Manage guardrails without redeploying
5. **A/B Testing**: Compare performance across creative approaches

---

## 🎓 For No-Code Developers

### What You Can Customize (Easy)
- **System Prompt** (`app/api/chat/route.ts`): Adjust personality, tone
- **Safe Zone Margins** (`server/images.ts`): Change from 10-12% to different values
- **Default Behavior** (`server/images.ts`): Modify visual requirements

### What Requires Backend (Use Supabase)
- Storing generated images and metadata
- User brand preferences and defaults
- Dynamic guardrail configurations
- Performance tracking and analytics

**Important**: For backend/storage work, use Supabase AI to build, test, and verify requirements. Cursor will help with the prompts. See [SUPABASE.md](./SUPABASE.md).

---

## 📚 Documentation

- **[CHANGELOG.md](./CHANGELOG.md)** - All behavioral changes and updates
- **[TESTING.md](./TESTING.md)** - Comprehensive testing scenarios
- **[SUPABASE.md](./SUPABASE.md)** - Backend integration guide

---

## 🚨 Troubleshooting

### Issue: AI doesn't act as Meta Marketing Pro
**Fix**: Clear browser cache, restart dev server, check `route.ts` system prompt

### Issue: Images don't follow visual guidelines
**Fix**: Verify `enhancePromptWithMetaGuardrails()` is called in `server/images.ts`

### Issue: Too many questions being asked
**Fix**: Check system prompt has "Bias toward action" and "Maximum ONE question" instructions

### Issue: Images have text by default
**Fix**: Verify guardrails specify "text-free by default" in `server/images.ts`

---

## ✅ Success Checklist

Your implementation is working if:

1. ✅ Consistent Meta Marketing Pro identity
2. ✅ Visual quality matches Meta aesthetic (realistic, not stock)
3. ✅ Safe zones respected (10-12% margins)
4. ✅ Brief, enthusiastic responses
5. ✅ Images text-free by default
6. ✅ ONE universal square creative per generation
7. ✅ Maximum ONE question if request is vague
8. ✅ No linter errors
9. ✅ Smooth user experience

---

## 📞 Scripts

```bash
pnpm dev     # start dev server (Turbopack)
pnpm build   # production build
pnpm start   # start production server
pnpm lint    # run ESLint
```

---

## 📈 Philosophy

### "Show, Don't Tell"
Generate first with smart defaults, let users refine based on what they see.

### "Speed Over Perfection"
A good creative generated fast beats a perfect creative after 5 questions.

### "Enthusiastic Partner"
Act like an excited creative partner, not a cautious consultant.

### "Automation Over Questions"
The tool should make intelligent decisions automatically, not burden users with technical choices.

---

## 🎉 What's Next?

You now have a production-ready Meta Marketing Pro implementation that:
- ✅ Generates quickly with minimal friction
- ✅ Creates professional, platform-optimized creatives
- ✅ Provides natural, enthusiastic guidance
- ✅ Works across all Meta placements automatically

**Status**: ✅ Production Ready  
**Version**: 1.0  
**Last Updated**: October 16, 2025

### 🔄 Development Status
This is the initial setup of the AI Elements application. All core features are implemented and ready for testing.

**Next Steps:**
1. Configure Supabase backend (see [SUPABASE.md](./SUPABASE.md))
2. Set up environment variables (`.env.local`)
3. Run comprehensive tests (see [TESTING.md](./TESTING.md))
4. Deploy to production

---

**Ready to generate world-class Meta ads! 🎨🚀**
