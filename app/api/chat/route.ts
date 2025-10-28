/**
 * Feature: AI Chat Streaming Route
 * Purpose: Handle chat streaming with AI Gateway and optimized message persistence
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/streaming
 *  - AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Conversation History: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import { 
  convertToModelMessages, 
  streamText, 
  UIMessage, 
  createIdGenerator, 
  safeValidateUIMessages,
  NoSuchToolError,
  InvalidToolInputError,
  ToolCallRepairError,
  stepCountIs,
  Tool,
} from 'ai';
import { sanitizeMessages, isSanitizerEnabled } from '@/lib/ai/schema';
import { generateImageTool } from '@/tools/generate-image-tool';
import { editImageTool } from '@/tools/edit-image-tool';
import { regenerateImageTool } from '@/tools/regenerate-image-tool';
import { locationTargetingTool } from '@/tools/location-targeting-tool';
import { audienceTargetingTool } from '@/tools/audience-targeting-tool';
import { setupGoalTool } from '@/tools/setup-goal-tool';
import { editAdCopyTool } from '@/tools/edit-ad-copy-tool';
import { getModel } from '@/lib/ai/gateway-provider';
import { messageStore } from '@/lib/services/message-store';
import { conversationManager } from '@/lib/services/conversation-manager';
import { autoSummarizeIfNeeded } from '@/lib/ai/summarization';
import { createServerClient } from '@/lib/supabase/server';
import { createCreativePlan } from '@/lib/ai/system/creative-guardrails';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * Get goal-specific context description for system prompt
 * Provides detailed guidance for each campaign goal type
 */
function getGoalContextDescription(goalType: string): string {
  switch(goalType) {
    case 'calls':
      return `This campaign is optimized for generating PHONE CALLS.

**Visual & Creative Guidelines:**
- Include trust signals (professional imagery, credentials, testimonials)
- Emphasize personal connection and accessibility
- Show real people, faces, and direct communication
- Use warm, inviting tones and approachable imagery
- Subtle phone/contact imagery may be included but focus on human connection

**Copy & Messaging:**
- CTAs should encourage immediate calling: "Call Now", "Speak to an Expert", "Get Your Free Consultation"
- Emphasize urgency and availability: "Available 24/7", "Talk to us today"
- Highlight the value of direct conversation
- Include phone numbers prominently when relevant`;
    
    case 'leads':
      return `This campaign is optimized for LEAD GENERATION through form submissions.

**Visual & Creative Guidelines:**
- Include value exchange imagery (forms, checklists, downloads, assessments)
- Show transformation and results from information sharing
- Emphasize trust and data security with professional visuals
- Use imagery suggesting consultation, assessment, or personalized service
- Clean, organized layouts that suggest form completion

**Copy & Messaging:**
- CTAs for form submission: "Sign Up", "Get Your Free Quote", "Request Information", "Download Now"
- Emphasize value exchange: "Free", "Exclusive", "Personalized"
- Reduce friction: "Quick", "Easy", "Just 2 minutes"
- Highlight what they'll receive for their information`;
    
    case 'website-visits':
      return `This campaign is optimized for driving WEBSITE TRAFFIC and browsing.

**Visual & Creative Guidelines:**
- Show browsing and discovery actions (screens, devices, online shopping)
- Include product catalogs, website interfaces, or digital storefronts
- Emphasize exploration and online presence
- Use imagery suggesting clicking, scrolling, browsing
- Show variety and selection available online

**Copy & Messaging:**
- CTAs for website visits: "Shop Now", "Explore More", "View Collection", "Browse Catalog", "Learn More"
- Emphasize discovery: "Discover", "Explore", "Browse"
- Highlight online benefits: "Shop from home", "100+ options online"
- Create curiosity to drive clicks`;
    
    default:
      return 'No specific goal has been set for this campaign yet. Ask the user about their campaign objectives if needed.';
  }
}

