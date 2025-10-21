/**
 * Feature: Regenerate Image Tool  
 * Purpose: Regenerate 6 new variations directly without confirmation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Gemini 2.5 Flash Image Preview: Model used for image generation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateImage } from '@/server/images';

export const regenerateImageTool = tool({
  description: 'Regenerate 6 new image variations using the same or modified prompt. Use when user says "regenerate", "create more variations", "try again", "generate new versions", etc. Executes immediately without confirmation.',
  inputSchema: z.object({
    prompt: z.string().describe('The prompt to use for regeneration (can be the original or a modified version)'),
    campaignId: z.string().describe('The campaign ID to associate the new images with'),
    brandName: z.string().optional().describe('Brand name for metadata'),
    caption: z.string().optional().describe('Caption for metadata'),
  }),
  // Server-side execution - DIRECT, no confirmation
  // Generates all 6 variations automatically
  execute: async ({ prompt, campaignId, brandName, caption }) => {
    try {
      console.log(`[regenerateImageTool] Starting direct regeneration`);
      console.log(`[regenerateImageTool] Prompt: ${prompt}`);
      console.log(`[regenerateImageTool] Campaign: ${campaignId}`);
      
      // Generate 6 new variations using Gemini 2.5 Flash Image Preview
      const imageUrls = await generateImage(prompt, campaignId, 6);
      
      console.log(`[regenerateImageTool] ✅ Generated ${imageUrls.length} new variations`);
      
      return {
        success: true,
        imageUrls,
        count: imageUrls.length,
        prompt,
        brandName,
        caption,
        message: `Successfully generated ${imageUrls.length} new variations!`,
      };
    } catch (error) {
      console.error('[regenerateImageTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate images',
        message: 'Sorry, I encountered an error while regenerating images. Please try again.',
      };
    }
  },
});

