/**
 * Feature: AI Gateway Provider
 * Purpose: AI SDK v5 automatically uses AI Gateway when AI_GATEWAY_API_KEY is set
 * References:
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/providers-and-models
 * 
 * IMPORTANT: AI SDK v5 has built-in AI Gateway support!
 * When AI_GATEWAY_API_KEY is set, just pass model strings like 'openai/gpt-4o'
 * and AI SDK automatically routes through AI Gateway - no manual configuration needed!
 */

// ============================================
// AI Gateway Configuration
// ============================================

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;

// Check if AI Gateway is configured
const isGatewayEnabled = Boolean(AI_GATEWAY_API_KEY);

if (!isGatewayEnabled) {
  console.warn('[AI Gateway] ⚠️  Not configured - AI_GATEWAY_API_KEY not found');
  console.warn('[AI Gateway] Set AI_GATEWAY_API_KEY in .env.local for observability and routing');
  console.warn('[AI Gateway] Get your key from: https://vercel.com/dashboard → AI Gateway');
} else {
  console.log('[AI Gateway] ✅ Enabled - AI SDK will automatically route requests through gateway');
  console.log('[AI Gateway] API Key detected:', AI_GATEWAY_API_KEY?.substring(0, 15) + '...');
}

// ============================================
// Model Resolution
// ============================================

/**
 * Get a model by ID
 * 
 * AI SDK v5 Pattern: Just return the model string!
 * AI SDK automatically uses AI Gateway when AI_GATEWAY_API_KEY is set.
 * 
 * Supported formats:
 * - openai/gpt-4o
 * - openai/gpt-4-turbo
 * - anthropic/claude-3-5-sonnet-20241022
 * - anthropic/claude-3-opus-20240229
 * 
 * Reference: https://vercel.com/docs/ai-gateway/getting-started#set-up-your-application
 */
export function getModel(modelId: string) {
  // Validate model ID format
  const [provider, ...modelParts] = modelId.split('/');
  const modelName = modelParts.join('/');

  if (!modelName) {
    throw new Error(`Invalid model ID format: ${modelId}. Expected format: provider/model-name`);
  }

  // Log for debugging
  console.log(`[AI Gateway] Using model: ${modelId}${isGatewayEnabled ? ' (via AI Gateway)' : ' (direct)'}`);

  // Just return the model string - AI SDK handles the rest!
  return modelId;
}

/**
 * Get the default chat model
 * Can be configured via environment variable
 */
export function getDefaultChatModel() {
  return process.env.DEFAULT_CHAT_MODEL || 'openai/gpt-4o';
}

// ============================================
// Model Information
// ============================================

export const SUPPORTED_MODELS = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
} as const;

/**
 * Check if a model supports specific features
 */
export function getModelCapabilities(modelId: string) {
  const [provider, modelName] = modelId.split('/');

  return {
    supportsVision: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-5-sonnet',
    ].some(m => modelName?.includes(m)),
    
    supportsTools: true, // All modern models support tools
    
    supportsReasoning: modelName?.includes('o1'),
    
    supportsStreaming: !modelName?.includes('o1'), // o1 models don't support streaming
    
    maxTokens: modelName?.includes('o1') 
      ? 100000 
      : modelName?.includes('gpt-4')
      ? 128000
      : modelName?.includes('claude-3')
      ? 200000
      : 4096,
  };
}

/**
 * Check if AI Gateway is properly configured
 */
export function isGatewayConfigured(): boolean {
  return isGatewayEnabled;
}

