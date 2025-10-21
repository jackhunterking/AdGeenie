/**
 * Feature: Edit Image Tool  
 * Purpose: Direct server-side image editing without confirmation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Gemini 2.5 Flash Image Preview: Model used for image editing
 */

import { tool } from 'ai';
import { z } from 'zod';
import { editImage } from '@/server/images';

export const editImageTool = tool({
  description: 'Edit/modify an existing image directly. Use when user requests changes like "make it warmer", "change background to X", "add more contrast", etc. Executes immediately without confirmation.',
  inputSchema: z.object({
    imageUrl: z.string().describe('The URL of the image to edit'),
    variationIndex: z.number().min(0).max(5).describe('Which variation (0-5) this is from the original set'),
    prompt: z.string().describe('The edit instruction - what changes to make to the image'),
    campaignId: z.string().describe('The campaign ID this image belongs to'),
  }),
  // Server-side execution - DIRECT, no confirmation
  // Per AI SDK docs: Tools with execute functions run automatically
  execute: async ({ imageUrl, prompt, campaignId }) => {
    try {
      console.log(`[editImageTool] Starting direct edit for image: ${imageUrl}`);
      console.log(`[editImageTool] Edit prompt: ${prompt}`);
      
      // Edit the single image using Gemini 2.5 Flash Image Preview
      const editedUrl = await editImage(imageUrl, prompt, campaignId);
      
      console.log(`[editImageTool] ✅ Edit complete: ${editedUrl}`);
      
      return {
        success: true,
        editedImageUrl: editedUrl,
        originalImageUrl: imageUrl,
        editPrompt: prompt,
        message: `Image edited successfully! ${prompt}`,
      };
    } catch (error) {
      console.error('[editImageTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to edit image',
        message: 'Sorry, I encountered an error while editing the image. Please try again.',
      };
    }
  },
});

