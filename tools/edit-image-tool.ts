import { tool } from 'ai';
import { z } from 'zod';

export const editImageTool = tool({
  description: 'Edit an existing image based on a text prompt. Use this when the user wants to modify, change, enhance, or make changes to an existing image.',
  inputSchema: z.object({
    imageUrl: z.string().describe('The URL or path of the image to edit'),
    prompt: z.string().describe('The detailed prompt describing what changes to make to the image'),
  }),
  // No execute - client-side tool requiring user interaction
});

