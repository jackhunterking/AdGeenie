"use client"

import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAdPreview } from '@/lib/context/ad-preview-context'
import { formatDistanceToNow } from 'date-fns'

export function SaveIndicator() {
  const { isSaving, lastSaved, saveError } = useAdPreview()
  
  if (saveError) {
    return (
      <div className="text-xs text-red-500 flex items-center gap-1.5 animate-in fade-in">
        <XCircle className="w-3.5 h-3.5" />
        <span>Failed to save</span>
      </div>
    )
  }
  
  if (isSaving) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    )
  }
  
  if (lastSaved) {
    return (
      <div className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1.5 animate-in fade-in">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
      </div>
    )
  }
  
  return null
}

