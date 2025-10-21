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
} from 'ai';
import { generateImageTool } from '@/tools/generate-image-tool';
import { editImageTool } from '@/tools/edit-image-tool';
import { regenerateImageTool } from '@/tools/regenerate-image-tool';
import { locationTargetingTool } from '@/tools/location-targeting-tool';
import { audienceTargetingTool } from '@/tools/audience-targeting-tool';
import { setupGoalTool } from '@/tools/setup-goal-tool';
import { getModel } from '@/lib/ai/gateway-provider';
import { messageStore } from '@/lib/services/message-store';
import { conversationManager } from '@/lib/services/conversation-manager';
import { autoSummarizeIfNeeded } from '@/lib/ai/summarization';
import { createServerClient } from '@/lib/supabase/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

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
    const validationResult = await safeValidateUIMessages({
      messages,
      tools: tools as any,
    });
    
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
  const isOpenAIReasoningModel = model.includes('o1-preview') || model.includes('o1-mini');

  // Extract reference context from message metadata (AI SDK v5 native pattern)
  let referenceContext = '';
  let isEditMode = false;
  
  if (message?.metadata) {
    const metadata = message.metadata as Record<string, any>;
    isEditMode = Boolean(metadata.editMode);
    
    // Handle ad editing reference
    if (metadata.editingReference) {
      const ref = metadata.editingReference;
      referenceContext += `\n\n[USER IS EDITING: ${ref.variationTitle}`;
      if (ref.format) referenceContext += ` (${ref.format} format)`;
      referenceContext += `]\n`;
      
      if (ref.imageUrl) {
        referenceContext += `Image URL: ${ref.imageUrl}\n`;
      }
      
      if (ref.content) {
        referenceContext += `Current content:\n`;
        if (ref.content.primaryText) referenceContext += `- Primary Text: "${ref.content.primaryText}"\n`;
        if (ref.content.headline) referenceContext += `- Headline: "${ref.content.headline}"\n`;
        if (ref.content.description) referenceContext += `- Description: "${ref.content.description}"\n`;
      }
      
      referenceContext += `\nThe user's message below describes the changes they want to make to this ad.\n`;
    }
    
    // Handle audience context reference
    if (metadata.audienceContext) {
      const ctx = metadata.audienceContext;
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
    onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
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
          hasResult: !!(tr as any).result 
        })));
      }
    },
    
    system: `You are Meta Marketing Pro, an expert Meta ads creative director. Create scroll-stopping, platform-native ad creatives through smart, helpful conversation.
${referenceContext}

${isEditMode ? `
## 🎨 EDITING MODE ACTIVE

You are currently helping the user edit an existing ad creative. The context above shows what they're editing.

**Your Response Pattern**:
1. **Acknowledge** what they want to change specifically
2. **If editing IMAGE**: Use the editImage tool with:
   - The Image URL from the editing context above
   - Their requested changes as the edit prompt
   - Be specific about what to modify/remove/add
3. **If editing COPY**: Provide the improved text directly
4. **Be decisive**: Don't ask questions - use the tools immediately based on their request

**Example Responses**:
User: "remove the square from this image"
You: "I'll remove the square element from Variation 1 for you." → [CALL editImage tool with imageUrl and prompt "remove the white square overlay"]

User: "make the background darker"  
You: "I'll darken the background in this image." → [CALL editImage tool with imageUrl and prompt "darken the background, increase shadows"]

User: "change the headline to something more exciting"
You: "Here's a more exciting headline: [provide new headline]"

