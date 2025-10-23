/**
 * Feature: Variation Index Utilities
 * Purpose: Normalize between 1-based variationNumber and 0-based variationIndex
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

export type VariationRef = { variationIndex?: number; variationNumber?: number } | null | undefined;

export function toZeroBasedIndex(ref: VariationRef): number | undefined {
  if (!ref) return undefined;
  const idx = (ref as { variationIndex?: unknown }).variationIndex;
  if (typeof idx === 'number' && Number.isInteger(idx) && idx >= 0) return idx;
  const num = (ref as { variationNumber?: unknown }).variationNumber;
  if (typeof num === 'number' && Number.isInteger(num)) {
    const zero = num - 1;
    return zero >= 0 ? zero : undefined;
  }
  return undefined;
}


