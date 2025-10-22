/**
 * Feature: Browser Event Utilities
 * Purpose: Dispatch CustomEvent safely only in the browser (SSR-safe)
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

export function emitBrowserEvent<T = unknown>(name: string, detail?: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // no-op: defensive guard for environments without CustomEvent
  }
}


