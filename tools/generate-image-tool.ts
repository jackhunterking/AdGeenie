import { tool } from 'ai';
import { z } from 'zod';

export const generateImageTool = tool({
  description: 'Generate 6 unique AI-powered creative variations for a Meta (Facebook/Instagram) ad. Use this when the user wants to create social media advertising images. The tool automatically generates 6 distinct variations with different lighting, angles, and styles. Each variation applies Meta\'s native aesthetic guidelines: super-realistic, natural photography, mobile-optimized composition, and proper safe zones for platform UI elements. Images are generated text-free and unbranded by default unless the user explicitly requests overlays.',
  inputSchema: z.object({
    prompt: z.string().describe('Detailed visual description for the Meta ad creative. Focus on subject, setting, mood, and composition. Be specific about desired realism and authenticity. The AI will automatically create 6 unique variations from this prompt.'),
    brandName: z.string().optional().describe('Brand name to display in the social media preview (not burned into the image)'),
    caption: z.string().optional().describe('Caption text for the social media post preview (not burned into the image)'),
  }),
  // No execute function - tool execution is handled client-side
  // Per AI SDK docs: "execute is optional because you might want to forward 
  // tool calls to the client or to a queue instead of executing them in the same process"
  // This keeps the tool in 'input-available' state until client calls addToolResult
});

