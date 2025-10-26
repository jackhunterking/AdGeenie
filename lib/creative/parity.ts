/**
 * Feature: Square→Vertical Parity Helpers
 * Purpose: Ensure the vertical render preserves the exact square image while extending canvas
 */

export interface ParityConfig {
  verticalWidthPct?: number // fraction of vertical width for inner square (default ~82%)
}

export function getVerticalContainers(cfg: ParityConfig = {}) {
  const innerPct = Math.max(60, Math.min(95, Math.round((cfg.verticalWidthPct ?? 82))))
  return {
    backgroundImgClass: 'w-full h-full object-cover blur-lg scale-110 opacity-70',
    overlayGradientClass: 'absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60',
    innerSquareWrapperClass: 'absolute inset-0 flex items-center justify-center p-3',
    innerSquareClass: `aspect-square w-[${innerPct}%] max-w-[${innerPct}%] rounded-md overflow-hidden shadow-md`,
    innerSquareImgClass: 'w-full h-full object-contain bg-black/20',
  }
}


