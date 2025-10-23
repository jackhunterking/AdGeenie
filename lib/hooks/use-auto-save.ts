import { useEffect, useRef, useCallback, useState } from 'react'

export interface UseAutoSaveOptions {
  immediate?: boolean      // No debounce for critical data
  debounceMs?: number      // Delay for non-critical data
  retries?: number         // Number of retry attempts
  onSaveStart?: () => void
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
}

export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  options: UseAutoSaveOptions = {}
) {
  const {
    immediate = false,
    debounceMs = 300,
    retries = 3,
    onSaveStart,
    onSaveSuccess,
    onSaveError
  } = options

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const pendingSaveRef = useRef<Promise<void> | null>(null)
  const lastDataRef = useRef<T>(data)
  const mountedRef = useRef(true)

  // Stringify for deep comparison (prevents infinite loops)
  const dataString = JSON.stringify(data)

  const performSave = useCallback(async () => {
    if (!mountedRef.current) return

    setIsSaving(true)
    setError(null)
    onSaveStart?.()

    let lastError: Error | null = null

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const savePromise = saveFn(data)
        pendingSaveRef.current = savePromise
        await savePromise

        if (mountedRef.current) {
          setLastSaved(new Date())
          setIsSaving(false)
          onSaveSuccess?.()
          console.log('✅ Auto-save complete')
        }
        return // Success!

      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Save failed')
        console.error(`❌ Save attempt ${attempt}/${retries} failed:`, lastError)

        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } finally {
        pendingSaveRef.current = null
      }
    }

    // All retries exhausted
    if (mountedRef.current && lastError) {
      setError(lastError)
      setIsSaving(false)
      onSaveError?.(lastError)
    }
  }, [data, dataString, retries, onSaveStart, onSaveSuccess, onSaveError, saveFn])

  // Trigger save on data change
  useEffect(() => {
    if (JSON.stringify(lastDataRef.current) === dataString) return
    lastDataRef.current = data

    if (immediate) {
      performSave() // No debounce
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(performSave, debounceMs)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [data, dataString, immediate, debounceMs, performSave])

  // BeforeUnload: Flush pending saves
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        e.preventDefault()
        e.returnValue = 'Saving your changes...'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { isSaving, lastSaved, error }
}

