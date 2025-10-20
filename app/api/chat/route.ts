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
import { locationTargetingTool } from '@/tools/location-targeting-tool';
import { audienceTargetingTool } from '@/tools/audience-targeting-tool';
import { setupGoalTool } from '@/tools/setup-goal-tool';
import { supabaseServer } from '@/lib/supabase/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Store complete UIMessage as recommended by AI SDK docs
// "We recommend storing the messages in the useChat message format"
function messageToStorage(msg: UIMessage) {
  // Extract text content for the content field (for querying)
  const textParts = (msg.parts as any[])?.filter((part: any) => part.type === 'text') || [];
  const content = textParts.map((p: any) => p.text).join('\n');
  
  return {
    id: msg.id,
    role: msg.role,
    content,
    parts: (msg.parts || []) as any,  // Store complete parts array (AI SDK format) - cast to Json
    tool_invocations: ((msg as any).toolInvocations || []) as any,  // Store complete toolInvocations (AI SDK format) - cast to Json
  };
}

// Convert back to UIMessage (restore complete message)
function storageToMessage(stored: any): UIMessage {
  return {
    id: stored.id,
    role: stored.role,
    content: stored.content,
    parts: stored.parts || [],  // Restore complete parts array
    toolInvocations: stored.tool_invocations || [],  // Restore complete toolInvocations
  } as UIMessage;
}

