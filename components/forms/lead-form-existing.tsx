"use client"

/**
 * Feature: Lead Form Existing (Left Column)
 * Purpose: Lists Facebook Instant Forms for the selected Page, allows preview and confirmation
 * References:
 *  - Facebook Graph API leadgen_forms: https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 */

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText, Search, Calendar, Check } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { MetaConnectStep } from "@/components/meta-connect-step"

interface LeadForm { id: string; name: string; created_time?: string }

interface PreviewData {
  id: string
  name: string
  privacyUrl?: string
  privacyLinkText?: string
  fields: Array<{ id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }>
}

interface LeadFormExistingProps {
  onPreview: (data: PreviewData) => void
  onConfirm: (data: { id: string; name: string }) => void
}

export function LeadFormExisting({ onPreview, onConfirm }: LeadFormExistingProps) {
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
        if (!res.ok) throw new Error((json as { error?: string }).error || 'Failed to load forms')
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

  const filteredForms = useMemo(() => forms.filter((f) => (f.name || '').toLowerCase().includes(searchQuery.toLowerCase())), [forms, searchQuery])

  const requestPreview = async (id: string) => {
    if (!campaign?.id) return
    try {
      const res = await fetch(`/api/meta/instant-forms/${encodeURIComponent(id)}?campaignId=${encodeURIComponent(campaign.id)}`)
      const json: unknown = await res.json()
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Failed to load form detail')
      const detail = json as {
        id: string
        name: string
        questions?: Array<{ type?: string }>
        privacy_policy_url?: string
        privacy_link_text?: string
      }

      const fields: PreviewData['fields'] = []
      const q = Array.isArray(detail.questions) ? detail.questions : []
      const map: Record<string, PreviewData['fields'][number]> = {
        FULL_NAME: { id: 'full', type: 'full_name', label: 'Full Name', required: true },
        EMAIL: { id: 'email', type: 'email', label: 'Email Address', required: true },
        PHONE: { id: 'phone', type: 'phone', label: 'Phone Number', required: true },
      }
      q.forEach((qq) => {
        const t = typeof qq.type === 'string' ? qq.type.toUpperCase() : ''
        if (map[t]) fields.push(map[t])
      })
      if (fields.length === 0) {
        fields.push(map.FULL_NAME, map.EMAIL, map.PHONE)
      }

      onPreview({
        id: detail.id,
        name: detail.name,
        privacyUrl: detail.privacy_policy_url,
        privacyLinkText: detail.privacy_link_text || 'Privacy Policy',
        fields,
      })
    } catch (e) {
      // noop preview failure
    }
  }

  const showConnect = !isLoading && forms.length === 0

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1877F2]" />
        <Input placeholder="Search forms..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : filteredForms.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center space-y-3">
              <FileText className="h-8 w-8 text-[#1877F2] mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No forms found</p>
              <p className="text-xs text-muted-foreground mb-3">{searchQuery ? "Try adjusting your search" : "Create your first form to get started"}</p>
            </div>
            {showConnect && (
              <div className="rounded-lg border border-border bg-card p-4">
                <MetaConnectStep />
              </div>
            )}
          </div>
        ) : (
          filteredForms.map((form) => (
            <button
              key={form.id}
              onClick={() => {
                setSelectedFormId(form.id)
                requestPreview(form.id)
              }}
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
                  {form.created_time && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(form.created_time).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <Button
        onClick={() => {
          const form = forms.find((f) => f.id === selectedFormId)
        	if (form) onConfirm({ id: form.id, name: form.name })
        }}
        disabled={!selectedFormId}
        className="w-full"
      >
        Use this form
      </Button>
    </div>
  )
}
