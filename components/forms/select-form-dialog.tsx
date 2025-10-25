"use client"

/**
 * Feature: Select Existing Instant Form (Modal)
 * Purpose: Modal dialog for searching and selecting an existing form while the canvas remains visible behind.
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText, Search, Calendar, Check } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCampaignContext } from "@/lib/context/campaign-context"

interface LeadForm { id: string; name: string; created_time: string }

interface SelectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFormSelected: (data: { id: string; name: string }) => void
  onRequestCreate?: () => void
}

export function SelectFormDialog({ open, onOpenChange, onFormSelected, onRequestCreate }: SelectFormDialogProps) {
  const { campaign } = useCampaignContext()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forms, setForms] = useState<LeadForm[]>([])

  useEffect(() => {
    if (!open) return
    const fetchForms = async () => {
      if (!campaign?.id) return
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/meta/forms?campaignId=${encodeURIComponent(campaign.id)}`)
        const json: unknown = await res.json()
        if (!res.ok) {
          const msg = typeof (json as { error?: string }).error === 'string' ? (json as { error?: string }).error! : 'Failed to load forms'
          throw new Error(msg)
        }
        const data = (json as { forms?: LeadForm[] }).forms
        setForms(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load forms')
        setForms([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchForms()
  }, [open, campaign?.id])

  const filteredForms = useMemo(() => forms.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase())), [forms, searchQuery])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Select Existing Form</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1877F2]" />
          <Input placeholder="Search forms..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive mb-2">{error}</div>
        )}

        {/* List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : filteredForms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center space-y-3">
              <FileText className="h-8 w-8 text-[#1877F2] mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No forms yet</p>
              <p className="text-xs text-muted-foreground mb-4">{searchQuery ? "No results match your search." : "Create your first instant form to capture leads."}</p>
              {!searchQuery && (
                <Button onClick={onRequestCreate} className="h-9 bg-[#1877F2] hover:bg-[#166FE5] text-white">
                  Create New
                </Button>
              )}
            </div>
          ) : (
            filteredForms.map((form) => (
              <button
                key={form.id}
                onClick={() => setSelectedFormId(form.id)}
                className={`w-full rounded-lg border p-4 text-left transition-all hover:bg-muted/50 ${selectedFormId === form.id ? "border-[#1877F2] bg-[#1877F2]/5" : "border-border bg-card"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#1877F2]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-[#1877F2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground">{form.name}</h3>
                      {selectedFormId === form.id && <Check className="h-4 w-4 text-[#1877F2] flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDate(form.created_time)}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#1877F2]/10 text-[#1877F2] text-[10px] font-medium">
                        3 fields
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="pt-3">
          <Button
            onClick={() => {
              const form = forms.find((f) => f.id === selectedFormId)
              if (form) onFormSelected({ id: form.id, name: form.name })
            }}
            disabled={!selectedFormId}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5]"
          >
            Use This Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


