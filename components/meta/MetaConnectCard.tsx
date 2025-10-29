"use client"

import { Button } from "@/components/ui/button"
import { Link2, CreditCard } from "lucide-react"

export function MetaConnectCard({ mode = 'launch' }: { mode?: 'launch' | 'step' }) {
  const enabled = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ENABLE_META === 'true' : false

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <Link2 className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Meta Connection</h3>
        </div>
      </div>

      <div className="rounded-lg border panel-surface p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="icon-tile-muted rounded-md flex items-center justify-center shrink-0">
            <Link2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Connect Facebook & Instagram</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? 'Click to start Business Login (disabled until rebuild completes).' : 'This feature is currently disabled.'}
            </p>
          </div>
          <Button size="sm" type="button" disabled className="h-8 px-4">
            Connect with Meta
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs">Payment method</span>
          </div>
          <Button size="sm" type="button" disabled>
            Add Payment
          </Button>
        </div>

        {!enabled && (
          <p className="text-[11px] text-muted-foreground">
            Meta integration is disabled. Set NEXT_PUBLIC_ENABLE_META=true to begin the clean rebuild.
          </p>
        )}
      </div>
    </div>
  )
}


