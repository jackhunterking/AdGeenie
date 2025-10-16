"use server";

import { generateText } from 'ai';
import fs from 'node:fs';

// Meta-specific prompt enhancement for visual guardrails
function enhancePromptWithMetaGuardrails(userPrompt: string, isEdit: boolean = false): string {
    const baseEnhancement = `
${userPrompt}

CRITICAL VISUAL REQUIREMENTS:
- Style: Super-realistic, natural photography (NOT stock photo or artificial CGI)
- Quality: High-resolution, professional lighting, authentic human moments
- Composition: Mobile-optimized, centered or rule-of-thirds subject placement with format flexibility
- Background: Clean, bright, neutral, non-competing with subject
- Aesthetic: Native Meta feed style - should not look like an advertisement
- Format Flexibility: Design should work beautifully in both square (1:1) and vertical (9:16) formats
- Central Weighting: Keep key visual elements in the center safe zone to allow format adaptation

SAFE ZONES & PADDING (CRITICAL):
- ALWAYS maintain 10-12% padding/margins on ALL edges (top, bottom, left, right)
- This ensures content is never cropped by platform UI elements
- Keep main subject and important details within the central 80% of the frame
- Design with breathing room - never position elements at extreme edges
- Centrally-weighted composition allows seamless adaptation between aspect ratios

NO RESTRICTIONS:
- NO text overlays, NO logos, NO watermarks, NO graphic design elements
- NO banner layouts, NO heavy borders, NO cluttered compositions

IMAGE SPECIFICATIONS:
- Aspect ratio: Typically 1:1 (square feed) unless user specifically requests Stories/Reels format (9:16)
- Resolution: High quality, sharp focus on main subject
- Color: Balanced, natural tones with soft contrast
- Focal point: Clear, unobstructed, positioned in center safe zone to avoid platform UI overlap

The image should look like professional, authentic content that stops the scroll naturally and works perfectly across multiple Meta placements.`;

    return baseEnhancement;
}

export async function generateImage(prompt: string) {
    try {
        // Enhance prompt with Meta guardrails
        const enhancedPrompt = enhancePromptWithMetaGuardrails(prompt);
        
        const result = await generateText({
            model: 'google/gemini-2.5-flash-image-preview',
            prompt: enhancedPrompt,
            providerOptions: {
                google: { 
                    responseModalities: ['TEXT', 'IMAGE'] 
                },
            },
        });

        let fileName = '';

        // Save generated images
        for (const file of result.files) {
            if (file.mediaType.startsWith('image/')) {
                const timestamp = Date.now();
                fileName = `generated-${timestamp}.png`;

                await fs.promises.writeFile(`public/${fileName}`, file.uint8Array);
            }
        }

        if (!fileName) {
            throw new Error('No image was generated');
        }

        return `/${fileName}`;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function editImage(imageUrl: string, editPrompt: string) {
    try {
        // Read the existing image from public folder
        const imagePath = imageUrl.startsWith('/') 
            ? `public${imageUrl}` 
            : imageUrl;
        
        const imageBuffer = await fs.promises.readFile(imagePath);
        
        // Determine media type from file extension
        let mediaType = 'image/png';
        if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
            mediaType = 'image/jpeg';
        } else if (imagePath.endsWith('.webp')) {
            mediaType = 'image/webp';
        }
        
        // Enhance edit prompt with Meta guardrails
        const enhancedEditPrompt = enhancePromptWithMetaGuardrails(editPrompt, true);
        
        // Use messages format with file input
        // AI Gateway will route to Gemini with image input support
        const result = await generateText({
            model: 'google/gemini-2.5-flash-image-preview',
            providerOptions: {
                google: { 
                    responseModalities: ['TEXT', 'IMAGE'] 
                },
            },
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Edit this image with the following instructions: ${enhancedEditPrompt}

IMPORTANT: Maintain Meta's native ad aesthetic - natural, realistic, mobile-optimized with proper safe zones.`,
                        },
                        {
                            type: 'file',
                            mediaType: mediaType,
                            data: imageBuffer,
                        },
                    ],
                },
            ],
        });

        let fileName = '';

        // Save edited image
        for (const file of result.files) {
            if (file.mediaType.startsWith('image/')) {
                const timestamp = Date.now();
                fileName = `edited-${timestamp}.png`;

                await fs.promises.writeFile(`public/${fileName}`, file.uint8Array);
            }
        }

        if (!fileName) {
            throw new Error('No image was generated from edit');
        }

        return `/${fileName}`;
    } catch (error) {
        console.error('Error editing image:', error);
        throw error;
    }
}