"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, FileText, Check, Calendar } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCampaignContext } from "@/lib/context/campaign-context"

interface LeadForm {
  id: string
  name: string
  created_time: string
}

interface SelectFormTabProps {
  onFormSelected?: (formData: { id: string; name: string }) => void
}

export function SelectFormTab({ onFormSelected }: SelectFormTabProps) {
  const { campaign } = useCampaignContext()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forms, setForms] = useState<LeadForm[]>([])

  useEffect(() => {
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
  }, [campaign?.id])

  const filteredForms = useMemo(() =>
    forms.filter((form) => form.name.toLowerCase().includes(searchQuery.toLowerCase())),
  [forms, searchQuery])

  const selectedForm = useMemo(() => forms.find((f) => f.id === selectedFormId) || null, [forms, selectedFormId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleSelectForm = (formId: string) => {
    setSelectedFormId(formId)
  }

  const handleUseForm = () => {
    if (!selectedFormId) return
    const form = forms.find((f) => f.id === selectedFormId)
    if (form && onFormSelected) {
      onFormSelected({ id: form.id, name: form.name })
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive mb-2">
          {error}
        </div>
      )}

      {/* Forms List */}
      <div className="space-y-2">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : filteredForms.length === 0 ? (
          // Empty state
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">No forms found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Create your first form to get started"}
            </p>
          </div>
        ) : (
          // Forms cards
          filteredForms.map((form) => (
            <button
              key={form.id}
              onClick={() => handleSelectForm(form.id)}
              className={`w-full rounded-lg border p-4 text-left transition-all hover:bg-muted/50 ${
                selectedFormId === form.id ? "border-blue-500 bg-blue-500/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-medium text-foreground">{form.name}</h3>
                    {selectedFormId === form.id && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Fields count not available from list response */}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Created {formatDate(form.created_time)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Selected Form Preview */}
      {selectedForm && (
        <div className="rounded-lg border border-blue-500 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Selected Form</h3>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedForm.name}</p>
              <p className="text-xs text-muted-foreground">Form ID: {selectedForm.id}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Created {formatDate(selectedForm.created_time)}</span>
            </div>
          </div>

          <Button onClick={handleUseForm} className="w-full">
            Use This Form
          </Button>
        </div>
      )}
    </div>
  )
}