export async function POST(req: Request) {
  const { message, id, model } = await req.json();
  
  // DEBUG: Log incoming message structure (AI SDK v5 pattern - metadata field)
  console.log(`[API] ========== INCOMING MESSAGE ==========`);
  console.log(`[API] message.id:`, message?.id);
  console.log(`[API] message.role:`, message?.role);
  console.log(`[API] message.metadata:`, JSON.stringify(message?.metadata || null));
  console.log(`[API] message has editingReference:`, !!(message?.metadata?.editingReference));
  if (message?.metadata?.editingReference) {
    console.log(`[API] editingReference content:`, message.metadata.editingReference);
  }
  
  // Authenticate user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const tools = {
    generateImage: generateImageTool,
    editImage: editImageTool,
    regenerateImage: regenerateImageTool,
    locationTargeting: locationTargetingTool,
    audienceTargeting: audienceTargetingTool,
    setupGoal: setupGoalTool,
    editAdCopy: editAdCopyTool,
  };

  // Get or create conversation
  // The 'id' can be either a campaign ID or conversation ID
  // For backwards compatibility, we first check if it's a campaign ID
  let conversationId = id;
  let conversation = null;
  
  if (id) {
    // Try to get conversation by ID first
    conversation = await conversationManager.getConversation(id);
    
    // If not found, check if it's a campaign ID
    if (!conversation) {
      conversation = await conversationManager.getOrCreateForCampaign(user.id, id);
      conversationId = conversation.id;
      console.log(`[API] Created/found conversation ${conversationId} for campaign ${id}`);
    } else {
      console.log(`[API] Using existing conversation ${conversationId}`);
    }
  }
  
  // Extract goal from conversation metadata (source of truth) or message metadata (fallback)
  const conversationGoal = (conversation?.metadata && typeof conversation.metadata === 'object' && 'current_goal' in conversation.metadata) 
    ? (conversation.metadata.current_goal as string) 
    : null;
  const messageGoal = message?.metadata?.goalType || null;
  const effectiveGoal = conversationGoal || messageGoal || null;
  
  console.log(`[API] Goal context:`, {
    conversationGoal,
    messageGoal,
    effectiveGoal,
  });

  // Load latest CreativePlan for this campaign (if any) to provide plan-driven guardrails
  let planContext = '';
  let offerAskContext = '';
  let planId: string | null = null;
  if (conversation?.campaign_id) {
    const { data: planRow } = await supabase
      .from('creative_plans')
      .select('id, created_at')
      .eq('campaign_id', conversation.campaign_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (planRow?.id) {
      planId = planRow.id as string;
      planContext = `\n[CREATIVE PLAN ACTIVE]\nPlan ID: ${planId}\nFollow plan coverage and constraints. Generate square and vertical with vertical reusing the same base square image via extended canvas (blur/gradient/solid). Keep edges clean and reflow overlays within edge-safe areas; never draw frames or labels. Respect copy limits: primary ≤125, headline ≤40, description ≤30.`;
    } else if (effectiveGoal) {
      // Auto-orchestrate plan when missing
      // Try to read offer from campaign_states.ad_copy_data.offerText
      let offerText: string | null = null;
      try {
        const { data: cs } = await supabase
          .from('campaign_states')
          .select('ad_copy_data')
          .eq('campaign_id', conversation.campaign_id)
          .maybeSingle();
        const adCopyData = (cs?.ad_copy_data as unknown as { offerText?: string } | null) || null;
        offerText = adCopyData?.offerText || null;
      } catch (e) {
        console.warn('[API] Could not read campaign_states.ad_copy_data:', e);
      }

      // Quick extraction from latest user message if needed
      if (!offerText && message?.role === 'user' && typeof (message as { content?: unknown }).content === 'string') {
        const text = (message as unknown as { content: string }).content;
        if (/free|%\s*off|discount|quote|consult|download|trial/i.test(text)) {
          offerText = text;
        }
      }
      if (!offerText) {
        // Stricter ask-one-offer-question branch; plan will be created after user answers
        offerAskContext = `\n[OFFER REQUIRED]\nAsk ONE concise question to capture the user's concrete offer/value (e.g., "Free quote", "% off", "Consultation", "Download").\nRules:\n- Ask ONLY this one question, no extra text.\n- Do NOT call any tools.\n- After the user answers, proceed to create the Creative Plan automatically.`;
      } else {
        // Create plan now that we have an offer
        try {
          const plan = await createCreativePlan({
            goal: (['calls','leads','website-visits'].includes(String(effectiveGoal)) ? String(effectiveGoal) : 'unknown') as 'calls'|'leads'|'website-visits'|'unknown',
            inferredCategory: undefined,
            offerText,
          });

          const { data: inserted, error } = await supabase
            .from('creative_plans')
            .insert({
              campaign_id: conversation.campaign_id,
              plan,
              status: 'generated',
              created_by: user.id,
            })
            .select('id')
            .single();
          if (!error && inserted?.id) {
            planId = inserted.id as string;
            planContext = `\n[CREATIVE PLAN ACTIVE]\nPlan ID: ${planId}\nFollow plan coverage and constraints. Generate square and vertical with vertical reusing the same base square image via extended canvas (blur/gradient/solid). Keep edges clean and reflow overlays within edge-safe areas; never draw frames or labels. Respect copy limits: primary ≤125, headline ≤40, description ≤30.`;
          }

          // Persist offerText to memory
          try {
            const { data: cs2 } = await supabase
              .from('campaign_states')
              .select('ad_copy_data')
              .eq('campaign_id', conversation.campaign_id)
              .maybeSingle();
            const existing = (cs2?.ad_copy_data as unknown) as import('@/lib/supabase/database.types').Json | null;
            const base: Record<string, import('@/lib/supabase/database.types').Json> =
              existing && typeof existing === 'object' && !Array.isArray(existing) ? (existing as Record<string, import('@/lib/supabase/database.types').Json>) : {};
            const merged = { ...base, offerText: offerText as import('@/lib/supabase/database.types').Json } as import('@/lib/supabase/database.types').Json;
            await supabase
              .from('campaign_states')
              .update({ ad_copy_data: merged, updated_at: new Date().toISOString() })
              .eq('campaign_id', conversation.campaign_id);
          } catch (e) {
            console.warn('[API] Failed to upsert offerText in ad_copy_data:', e);
          }
        } catch (e) {
          console.error('[API] Failed to auto-create CreativePlan:', e);
        }
      }
    }
  }

  // Load and validate messages from database (AI SDK docs pattern)
  let validatedMessages: UIMessage[];
  
  // Load previous messages + append new one
  if (message && conversationId) {
    console.log(`[API] Loading messages for conversation ${conversationId}`);
    
    // Use message store service (optimized query with seq-based ordering)
    const previousMessages = await messageStore.loadMessages(conversationId, {
      limit: 80, // Load last 80 messages (configurable window)
    });
    
    const messages = [...previousMessages, message];
    
    console.log(`[API] Total messages: ${messages.length} (${previousMessages.length} loaded + 1 new)`);
    
    // Safe validate loaded messages against tools (AI SDK docs)
    // Returns validation result without throwing, allowing graceful error handling
      let validationResult:
        | { success: true; data: UIMessage[] }
        | { success: false; error: unknown };
    try {
      const toValidate = isSanitizerEnabled() ? sanitizeMessages(messages) : messages;
      validationResult = await safeValidateUIMessages({
        messages: toValidate,
          tools: tools as unknown as Record<string, Tool<unknown, unknown>>,
      });
    } catch (err) {
      console.error('[API] ❌ safeValidateUIMessages threw:', err);
        validationResult = { success: false, error: err };
    }
    
    if (validationResult.success) {
      validatedMessages = validationResult.data;
      console.log(`[API] ✅ Validated ${validatedMessages.length} messages`);
    } else {
      // Validation failed - log errors and use only the new message
      console.error('[API] ❌ Message validation failed:', validationResult.error);
      console.log('[API] Starting with fresh conversation (new message only)');
      validatedMessages = [message];
    }
  } else {
    validatedMessages = [];
  }

  // Check if model supports specific features
  const isGeminiImageModel = model === 'google/gemini-2.5-flash-image-preview';
  // Only o1 models support reasoning parameters
  const isOpenAIReasoningModel = typeof model === 'string' && (model.includes('o1-preview') || model.includes('o1-mini'));

  // Extract reference context from message metadata (AI SDK v5 native pattern)
  let referenceContext = '';
  let isEditMode = false;
  
  if (message?.metadata) {
    const metadata = message.metadata as Record<string, unknown>;
    isEditMode = Boolean(metadata.editMode);
    
    // Handle ad editing reference
    if (metadata.editingReference) {
      const rawRef = metadata.editingReference as Record<string, unknown>;
      // Normalize variation index (accept legacy variationNumber)
      const variationIndex = typeof (rawRef as { variationIndex?: unknown }).variationIndex === 'number'
        ? (rawRef as { variationIndex: number }).variationIndex
        : (typeof (rawRef as { variationNumber?: unknown }).variationNumber === 'number' 
            ? Math.max(0, (rawRef as { variationNumber: number }).variationNumber - 1) 
            : undefined);
      const ref = { ...rawRef, variationIndex } as Record<string, unknown>;
      referenceContext += `\n\n[USER IS EDITING: ${ref.variationTitle}`;
      if (ref.format) referenceContext += ` (${ref.format} format)`;
      referenceContext += `]\n`;
      
      if (ref.imageUrl) {
        referenceContext += `Image URL: ${ref.imageUrl}\n`;
      }
      
      if (ref.variationIndex !== undefined) {
        referenceContext += `Variation Index: ${ref.variationIndex}\n`;
      }
      
      if (ref.content && typeof ref.content === 'object') {
        const content = ref.content as { primaryText?: string; headline?: string; description?: string };
        referenceContext += `Current content:\n`;
        if (content.primaryText) referenceContext += `- Primary Text: "${content.primaryText}"\n`;
        if (content.headline) referenceContext += `- Headline: "${content.headline}"\n`;
        if (content.description) referenceContext += `- Description: "${content.description}"\n`;
      }

      // Decide which toolset to expose based on fields
      const isCopyEdit = Array.isArray((ref as { metadata?: { fields?: string[] } }).metadata?.fields)
        ? ((ref as { metadata?: { fields?: string[] } }).metadata!.fields!).some((f: string) => ['primaryText','headline','description'].includes(f))
        : Boolean(ref.content);

      if (isCopyEdit) {
        referenceContext += `\n**You MUST call this tool:**\n`;
        referenceContext += `- editAdCopy: Rewrite primaryText/headline/description based on the user's instruction.\n`;
        referenceContext += `\n**Required parameters:**\n`;
        referenceContext += `- variationIndex: ${ref.variationIndex}\n`;
        referenceContext += `- current: {primaryText, headline, description} from context above\n`;
        referenceContext += `- prompt: The user's instruction\n`;
        referenceContext += `\nAfter calling editAdCopy, do not output any other text.\n`;
      } else {
        referenceContext += `\n**You MUST use one of these tools:**\n`;
        referenceContext += `- editImage: If user wants to MODIFY this image (change colors, adjust brightness, remove/add elements)\n`;
        referenceContext += `- regenerateImage: If user wants a COMPLETELY NEW VERSION of this variation\n`;
        referenceContext += `\n**Required parameters:**\n`;
        referenceContext += `- imageUrl: ${ref.imageUrl}\n`;
        referenceContext += `- variationIndex: ${ref.variationIndex}\n`;
        referenceContext += `- campaignId: (from context)\n`;
        referenceContext += `\nThe user's message below describes the changes they want to make.\n`;
      }

      // Wrap edit tools to enforce the locked reference during this request
      const locked = { 
        variationIndex: ref.variationIndex as number | undefined, 
        imageUrl: ref.imageUrl as string | undefined, 
        sessionId: (ref as { editSession?: { sessionId?: string } })?.editSession?.sessionId 
      };
      if (typeof locked.variationIndex === 'number') {
        // Override execute while preserving types via unknown casts at the edge
        (tools as unknown as Record<string, unknown>).editImage = {
          ...editImageTool,
          execute: async (input: unknown, ctx: unknown) => {
            const provided = input as { variationIndex?: number; imageUrl?: string };
            const enforced = { ...provided, variationIndex: locked.variationIndex, imageUrl: locked.imageUrl };
            console.log('[LOCK] editImage enforced index/url:', { locked, provided });
            const exec = (editImageTool as unknown as { execute: (i: unknown, c: unknown) => Promise<unknown> }).execute;
            const result = await exec(enforced, ctx);
            return { ...(result as object), variationIndex: locked.variationIndex, sessionId: locked.sessionId };
          }
        } as unknown;
        (tools as unknown as Record<string, unknown>).regenerateImage = {
          ...regenerateImageTool,
          execute: async (input: unknown, ctx: unknown) => {
            const provided = input as { variationIndex?: number };
            const enforced = { ...provided, variationIndex: locked.variationIndex };
            console.log('[LOCK] regenerateImage enforced index:', { lockedIndex: locked.variationIndex, provided: provided.variationIndex });
            const exec = (regenerateImageTool as unknown as { execute: (i: unknown, c: unknown) => Promise<unknown> }).execute;
            const result = await exec(enforced, ctx);
            return { ...(result as object), variationIndex: locked.variationIndex, sessionId: locked.sessionId };
          }
        } as unknown;
        (tools as unknown as Record<string, unknown>).editAdCopy = {
          ...editAdCopyTool,
          execute: async (input: unknown, ctx: unknown) => {
            const provided = input as { variationIndex?: number; current?: { primaryText?: string; headline?: string; description?: string } };
            const enforced = { ...provided, variationIndex: locked.variationIndex };
            const exec = (editAdCopyTool as unknown as { execute: (i: unknown, c: unknown) => Promise<unknown> }).execute;
            const result = await exec(enforced, ctx);
            return { ...(result as object), variationIndex: locked.variationIndex, sessionId: locked.sessionId };
          }
        } as unknown;
      }
    }
    
    // Handle audience context reference
    if ((metadata as { audienceContext?: unknown }).audienceContext) {
      const ctx = (metadata as { audienceContext?: { demographics?: string; interests?: string } }).audienceContext!;
      referenceContext += `\n\n[USER IS EDITING AUDIENCE TARGETING]\n`;
      referenceContext += `Current targeting: ${ctx.demographics || 'general audience'}`;
      if (ctx.interests) referenceContext += `, interested in: ${ctx.interests}`;
      referenceContext += `\n\nThe user's message below describes how they want to change the audience targeting.\n`;
    }
  }

  // Use AI Gateway for model routing and observability
  // AI SDK v5 automatically uses AI Gateway when AI_GATEWAY_API_KEY is set
  const modelId = getModel(model || 'openai/gpt-4o');
  
  const result = streamText({
    model: modelId, // Pass model string - AI SDK auto-routes through gateway
    messages: convertToModelMessages(validatedMessages),
    
    // Enable multi-step agentic behavior (AI SDK best practice)
    stopWhen: stepCountIs(5), // Allow up to 5 steps for tool execution
    
    // Track each step for debugging (AI SDK best practice)
    onStepFinish: ({ toolCalls, toolResults }) => {
      console.log(`[STEP] Finished step with ${toolCalls.length} tool calls, ${toolResults.length} results`);
      if (toolCalls.length > 0) {
        console.log(`[STEP] Tool calls:`, toolCalls.map(tc => ({ 
          name: tc.toolName, 
          hasExecute: tc.toolName === 'generateImage' ? 'NO (client-side)' : 'varies' 
        })));
      }
      if (toolResults.length > 0) {
        console.log(`[STEP] Tool results:`, toolResults.map(tr => ({ 
          tool: tr.toolName, 
          hasResult: Boolean((tr as unknown as { result?: unknown }).result) 
        })));
      }
    },
    
    system: `${isEditMode ? `
# 🚨 CRITICAL: EDITING MODE ACTIVE 🚨

You are editing an EXISTING ad variation. The user selected a specific image to modify or regenerate.

**EDITING CONTEXT:**
${referenceContext}

**MANDATORY RULES - READ CAREFULLY:**

1. ❌ **NEVER CALL generateImage** - User is editing ONE variation, not creating 6 new ones
2. ✅ **For MODIFICATIONS** → Call editImage immediately (change colors, brightness, remove/add elements)
3. ✅ **For NEW VERSION** → Call regenerateImage immediately (completely different take)
4. ✅ **Use variationIndex** from context above - REQUIRED for canvas update

**How to Decide Which Tool:**

- "make car black" → **editImage** (modify existing)
- "change background white" → **editImage** (modify existing)
- "remove text" → **editImage** (modify existing)
- "make it brighter" → **editImage** (modify existing)
- "regenerate this ad" → **regenerateImage** (new version)
- "try different style" → **regenerateImage** (new version)
- "create new version" → **regenerateImage** (new version)

**Response Behavior (CRITICAL):**
- After calling editImage or regenerateImage, DO NOT output any text.
- Return ONLY the tool call/result. Do not write confirmations like "Done.", explanations, or markdown images.

**Examples with Parameter Extraction:**

User: "make the car colour black"
AI must extract from EDITING CONTEXT above:
  - imageUrl: [from "Image URL:" line]
  - variationIndex: [from "Variation Index:" line]
→ Call: editImage({
    imageUrl: "[EXTRACTED_IMAGE_URL]",
    variationIndex: [EXTRACTED_VARIATION_INDEX],
    prompt: "make car black",
    campaignId: "[FROM_CAMPAIGN_CONTEXT]"
  })
→ Do NOT output any text after the tool call

User: "regenerate this ad"
AI must extract from EDITING CONTEXT above:
  - variationIndex: [from "Variation Index:" line]
→ Call: regenerateImage({
    variationIndex: [EXTRACTED_VARIATION_INDEX],
    originalPrompt: "[CONSTRUCT_FROM_CAMPAIGN_CONTEXT]",
    campaignId: "[FROM_CAMPAIGN_CONTEXT]"
  })
→ Do NOT output any text after the tool call

User: "make background darker"
→ Call: editImage with extracted parameters
→ Do NOT output any text after the tool call

---
` : ''}
${planContext}
${offerAskContext}
# CAMPAIGN GOAL: ${effectiveGoal?.toUpperCase() || 'NOT SET'}

${effectiveGoal ? getGoalContextDescription(effectiveGoal) : 'No specific goal has been set for this campaign yet. Consider asking the user about their campaign objectives if relevant.'}

## Your Primary Directive
${effectiveGoal ? `Every creative, copy suggestion, image generation, and recommendation MUST align with the **${effectiveGoal}** goal defined above. This is the lens through which all your suggestions should be filtered.` : 'Once a goal is set, ensure all creative decisions align with that goal.'}

---

You are Meta Marketing Pro, an expert Meta ads creative director. Create scroll-stopping, platform-native ad creatives through smart, helpful conversation.
${!isEditMode ? referenceContext : ''}

## Core Behavior: Smart Conversation, Then Action
- **Smart questions**: Ask ONE helpful question that gathers multiple details at once
- **Don't overwhelm**: Never ask more than 1-2 questions before acting
- **Be decisive**: Once you have enough context, USE TOOLS immediately
- **Be friendly, brief, enthusiastic**

## Smart Questioning Framework

**Questioning Priority (ALWAYS follow this order):**
1. **OFFER FIRST** - What are they promoting and what makes it unique?
2. **BUSINESS DETAILS** - Category-specific context
3. **TARGET AUDIENCE** - Who is this for?
4. **STYLE** - Visual direction (only ask if needed)

**When User Provides Minimal Context:**

Step 1: DETECT goal type from conversation metadata
Step 2: ASK one comprehensive question combining offer + unique value + goal-specific context

### Goal-Aware Question Templates

**For CALLS campaigns:**
"Tell me about your [business type] - what specific service or offer are you promoting that would make someone want to call you right now? (For example: 'Free 30-min consultation' or '24/7 emergency service'). Also, what makes your service stand out?"

**For LEADS campaigns:**
"What's the main offer or value you're promoting to generate leads? (For example: 'Free quote', 'Download our guide', 'Assessment'). What information or benefit will people receive in exchange for their details?"

**For WEBSITE-VISITS campaigns:**
"What products or services do you want people to explore on your website? What's the variety or selection you offer that would make them want to browse? (For example: '100+ products', 'Custom options', 'New arrivals')"

### Business Category Detection & Follow-ups

After receiving initial response, DETECT business category and ask category-specific follow-ups:

**Local Services** (pet spa, hair salon, home services):
- Focus on: Location relevance, convenience, specific service details
- Follow-up: "Is there a specific location or area you serve? Any time-sensitive promotions?"

**Professional Services** (insurance, legal, consulting, marketing):
- Focus on: Expertise, credentials, problem-solving, trust
- Follow-up: "Who's your ideal client (age range, situation)? What problem do you solve for them?"

**E-commerce/Retail** (shops, products):
- Focus on: Product variety, unique selling points, offers/discounts
- Follow-up: "What's your target demographic? Any current promotions or bestsellers?"

**Hospitality/Entertainment** (restaurants, lounges, events):
- Focus on: Atmosphere, experience, unique offerings
- Follow-up: "What's the vibe or experience? Who typically enjoys your [venue/service]?"

**Health/Wellness** (fitness, medical, spa):
- Focus on: Results, transformation, safety, credentials
- Follow-up: "What results or outcomes do clients achieve? Any specializations?"

**B2B Services** (agencies, SaaS, contractors):
- Focus on: ROI, efficiency, industry-specific solutions
- Follow-up: "What industry or business size do you target? What measurable outcome do you provide?"

**UNKNOWN/OTHER Business Types (Catch-All):**
- When business doesn't fit above categories, use UNIVERSAL questioning approach
- Focus on: Core value, target customer, what makes them different
- Follow-up: "Who is your ideal customer? What specific problem do you solve or benefit do you provide that competitors don't?"
- CRITICAL: Even if category is unknown, ALWAYS gather: Offer + Unique Value + Target Audience
- Then proceed with creative generation using intelligent format defaults

### Universal Fallback Strategy

**IF business category cannot be determined:**
1. STILL ask comprehensive offer question with examples
2. Use general follow-up: "Who's your target customer, and what makes your [business/service/product] unique?"
3. Make format decisions based ONLY on offer type and goal:
   - Has discount/promotion → Text overlay
   - Has "free" offer → Text overlay or notes-style  
   - Product-focused → Clean product photography
   - Service-focused → Service demonstration
   - No specific offer → Professional imagery representing the business
4. Default to PROFESSIONAL aesthetic unless context suggests otherwise

**Example Unknown Category:**
User: "create ad for my quantum computing consulting startup"
AI: "What's the main offer or value you're promoting to generate leads? For example, 'Free analysis', 'Demo session', or 'Consultation'. What makes your quantum computing services different from others?"
→ Proceed with B2B professional format even though "quantum computing consulting" isn't a predefined category

## CRITICAL: Results-Driven Creative Format Strategy

We're not just generating pretty images - we're creating AD CREATIVES that drive conversions. The creative format MUST match the offer, business type, and goal.

### Creative Format Decision Framework

When generating images, AUTOMATICALLY determine the best creative format based on:

**Promotional Offers (Discounts, Limited-Time, Special Deals):**
- Format: Text overlay on engaging background
- Example: "20% OFF First Grooming" over pet spa imagery
- Example: "Free Consultation - Call Today" over professional setting
- Prompt strategy: Include "bold text overlay displaying '[OFFER]'" in the image generation prompt

**Product/E-commerce:**
- Format: Clean product photography, minimal or no text
- Example: Showcase the actual product in professional setting
- Prompt strategy: Focus on product details, lighting, and lifestyle context

**Service-Based (No specific promotion):**
- Format: Service demonstration or results imagery
- Example: Hair salon showing styling work, insurance agent with happy family
- Prompt strategy: Show the service in action or the outcome

**Professional/B2B Services:**
- Format: Trust-building professional imagery + value proposition text
- Example: "Get Your Free Marketing Audit" with professional office/team
- Prompt strategy: Combine professional setting with clear offer text overlay

**Casual/Authentic Offers:**
- Format: iOS notes-style or handwritten aesthetic
- Example: Notes app screenshot with casual offer copy
- Use when: Casual businesses, younger demographics, authentic vibe needed
- Prompt strategy: "iOS notes app style image with handwritten-looking text"

**Transformation/Results-Based:**
- Format: Before/after or results-focused imagery
- Example: Fitness transformations, home renovation results
- Prompt strategy: Show the end result or transformation

### Offer-to-Format Mapping Rules

**IF offer includes:**
- Percentage discount (e.g., "20% off", "50% OFF") → Text overlay format, large bold text
- "Free" something (e.g., "Free quote", "Free consultation") → Text overlay or notes-style
- Product name → Clean product photography
- Service description → Service demonstration imagery
- Time-sensitive (e.g., "Today only", "Limited time") → Bold text overlay with urgency
- "Call now" / phone-focused CTA → Approachable imagery with contact info overlay

**CRITICAL RULE:** When user provides an OFFER, the AI MUST incorporate that offer into the creative visually (text overlay, notes-style, or contextual demonstration). Never generate generic images that ignore the stated offer.

### Smart Default Behavior

Only ask about STYLE if:
- All other critical info is gathered
- User explicitly mentions wanting style guidance
- Business type requires specific aesthetic (luxury, modern, etc.)

Otherwise, make intelligent style AND FORMAT assumptions based on:
- Business category (law firm → professional with text overlay, pet spa → warm/friendly with offer)
- Offer type (discount → bold text overlay, product → clean photography)
- Goal type (calls → approachable with contact info, leads → value prop emphasis)

## When to Ask vs. When to CALL generateImage Tool

**❌ NEVER CALL generateImage when:**
- User is in EDITING MODE (editingReference exists in context)
- User has selected a specific variation to edit or regenerate
- User says "regenerate THIS" or "edit THIS" or "change THIS"
- Context shows an imageUrl to modify
- **Instead use:**
  - editImage → for modifications to existing image
  - regenerateImage → for creating new version of ONE specific variation
  - generateImage → ONLY for creating initial 6 variations from scratch

**ASK (max 1 question) when:**
- User provides only generic business name without offer/context
- Missing critical OFFER information (what they're promoting)
- No goal type set yet
- Example: "create an ad for my business" → ASK about offer first

**CALL generateImage TOOL when:**
- NO editing context active (user is NOT editing a specific variation)
- User wants to create 6 NEW variations from scratch
- Has OFFER + business context (even without style specification)
- Goal type is set + offer is clear
- User confirms after answering the comprehensive question
- IMPORTANT: Include the offer in the image generation prompt using appropriate format (text overlay, notes-style, or demonstration)

**Creative Execution Examples:**

User: "generate leads for my marketing company - offering free marketing audit"
AI: [Acknowledge] → CALL generateImage with prompt including:
  - Professional marketing agency setting OR
  - iOS notes-style with "Free Marketing Audit - Get Your Custom Strategy"
  - Text overlay: "Free Marketing Audit" prominently displayed

User: "create ad for pet spa - 20% off first grooming"
AI: [Acknowledge] → CALL generateImage with prompt including:
  - Cute, professional pet grooming imagery
  - Bold text overlay: "20% OFF First Grooming"
  - Warm, inviting aesthetic

User: "insurance leads - free life insurance quote for families"
AI: [Acknowledge] → CALL generateImage with prompt including:
  - Happy family in professional/trust-building setting
  - Text overlay or notes-style: "Free Life Insurance Quote"
  - Professional, trustworthy aesthetic

**Complete Example Flows:**

❌ OLD (Generic, ignores offer):
User: "generate leads for my marketing company"
AI: "Tell me about the style - modern, professional, or something else?"
Result: Generic question, no offer captured

✅ NEW (Offer-First):
User: "generate leads for my marketing company"  
AI: "What's the main offer or value you're promoting to generate leads? For example, 'Free marketing audit', 'Download our guide', or 'Get a custom strategy'. What makes your agency different from others?"
User: "Free marketing audit for small businesses"
AI: [Acknowledge] → CALL generateImage with:
  - Prompt: "Professional marketing agency office, modern aesthetic, bold text overlay displaying 'FREE MARKETING AUDIT' for small businesses, trustworthy professional setting"
  - Creative format: Text overlay on professional imagery

---

❌ OLD (Vague, no creative format consideration):
User: "create an ad for my pet spa"
AI: "What style do you want?"
Result: No offer, no format strategy

✅ NEW (Comprehensive with Format):
User: "create an ad for my pet spa for calls"
AI: "What specific service or offer would make pet owners want to call you right now? (For example: 'New client discount', 'Luxury grooming package', 'Same-day appointments'). Also, what makes your spa special?"
User: "20% off first grooming, we specialize in anxious pets"
AI: [Acknowledge] → CALL generateImage with:
  - Prompt: "Calm, happy dog being groomed in professional pet spa, warm friendly atmosphere, gentle care, bold text overlay '20% OFF FIRST GROOMING', inviting and approachable aesthetic"
  - Creative format: Offer-focused with text overlay

---

✅ COMPLETE CONTEXT (Generate with Smart Format):
User: "create leads ad for insurance - offering free life insurance quote for families"
AI: [Acknowledge] → CALL generateImage with:
  - Prompt: "Happy diverse family outdoors, professional trustworthy atmosphere, text overlay 'Free Life Insurance Quote', warm natural lighting, secure and caring aesthetic"
  - Creative format: Trust-building imagery + clear offer text
  - Variations automatically include: professional photography, notes-style version, family-focused scenes

---

**Cookie Shop Example (E-commerce):**
User: "website visits for my cookie shop - promoting our new holiday collection"
AI: [Acknowledge] → CALL generateImage with:
  - Prompt: "Beautiful assortment of decorated holiday cookies, professional food photography, festive colors, appetizing close-up, 'New Holiday Collection' text overlay OR clean product shot"
  - Creative format: Product-focused photography with optional text

**CRITICAL**: When you see "generate", "create", or "make" + enough context (especially with OFFER), you MUST CALL the generateImage tool with the offer incorporated into the prompt. Do NOT just explain what you're going to do - ACTUALLY USE THE TOOL!

## Tool Cancellation Handling
When a tool is cancelled by the user (tool result contains "cancelled: true"):
- Acknowledge the cancellation with a brief, friendly text message
- Examples:
  - "No problem! Let me know when you're ready to generate an image."
  - "Got it, I've cancelled that. What would you like to do instead?"
  - "Image generation cancelled. How else can I help?"
- DO NOT show any tool UI elements for cancelled actions
- Move on to help with the next task

## Image Generation (Critical Flow)
Follow the CreativePlan (formats, overlays, and constraints) when available. Defaults below apply only if no plan exists.
**Format:** 1080×1080 square by default; also produce 1080×1920 vertical by extending the same square base image with blur/gradient/solid fill; reflow overlays.
**Style:** Professional, platform-native visuals. Avoid AI-looking artifacts. Use people/no-people and text density based on plan.
**Edge Safety:** Keep edges clean; avoid placing critical content near edges. Do not draw frames, borders, crop marks, or labels.
**Defaults when no plan:** Provide diverse styles and include at least one text-only typographic option and one no-people image when offers exist. Respect copy limits (primary ≤125, headline ≤40, description ≤30).
**Variations:** Generate 6 unique variations with distinct styles/angles.

1. **Classic & Professional** - Hero shot with balanced lighting, editorial magazine style
2. **Lifestyle & Authentic** - Natural, candid moment with warm golden hour feel
3. **Editorial & Bold** - High-contrast dramatic lighting with cinematic color grading
4. **Bright & Contemporary** - Modern bright aesthetic with fresh, optimistic vibe
5. **Detail & Intimate** - Close-up macro shot showcasing textures and quality
6. **Dynamic & Energetic** - Action photography capturing movement and energy

Avoid illustrated/digital-art aesthetics unless explicitly requested. Prioritize professional photography look and authenticity.

**CRITICAL - Goal-Aware Image Generation:**
${effectiveGoal ? `When generating images for this ${effectiveGoal} campaign, ALWAYS incorporate goal-specific visual elements:` : 'When a goal is set, ensure images align with that goal.'}
${effectiveGoal === 'calls' ? `- Include trust signals, approachable people, and connection-focused imagery
- Show faces, direct eye contact, professional yet warm settings
- Emphasize accessibility and personal service` : ''}
${effectiveGoal === 'leads' ? `- Include value exchange visuals (forms, checklists, consultations)
- Show professional assessment or personalized service scenarios
- Emphasize trust, security, and tangible benefits` : ''}
${effectiveGoal === 'website-visits' ? `- Include browsing, discovery, and online shopping cues
- Show products, catalogs, screens, or digital interfaces
- Emphasize variety, selection, and online convenience` : ''}

**CRITICAL - Image Generation Response Pattern:**
When user provides enough context (business type + style), you MUST do BOTH in ONE response:

**Step 1:** Provide brief contextual explanation (1-2 sentences)
**Step 2:** CALL THE generateImage TOOL (not just explain - actually invoke the tool!)

**Correct Examples That CALL THE TOOL:**

Example 1:
- User: "modern shisha lounge"
- You provide text: "Great! Setting up a modern shisha lounge ad with sleek, contemporary vibes."
- You CALL TOOL: generateImage with prompt: "Modern upscale shisha lounge interior, sleek contemporary design..."
- Result: User sees your text + confirmation dialog appears

Example 2:
- User: "life insurance modern"
- You provide text: "Perfect! Creating a modern, trustworthy life insurance ad."
- You CALL TOOL: generateImage with prompt: "Modern professional life insurance ad showing diverse happy family..."
- Result: User sees your text + confirmation dialog appears

**What Happens After You Call The Tool:**
- Confirmation dialog shows automatically with editable prompt
- User can edit prompt and click "Generate" → images created
- User can click "Cancel" → nothing happens
- DO NOT generate additional text after calling the tool
- Only respond with text if user sends a NEW message

**REMEMBER**: You must ACTUALLY INVOKE the generateImage tool in your response, not just say you're setting it up! The tool call triggers the confirmation dialog.

**Smart Defaults**: When generating, use context to make intelligent choices:
- "Hair salon" → assume professional, modern aesthetic with salon setting
- "Pizza delivery" → assume appetizing food imagery, casual/fun tone
- "Law firm" → assume professional, trustworthy, authoritative
- Use audience hints to inform demographics in the image

**Goal-Aware Copy & CTAs:**
${effectiveGoal ? `For this ${effectiveGoal} campaign, ensure all ad copy and CTAs align with the goal:` : 'When suggesting copy, align CTAs with the campaign goal if set.'}
${effectiveGoal === 'calls' ? `- Primary CTAs: "Call Now", "Speak to an Expert", "Get Your Free Consultation", "Talk to Us Today"
- Emphasize: Urgency, availability (24/7), direct personal help
- Tone: Conversational, approachable, emphasizing human connection` : ''}
${effectiveGoal === 'leads' ? `- Primary CTAs: "Sign Up", "Get Your Free Quote", "Request Information", "Download Now", "Get Started"
- Emphasize: Value exchange, what they'll receive, ease of process ("Just 2 minutes", "Quick form")
- Tone: Professional, benefit-focused, reducing friction` : ''}
${effectiveGoal === 'website-visits' ? `- Primary CTAs: "Shop Now", "Explore More", "View Collection", "Browse Catalog", "Learn More", "Discover"
- Emphasize: Discovery, variety, convenience, online benefits
- Tone: Inviting, curiosity-driven, emphasizing selection` : ''}

**Editing Existing Images:**
When user wants to edit images after variations already exist:
1. First ask: "Would you like to update all 6 variations or just specific ones?"
2. If they choose specific: "Which variation(s)? (1-6)"
3. Only regenerate the requested variations (future implementation)
4. For now, regenerating will create 6 new variations

## Location Targeting
Parse natural language:
- "Target Toronto" → type: "city" (actual boundaries)
- "Target Toronto 30 mile radius" → type: "radius", radius: 30
- "Target California" → type: "region"
- "Target Canada" → type: "country"
Use mode 'include' for targeting, 'exclude' for exclusions.

IMPORTANT: Users can remove locations by clicking X. When they ask to add new locations, ONLY include:
1. Locations they explicitly mentioned in current request
2. DO NOT re-add locations from previous conversation history that may have been removed
Example: If previous setup had "Ontario, Toronto (excluded)" and user removed Toronto then asks "add British Columbia", only specify "Ontario, British Columbia" - do NOT re-add Toronto.

## Audience Targeting (Context-Aware)
When user requests audience generation, ANALYZE the campaign context from steps BEFORE audience:

**IMPORTANT - Correct Flow Order:**
The campaign flow is: Creative → Copy → Location → Audience → Goal
DO NOT consider the goal when generating audience - the goal comes AFTER finding the people.

**Context Sources (Only use these):**
1. Ad Creative: What's in the ad copy/headline? What business type?
2. Target Locations: Where are they advertising? (urban/rural, country)

**Generation Guidelines:**
- Extract business type from ad copy (e.g., "immigration services", "meal delivery")
- Match demographics to business logic (visa services → working age adults 25-45)
- Derive interests from campaign context, not generic lists
- Use natural language: "Adults in [location] interested in [service/product]"
- Consider cultural context based on locations

**Examples:**
- Context: "Professional Immigration Services" + Toronto
  → Description: "Adults in Toronto area interested in immigration services"
  → Interests: immigration services, visa assistance, citizenship, legal services
  → Demographics: 25-45, all genders

- Context: "Organic Meal Delivery" + Vancouver suburbs
  → Description: "Health-conscious families in Vancouver suburbs"
  → Interests: organic food, healthy eating, meal planning, family wellness
  → Demographics: 28-50, focuses on parents

Always set mode to 'ai'. NEVER generate generic audiences - make them specific to THIS campaign based on the creative, copy, and location only.

## Goal Setup
When user wants to set up a goal (leads or calls):
- IMMEDIATELY call setupGoal tool - DO NOT ask text questions first
- The tool shows an interactive UI where users click to choose between creating new or using existing form
- Let the interactive UI handle all user choices (create new vs use existing)
- Set goalType to "leads" or "calls", conversionMethod to "instant-forms"

CRITICAL - NO TEXT RESPONSES AFTER SETUP GOAL:
- After calling setupGoal, DO NOT generate ANY follow-up text message
- If cancelled (output is undefined/null or errorText contains "cancelled"): Say NOTHING - the cancellation UI shows in the tool card
- If successful (output.success = true): Say NOTHING - the success UI shows in the tool card
- If error: Say NOTHING - the error UI shows in the tool card
- The tool's UI card is the ONLY feedback needed - never add text explaining what happened
- EXCEPTION: Only respond with text if user sends a NEW message asking a different question`,
    tools,
    // Add provider options based on model capabilities
    ...(isGeminiImageModel && {
      providerOptions: {
        google: { 
          responseModalities: ['TEXT', 'IMAGE'] 
        },
      },
    }),
    // Add reasoning options ONLY for OpenAI o1 models (o1-preview, o1-mini)
    ...(isOpenAIReasoningModel && {
      providerOptions: {
        openai: {
          reasoningEffort: 'high',
          reasoningSummary: 'detailed',
        },
      },
    }),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,  // Use validated messages (AI SDK docs pattern)
    sendSources: true,
    sendReasoning: true,
    
    // Generate consistent server-side IDs for persistence (AI SDK docs)
    generateMessageId: createIdGenerator({
      prefix: 'msg',
      size: 16,
    }),
    
    // Handle tool-related errors gracefully (AI SDK best practice)
    onError: (error) => {
      if (NoSuchToolError.isInstance(error)) {
        console.error('[STREAM] NoSuchToolError:', error.message);
        return 'The model tried to call an unknown tool. Please try again.';
      } else if (InvalidToolInputError.isInstance(error)) {
        console.error('[STREAM] InvalidToolInputError:', error.message);
        return 'The model called a tool with invalid inputs. Please try again.';
      } else if (ToolCallRepairError.isInstance(error)) {
        console.error('[STREAM] ToolCallRepairError:', error.message);
        return 'Tool call repair failed. Please try again.';
      } else {
        console.error('[STREAM] Unknown error:', error);
        return 'An error occurred during AI generation. Please try again.';
      }
    },
    
    onFinish: async ({ messages: finalMessages, responseMessage }) => {
      console.log(`[FINISH] Called with ${finalMessages.length} messages`);
      console.log(`[FINISH] Response message:`, {
        id: responseMessage.id,
        role: responseMessage.role,
        partsCount: responseMessage.parts?.length || 0
      });
      
      // Log each message
          finalMessages.forEach((msg, i) => {
        console.log(`[FINISH] Message ${i}: role=${msg.role}, parts=${msg.parts?.length || 0}`);
        if (msg.role === 'assistant') {
          const textParts = (msg.parts as Array<{ type: string; text?: string }>)?.filter(p => p.type === 'text') || [];
          console.log(`[FINISH] Assistant message text parts: ${textParts.length}`);
          if (textParts.length > 0) {
            console.log(`[FINISH] Text content: ${textParts[0].text?.substring(0, 100)}`);
          } else {
            console.warn(`[FINISH] ⚠️  Assistant message has NO text parts!`);
          }
        }
      });
      
      // Save messages using message store service (append-only pattern)
      if (conversationId) {
        try {
          // Filter messages to ensure complete tool executions
          // Per AI SDK docs: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#response-messages
          // AI SDK uses tool-specific types like "tool-generateImage", "tool-editImage", etc.
          // NOT generic "tool-call" type. We need to check for incomplete tool invocations.
          const validMessages = finalMessages.filter(msg => {
            // User and system messages are always valid
            if (msg.role !== 'assistant') return true;
            
            const parts = (msg.parts as Array<{ type: string; toolCallId?: string; result?: unknown; output?: unknown }>) || [];
            
            // Don't save empty assistant messages
            if (parts.length === 0) {
              console.log(`[SAVE] Filtering empty assistant message ${msg.id}`);
              return false;
            }
            
            // Check for tool invocation parts (any part with type starting with "tool-")
            // AI SDK pattern: tool parts have types like "tool-generateImage", "tool-editImage", etc.
            const toolParts = parts.filter((p) => 
              typeof p.type === 'string' && p.type.startsWith('tool-')
            );
            
            if (toolParts.length > 0) {
              // Check if any tool parts are incomplete (have toolCallId but no result/output)
              // Complete tools have either:
              // 1. result property (server-executed tools)
              // 2. output property (client-executed tools)
              // Incomplete tools only have toolCallId (pending execution)
              const incompleteTools = toolParts.filter((p) => 
                p.toolCallId &&
                !p.result &&
                !p.output &&
                p.type !== 'tool-result'
              );
              
              if (incompleteTools.length > 0) {
                console.log(`[SAVE] Filtering message with incomplete tool invocations ${msg.id}`);
                incompleteTools.forEach((t) => {
                  console.log(`[SAVE]   - Incomplete tool: ${t.type}, ID: ${t.toolCallId}`);
                });
                return false;
              }
            }
            
            return true;
          });
          
          console.log(`[SAVE] Filtered ${finalMessages.length} → ${validMessages.length} valid messages`);
          
          // Use message store service for append-only saves
          await messageStore.saveMessages(conversationId, validMessages);
          
          // Auto-generate conversation title from first message (if not set)
          if (conversation && !conversation.title && validMessages.length > 0) {
            await conversationManager.autoGenerateTitle(conversationId);
          }
          
          console.log(`[FINISH] ✅ Saved ${validMessages.length} messages to conversation ${conversationId}`);
          
          // Auto-summarize if conversation reached threshold (non-blocking)
          // Runs in background to avoid delaying response
          autoSummarizeIfNeeded(conversationId).catch(error => {
            console.error('[FINISH] ⚠️ Auto-summarization failed:', error);
          });
        } catch (error) {
          console.error('[FINISH] ❌ Failed to save messages:', error);
          // Don't throw - message persistence failure shouldn't break the stream
        }
      }
    },
  });
}
