import { tool } from 'ai';
import { z } from 'zod';

export const audienceTargetingTool = tool({
  description: `Set up AI-powered audience targeting based on campaign context from steps BEFORE audience.
  
  CRITICAL - CORRECT FLOW: Creative → Copy → Location → Audience → Goal
  DO NOT consider the campaign goal when generating audience - the goal comes AFTER finding the people.
  
  IMPORTANT: Analyze ONLY the context from previous steps (ad creative, ad copy, locations) to generate a highly relevant audience profile.
  
  Guidelines for audience generation:
  1. Align with ad creative theme - extract business type and target customer from the ad copy
  2. Consider geographic context - urban vs rural, country-specific cultural interests
  3. Use natural language - describe WHO will see the ad, not technical jargon
  4. Derive interests from campaign context, not generic lists
  5. Focus on who would be INTERESTED in this product/service, not what action they'll take (that's the goal's job)
  
  Example Context Analysis:
  - Ad: "Professional Immigration Services in Toronto" + Location: Toronto
    → Description: "Adults in Toronto area interested in immigration services"
    → Interests: immigration services, visa assistance, citizenship, legal services
    → Demographics: 25-45, all genders (working age adults needing services)
  
  - Ad: "Fresh Organic Meal Delivery" + Location: Vancouver suburbs  
    → Description: "Health-conscious families in Vancouver suburbs"
    → Interests: organic food, healthy eating, meal planning, family wellness
    → Demographics: 28-50, focuses on parents
  
  ALWAYS create a description that answers: "Who are these people and why would they be interested in this ad?"`,
  
  inputSchema: z.object({
    mode: z.literal('ai').describe('Always use "ai" for AI Advantage+ targeting'),
    description: z.string().describe('Natural language description of WHO this ad will reach. Must be specific to the campaign context. Format: "People who [characteristic] in [location] looking for [need]"'),
    interests: z.array(z.string()).optional().describe('Interest signals derived from the campaign context (ad copy, business type, goal). Should be specific and relevant, not generic.'),
    demographics: z.object({
      ageMin: z.number().min(18).max(65).optional().describe('Minimum age based on who would need this product/service'),
      ageMax: z.number().min(18).max(65).optional().describe('Maximum age based on who would need this product/service'),
      gender: z.enum(['all', 'male', 'female']).optional().describe('Gender targeting only if the product/service is gender-specific'),
    }).optional().describe('Demographics that make logical sense for this business and campaign goal'),
  }),
  // Server-side execution for audience targeting
  // Returns structured data for client to apply to UI state
  execute: async (input, { toolCallId }) => {
    // Validate and structure the audience data
    const audienceData = {
      mode: input.mode,
      description: input.description,
      interests: input.interests || [],
      demographics: input.demographics || {},
    };
    
    return {
      success: true,
      mode: input.mode,
      description: input.description,
      interests: input.interests,
      demographics: input.demographics,
      toolCallId,
      message: `AI Advantage+ audience configured: ${input.description}`,
    };
  },
});


