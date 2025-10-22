import { describe, it, expect } from 'vitest';
import { sanitizeParts, sanitizeMessages } from '@/lib/ai/schema';

describe('sanitizeParts', () => {
  it('drops parts without string type', () => {
    const parts = [{}, { type: 123 }, { type: null }];
    expect(sanitizeParts(parts)).toEqual([]);
  });

  it('keeps valid text and reasoning parts', () => {
    const parts = [
      { type: 'text', text: 'hello' },
      { type: 'reasoning', text: 'why' },
    ];
    expect(sanitizeParts(parts)).toEqual(parts);
  });

  it('drops tool-* without toolCallId', () => {
    const parts = [
      { type: 'tool-editImage' },
      { type: 'tool-result' },
    ];
    expect(sanitizeParts(parts)).toEqual([]);
  });

  it('keeps tool-result with toolCallId', () => {
    const parts = [
      { type: 'tool-result', toolCallId: 'abc' },
    ];
    expect(sanitizeParts(parts)).toEqual([{ type: 'tool-result', toolCallId: 'abc' }]);
  });

  it('keeps complete tool-* with output or result', () => {
    const parts = [
      { type: 'tool-editImage', toolCallId: 'x', output: { ok: true } },
      { type: 'tool-regenerateImage', toolCallId: 'y', result: { ok: true } },
    ];
    expect(sanitizeParts(parts)).toEqual(parts);
  });
});

describe('sanitizeMessages', () => {
  it('drops invalid parts but preserves message envelope', () => {
    const msgs = [{ id: 'm1', role: 'assistant', parts: [{}, { type: 'text', text: 'ok' }] } as any];
    const out = sanitizeMessages(msgs);
    expect(out[0].parts).toEqual([{ type: 'text', text: 'ok' }]);
  });
});


