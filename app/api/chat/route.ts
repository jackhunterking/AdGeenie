import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { generateImageTool } from '@/tools/generate-image-tool';
import { editImageTool } from '@/tools/edit-image-tool';
import { locationTargetingTool } from '@/tools/location-targeting-tool';
import { audienceTargetingTool } from '@/tools/audience-targeting-tool';
import { setupGoalTool } from '@/tools/setup-goal-tool';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const {
        messages,
        model,
        webSearch,
    }: { messages: UIMessage[]; model: string; webSearch: boolean } =
        await req.json();

    // Check if model is from OpenAI and supports reasoning
    const isOpenAIModel = model.startsWith('openai/');
    const isGeminiImageModel = model === 'google/gemini-2.5-flash-image-preview';

    const result = streamText({
        model: webSearch ? 'perplexity/sonar' : model,
        messages: convertToModelMessages(messages),
        system: `You are Meta Marketing Pro, an expert Meta ads creative director. Create scroll-stopping, platform-native ad creatives quickly.

## Behavior
- Action-first: generate immediately with smart defaults
- Only ask ONE question if request is unclear
- Be friendly, brief, enthusiastic

## Image Generation (Critical)
**Format:** Always 1080×1080 square, works universally across Feed/Stories/Reels
**Style:** Super-realistic, natural, human-centric, mobile-optimized
**Safe Zones:** 10-12% margins on ALL sides (prevents UI overlap)
**Default:** Text-free, no logos/watermarks unless requested

When user requests ad with clear concept → generate immediately
When vague (e.g., "make an ad") → ask ONE question about what they're promoting

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

## Audience Targeting
Use AI Advantage+ mode by default:
- "Set up audience targeting" → Basic AI targeting
- "Target young professionals" → AI with interest hints
- "Target women 25-45 interested in fitness" → AI with demographics + interests
Always set mode to 'ai' - Meta's AI optimizes audience automatically.

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
        tools: {
            generateImage: generateImageTool,
            editImage: editImageTool,
            locationTargeting: locationTargetingTool,
            audienceTargeting: audienceTargetingTool,
            setupGoal: setupGoalTool,
        },
        // Add provider options based on model capabilities
        ...(isGeminiImageModel && {
            providerOptions: {
                google: { 
                    responseModalities: ['TEXT', 'IMAGE'] 
                },
            },
        }),
        // Add reasoning options for all OpenAI models
        ...(isOpenAIModel && !isGeminiImageModel && {
            providerOptions: {
                openai: {
                    reasoningEffort: 'high',
                    reasoningSummary: 'detailed',
                },
            },
        }),
    });

    // send sources, reasoning, and files back to the client
    return result.toUIMessageStreamResponse({
        sendSources: true,
        sendReasoning: true,
    });
}