import { tool } from 'ai';
import { z } from 'zod';

export const generateImageTool = tool({
  description: 'Generate a professional Meta (Facebook/Instagram) ad creative. Use this when the user wants to create social media advertising images. The tool will automatically apply Meta\'s native aesthetic guidelines: super-realistic, natural photography, mobile-optimized composition, and proper safe zones for platform UI elements. Images are generated text-free and unbranded by default unless the user explicitly requests overlays.',
  inputSchema: z.object({
    prompt: z.string().describe('Detailed visual description for the Meta ad creative. Focus on subject, setting, mood, and composition. Be specific about desired realism and authenticity.'),
    brandName: z.string().optional().describe('Brand name to display in the social media preview (not burned into the image)'),
    caption: z.string().optional().describe('Caption text for the social media post preview (not burned into the image)'),
  }),
  // No execute - client-side tool requiring user interaction
});

