import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { generateImageTool } from '@/tools/generate-image-tool';
import { editImageTool } from '@/tools/edit-image-tool';
import { locationTargetingTool } from '@/tools/location-targeting-tool';

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

IMPORTANT: After calling generateImage/editImage tools, do NOT add text. The preview displays automatically.`,
        tools: {
            generateImage: generateImageTool,
            editImage: editImageTool,
            locationTargeting: locationTargetingTool,
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