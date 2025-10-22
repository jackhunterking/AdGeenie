import { describe, it, expect } from 'vitest';
import { deriveEditDescription } from '@/components/ai-elements/tool-renderers';

describe('deriveEditDescription', () => {
  it('extracts car color phrase', () => {
    expect(deriveEditDescription('make the car blue')).toContain('changed to blue');
  });
  it('falls back when no match', () => {
    expect(deriveEditDescription('increase contrast')).toBe("Here's the updated image:");
  });
});


