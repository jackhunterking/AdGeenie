/**
 * Feature: Overlay Layout Engine
 * Purpose: Compute text overlay frames within safe zones and responsive sizing
 * References:
 *  - WCAG Contrast: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

export interface Frame { x: number; y: number; width: number; height: number }

export interface LayoutInput {
  canvasWidth: number
  canvasHeight: number
  safeZonePct: number // e.g., 0.1 for 10%
  layoutHint: 'top' | 'center' | 'bottom' | 'left' | 'right' | 'center-left' | 'center-right'
}

export function computeSafeFrame({ canvasWidth, canvasHeight, safeZonePct }: LayoutInput): Frame {
  const insetX = Math.round(canvasWidth * safeZonePct)
  const insetY = Math.round(canvasHeight * safeZonePct)
  return {
    x: insetX,
    y: insetY,
    width: canvasWidth - insetX * 2,
    height: canvasHeight - insetY * 2,
  }
}

export function positionBlock(safe: Frame, hint: LayoutInput['layoutHint'], blockHeight: number): Frame {
  const width = safe.width
  const height = Math.min(blockHeight, safe.height)

  switch (hint) {
    case 'top':
      return { x: safe.x, y: safe.y, width, height }
    case 'bottom':
      return { x: safe.x, y: safe.y + safe.height - height, width, height }
    case 'center-left':
      return { x: safe.x, y: safe.y + Math.round((safe.height - height) / 2), width: Math.round(width * 0.6), height }
    case 'center-right':
      return { x: safe.x + Math.round(width * 0.4), y: safe.y + Math.round((safe.height - height) / 2), width: Math.round(width * 0.6), height }
    case 'left':
      return { x: safe.x, y: safe.y, width: Math.round(width * 0.6), height }
    case 'right':
      return { x: safe.x + Math.round(width * 0.4), y: safe.y, width: Math.round(width * 0.6), height }
    default:
      return { x: safe.x, y: safe.y + Math.round((safe.height - height) / 2), width, height }
  }
}


