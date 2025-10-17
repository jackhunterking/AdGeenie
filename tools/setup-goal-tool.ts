import { tool } from 'ai';
import { z } from 'zod';

export const setupGoalTool = tool({
  description: 'Call this tool IMMEDIATELY when user wants to set up a leads or calls goal. This shows an interactive UI where users can choose to create a new form or use an existing one. Do not ask text questions - the tool handles all interaction.',
  inputSchema: z.object({
    goalType: z.enum(['leads', 'calls']).describe('The type of goal to set up'),
    conversionMethod: z.enum(['instant-forms', 'website', 'calls']).describe('How to collect conversions - use "instant-forms" for leads'),
    formId: z.string().optional().describe('Leave empty - user will select in the UI'),
    formName: z.string().optional().describe('Leave empty - user will select in the UI'),
    createNew: z.boolean().optional().describe('Leave empty - user will select in the UI'),
    explanation: z.string().describe('Brief explanation like "Setting up your leads goal with instant forms"'),
  }),
  // Client-side tool - no execute function, handled in UI
});

