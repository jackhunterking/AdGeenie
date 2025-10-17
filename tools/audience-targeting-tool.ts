import { tool } from 'ai';
import { z } from 'zod';

export const audienceTargetingTool = tool({
  description: `Set up AI-powered audience targeting (Advantage+) for Meta ads. This uses Meta's AI to automatically find and optimize the best audience.
  
  The AI can optionally receive interest signals or demographic hints to guide initial targeting, but will expand automatically for best results.
  
  Examples:
  - "Set up audience targeting" → Basic AI Advantage+ with no restrictions
  - "Target young professionals interested in fitness" → AI targeting with interest signals
  - "Target women aged 25-45 interested in home decor" → AI with demographics and interests`,
  
  inputSchema: z.object({
    mode: z.literal('ai').describe('Always use "ai" for AI Advantage+ targeting'),
    description: z.string().describe('Brief description of the targeting strategy in conversational tone'),
    interests: z.array(z.string()).optional().describe('Optional interest signals for AI to use as starting points (e.g., ["fitness", "wellness", "yoga"])'),
    demographics: z.object({
      ageMin: z.number().min(18).max(65).optional().describe('Minimum age (18-65)'),
      ageMax: z.number().min(18).max(65).optional().describe('Maximum age (18-65)'),
      gender: z.enum(['all', 'male', 'female']).optional().describe('Gender targeting'),
      languages: z.array(z.string()).optional().describe('Language preferences'),
    }).optional().describe('Optional demographic hints for AI'),
  }),
  // Client-side tool - no execute function
});