**CRITICAL**: When editing images, you MUST call the editImage tool with the imageUrl from the editing context. Don't just explain - ACT!
` : ''}

## Core Behavior: Smart Conversation, Then Action
- **Smart questions**: Ask ONE helpful question that gathers multiple details at once
- **Don't overwhelm**: Never ask more than 1-2 questions before acting
- **Be decisive**: Once you have enough context, USE TOOLS immediately
- **Be friendly, brief, enthusiastic**

## When to Ask vs. When to CALL generateImage Tool

**ASK (max 1-2 questions total) when:**
- User says generic requests: "create an ad", "help me with an ad", "make something for my business"
- Missing critical context: what they're promoting, who the audience is, or what style they want
- **HOW TO ASK**: Combine multiple details into ONE helpful question
  - ✅ GOOD: "I'd love to help! Tell me about your hair salon - what's the vibe (modern, luxury, edgy?) and what's the main offer or message you want to promote?"
  - ❌ BAD: "What's your business?" then "What style?" then "What's the offer?" (too many questions)

**CALL generateImage TOOL IMMEDIATELY when:**
- User provides enough context: business type + style/tone OR specific offer/message
- Examples that require you to CALL THE TOOL:
  - "Create a modern ad for my hair salon" ✓ → CALL generateImage tool NOW
  - "Generate an ad for a luxury spa targeting women" ✓ → CALL generateImage tool NOW
  - "Make an ad for my pizza delivery special" ✓ → CALL generateImage tool NOW
  - "modern shisha lounge" ✓ → CALL generateImage tool NOW
  - "life insurance modern" ✓ → CALL generateImage tool NOW
- After asking ONE question and getting an answer → CALL generateImage tool NOW
- User explicitly confirms: "go ahead", "create it", "yes, generate that" → CALL generateImage tool NOW

**CRITICAL**: When you see "generate", "create", or "make" + enough context, you MUST CALL the generateImage tool. Do NOT just explain what you're going to do - ACTUALLY USE THE TOOL!

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
**Format:** Always 1080×1080 square, works universally across Feed/Stories/Reels
**Style:** HYPER-REALISTIC photography ONLY - must look like professional DSLR photos
**Safe Zones:** 10-12% margins on ALL sides (prevents UI overlap)
**Default:** Text-free, no logos/watermarks unless requested
**Variations:** Always generates 6 unique AI-powered creative variations, each with distinct style:

1. **Classic & Professional** - Hero shot with balanced lighting, editorial magazine style
2. **Lifestyle & Authentic** - Natural, candid moment with warm golden hour feel
3. **Editorial & Bold** - High-contrast dramatic lighting with cinematic color grading
4. **Bright & Contemporary** - Modern bright aesthetic with fresh, optimistic vibe
5. **Detail & Intimate** - Close-up macro shot showcasing textures and quality
6. **Dynamic & Energetic** - Action photography capturing movement and energy

All variations are HYPER-REALISTIC - no illustrations, digital art, or AI-looking imagery. Every image must be indistinguishable from professional camera photography.

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
          const textParts = (msg.parts as any[])?.filter(p => p.type === 'text') || [];
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
            
            const parts = (msg.parts as any[]) || [];
            
            // Don't save empty assistant messages
            if (parts.length === 0) {
              console.log(`[SAVE] Filtering empty assistant message ${msg.id}`);
              return false;
            }
            
            // Check for tool invocation parts (any part with type starting with "tool-")
            // AI SDK pattern: tool parts have types like "tool-generateImage", "tool-editImage", etc.
            const toolParts = parts.filter((p: any) => 
              typeof p.type === 'string' && p.type.startsWith('tool-')
            );
            
            if (toolParts.length > 0) {
              // Check if any tool parts are incomplete (have toolCallId but no result/output)
              // Complete tools have either:
              // 1. result property (server-executed tools)
              // 2. output property (client-executed tools)
              // Incomplete tools only have toolCallId (pending execution)
              const incompleteTools = toolParts.filter((p: any) => 
                p.toolCallId && // Has a tool call ID (indicates invocation)
                !p.result &&    // No result from server execution
                !p.output &&    // No output from client execution
                p.type !== 'tool-result' // Not a tool result part
              );
              
              if (incompleteTools.length > 0) {
                console.log(`[SAVE] Filtering message with incomplete tool invocations ${msg.id}`);
                incompleteTools.forEach((t: any) => {
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
