"use client"

import { X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AudienceContextCardProps {
  currentAudience: {
    demographics?: string
    interests?: string | null
  }
  onDismiss: () => void
}

export function AudienceContextCard({ currentAudience, onDismiss }: AudienceContextCardProps) {
  return (
    <div className="mx-4 mb-4 mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
              👥 Updating Who Sees Your Ad
            </p>
            <div className="text-xs text-cyan-700 dark:text-cyan-300 space-y-0.5">
              <p>Currently: <span className="font-medium">{currentAudience.demographics || "General audience"}</span></p>
              {currentAudience.interests && (
                <p>Interested in: <span className="font-medium">{currentAudience.interests}</span></p>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-cyan-500/10 flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Quick Suggestions */}
      <div className="mt-3 pt-3 border-t border-cyan-500/20">
        <p className="text-xs text-cyan-600 dark:text-cyan-400 mb-2">💡 Try asking:</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
            "Make them younger"
          </span>
          <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
            "Focus on families"
          </span>
          <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
            "Exclude students"
          </span>
        </div>
      </div>
    </div>
  )
}

