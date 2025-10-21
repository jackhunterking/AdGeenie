export interface AutoSaveConfig {
  immediate: boolean
  debounceMs: number
  retries: number
}

export const AUTO_SAVE_CONFIGS = {
  CRITICAL: { immediate: true, debounceMs: 0, retries: 5 } as AutoSaveConfig,
  NORMAL: { immediate: false, debounceMs: 300, retries: 3 } as AutoSaveConfig,
  LOW_PRIORITY: { immediate: false, debounceMs: 1000, retries: 2 } as AutoSaveConfig,
}

