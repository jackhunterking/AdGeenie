/**
 * Feature: Design Lint & Auto-Repair
 * Purpose: Validate contrast, overflow, and safe zones; provide simple repair suggestions
 */

export function relativeLuminance(hex: string): number {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16) / 255
  const g = parseInt(c.substring(2, 4), 16) / 255
  const b = parseInt(c.substring(4, 6), 16) / 255
  const toLin = (u: number) => (u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const L1 = relativeLuminance(fgHex)
  const L2 = relativeLuminance(bgHex)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function passesAA(fgHex: string, bgHex: string, minRatio = 4.5): boolean {
  return contrastRatio(fgHex, bgHex) >= minRatio
}

export interface OverflowCheckInput {
  frameWidth: number
  frameHeight: number
  estimatedTextHeight: number
}

export function hasOverflow(input: OverflowCheckInput): boolean {
  return input.estimatedTextHeight > input.frameHeight
}

export function suggestPaletteSwap(fg: string, bg: string): { fg: string; bg: string } {
  // Simple swap to increase contrast: if contrast low, try black/white fallbacks
  const highContrastPairs: Array<{ fg: string; bg: string }> = [
    { fg: '#000000', bg: '#FFFFFF' },
    { fg: '#FFFFFF', bg: '#000000' },
    { fg: '#111111', bg: '#F6F7F9' },
    { fg: '#0A0A0A', bg: '#FFFFFF' },
  ]
  for (const pair of highContrastPairs) {
    if (passesAA(pair.fg, pair.bg)) return pair
  }
  return { fg, bg }
}