export async function POST(req: Request) {
  const { message, id, model } = await req.json();
  
  const tools = {
    generateImage: generateImageTool,
    editImage: editImageTool,
    locationTargeting: locationTargetingTool,
    audienceTargeting: audienceTargetingTool,
    setupGoal: setupGoalTool,
  };

  // Load and validate messages from database (AI SDK docs pattern)
  let validatedMessages: UIMessage[];
  
  // Load previous messages + append new one
  if (message && id) {
    console.log(`[API] Loading messages for campaign ${id}`);
    
    const { data: dbMessages } = await supabaseServer
      .from('chat_messages')
      .select('*')
      .eq('campaign_id', id)
      .order('sequence_number', { ascending: true });

    const previousMessages = (dbMessages || []).map(storageToMessage);
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

  const result = streamText({
    model: model,
    messages: convertToModelMessages(validatedMessages),
    
    // Enable multi-step agentic behavior (AI SDK best practice)
    stopWhen: stepCountIs(5), // Allow up to 5 steps for tool execution
    
    // Track each step for debugging (AI SDK best practice)
    onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
      console.log(`[STEP] Finished step with ${toolCalls.length} tool calls, ${toolResults.length} results`);
      if (toolCalls.length > 0) {
        console.log(`[STEP] Tool calls:`, toolCalls.map(tc => tc.toolName));
      }
    },
    
    system: `You are Meta Marketing Pro, an expert Meta ads creative director. Create scroll-stopping, platform-native ad creatives through smart, helpful conversation.

## Core Behavior: Smart Conversation, Then Action
- **Conversation-first, not tool-first**: Understand context before executing tools
- **Smart questions**: Ask ONE helpful question that gathers multiple details at once
- **Don't overwhelm**: Never ask more than 1-2 questions before acting
- **Be decisive**: Once you have enough context, act immediately
- **Be friendly, brief, enthusiastic**

## When to Ask vs. When to Generate

**ASK (max 1-2 questions total) when:**
- User says generic requests: "create an ad", "help me with an ad", "make something for my business"
- Missing critical context: what they're promoting, who the audience is, or what style they want
- **HOW TO ASK**: Combine multiple details into ONE helpful question
  - ✅ GOOD: "I'd love to help! Tell me about your hair salon - what's the vibe (modern, luxury, edgy?) and what's the main offer or message you want to promote?"
  - ❌ BAD: "What's your business?" then "What style?" then "What's the offer?" (too many questions)

**GENERATE IMMEDIATELY when:**
- User provides enough context: business type + style/tone OR specific offer/message
- Examples that have enough context:
  - "Create a modern ad for my hair salon" ✓ (has business + style)
  - "Generate an ad for a luxury spa targeting women" ✓ (has business + audience + tone)
  - "Make an ad for my pizza delivery special" ✓ (has business + offer)
- After asking ONE question and getting an answer
- User explicitly confirms: "go ahead", "create it", "yes, generate that"

## Tool Cancellation Handling
When a tool is cancelled by the user (tool result contains "cancelled: true"):
- Acknowledge the cancellation with a brief, friendly text message
- Examples:
  - "No problem! Let me know when you're ready to generate an image."
  - "Got it, I've cancelled that. What would you like to do instead?"
  - "Image generation cancelled. How else can I help?"
- DO NOT show any tool UI elements for cancelled actions
- Move on to help with the next task

## Image Generation (Critical)
**Format:** Always 1080×1080 square, works universally across Feed/Stories/Reels
**Style:** Super-realistic, natural, human-centric, mobile-optimized
**Safe Zones:** 10-12% margins on ALL sides (prevents UI overlap)
**Default:** Text-free, no logos/watermarks unless requested

**Smart Defaults**: When generating, use context to make intelligent choices:
- "Hair salon" → assume professional, modern aesthetic with salon setting
- "Pizza delivery" → assume appetizing food imagery, casual/fun tone
- "Law firm" → assume professional, trustworthy, authoritative
- Use audience hints to inform demographics in the image

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
      
      if (id) {
        await saveMessages(id, finalMessages);
      }
    },
  });
}

// Save function following AI SDK docs pattern
// "Storing messages is done in the onFinish callback"
async function saveMessages(campaignId: string, messages: UIMessage[]) {
  try {
    console.log(`[SAVE] Campaign ${campaignId}: ${messages.length} messages (before filtering)`);
    
    // CRITICAL: Filter parts within messages to preserve text while removing incomplete tool invocations
    // This ensures text content is always saved, even if tool calls are incomplete
    const completeMessages = messages.map(msg => {
      // User messages are always complete
      if (msg.role === 'user') return msg;
      
      // For assistant messages, filter parts and tool invocations
      const parts = (msg.parts as any[]) || [];
      const toolInvocations = (msg as any).toolInvocations || [];
      
      // Keep text parts and reasoning, filter tool parts to only complete ones
      const completeParts = parts.filter((part: any) => {
        // Always keep text and reasoning parts
        if (part.type === 'text' || part.type === 'reasoning') return true;
        
        // For tool parts, only keep if they have results
        if (part.type?.startsWith('tool-')) {
          const isComplete = part.state === 'result' || part.state === 'call';
          if (!isComplete) {
            console.log(`[SAVE] ⚠️  Filtering incomplete tool part: ${part.type}, state: ${part.state}`);
          }
          return isComplete;
        }
        
        // Keep other part types (source-url, etc)
        return true;
      });
      
      // Preserve tool invocation metadata (AI SDK best practice)
      // Mark incomplete invocations instead of removing them entirely
      // This maintains conversation history and allows UI to show what was attempted
      const preservedToolInvocations = toolInvocations.map((inv: any) => {
        const isComplete = inv.state === 'result' || inv.state === 'call';
        if (!isComplete) {
          console.log(`[SAVE] ⚠️  Marking incomplete tool invocation: ${inv.toolName}, state: ${inv.state}`);
          // Keep minimal metadata for display purposes
          return {
            toolName: inv.toolName,
            toolCallId: inv.toolCallId,
            state: 'incomplete',
            args: inv.args, // Preserve arguments for context
          };
        }
        return inv;
      });
      
      return {
        ...msg,
        parts: completeParts,
        toolInvocations: preservedToolInvocations, // Preserve all tool invocations (AI SDK pattern)
      } as UIMessage;
    }).filter(msg => {
      // Only filter out messages that are completely empty (no parts AND no tool invocations)
      // Following AI SDK best practice: preserve conversation history including tool attempts
      const parts = (msg.parts as any[]) || [];
      const toolInvocations = (msg as any).toolInvocations || [];
      
      // Keep message if it has either parts OR tool invocations
      if (parts.length === 0 && toolInvocations.length === 0) {
        console.log(`[SAVE] ⚠️  Filtering out completely empty message ${msg.id}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`[SAVE] Filtered to ${completeMessages.length} complete messages`);
    
    // Validate messages have IDs
    const invalidMessages = completeMessages.filter(m => !m.id);
    if (invalidMessages.length > 0) {
      console.error(`[SAVE] ❌ Found ${invalidMessages.length} messages without IDs!`, invalidMessages);
      throw new Error('All messages must have IDs');
    }
    
    // First, delete all existing messages for this campaign
    const { error: deleteError } = await supabaseServer
      .from('chat_messages')
      .delete()
      .eq('campaign_id', campaignId);
    
    if (deleteError) {
      console.error(`[SAVE] Delete error:`, deleteError);
      throw deleteError;
    }
    
    console.log(`[SAVE] Deleted old messages, now inserting ${completeMessages.length} new ones`);
    
    // Store complete UIMessage data (following AI SDK docs)
    const messagesToInsert = completeMessages.map((msg, index) => {
      const stored = messageToStorage(msg);
      console.log(`[SAVE] Message ${index}: id=${msg.id}, role=${msg.role}, content length=${(msg as any).content?.length || 0}`);
      return {
        ...stored,
        campaign_id: campaignId,
        sequence_number: index,
        // Don't override parts - it's already set by messageToStorage
      };
    });
    
    // Insert all messages (only if we have any)
    if (messagesToInsert.length > 0) {
      const { error: insertError } = await supabaseServer
        .from('chat_messages')
        .insert(messagesToInsert);
      
      if (insertError) {
        console.error(`[SAVE] Insert error:`, insertError);
        console.error(`[SAVE] Failed to insert messages:`, messagesToInsert.map(m => ({ id: m.id, role: m.role })));
        throw insertError;
      }
      
      console.log(`[SAVE] ✅ Success - stored ${completeMessages.length} complete UIMessages`);
    } else {
      console.log(`[SAVE] ⚠️  No complete messages to store`);
    }
  } catch (error) {
    console.error(`[SAVE] ❌ Error:`, error);
  }
}
