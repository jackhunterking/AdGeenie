"use client"

/**
 * Feature: Instant Forms – Canvas-first builder
 * Purpose: Single-canvas phone mockup with inline editing and top segmented control
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InstantFormPhoneMockup } from "./instant-form-phone-mockup"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { SelectFormDialog } from "./select-form-dialog"
import { Info, Shield, Cog, X } from "lucide-react"

type FieldType = "full_name" | "email" | "phone"

interface FieldDef {
  id: string
  type: FieldType
  label: string
  required: boolean
}

interface InstantFormCanvasProps {
  onFormSelected: (data: { id: string; name: string }) => void
}

export function InstantFormCanvas({ onFormSelected }: InstantFormCanvasProps) {
  const { campaign } = useCampaignContext()

  // Segmented control state
  const [mode, setMode] = useState<"create" | "select">("create")

  // Form state
  const [formName, setFormName] = useState<string>("Lead Form")
  const defaultPrivacyUrl = "https://adpilot.studio/general-privacy-policy"
  const [useDefaultPrivacy, setUseDefaultPrivacy] = useState<boolean>(true)
  const [privacyUrl, setPrivacyUrl] = useState<string>(defaultPrivacyUrl)
  const [privacyLinkText, setPrivacyLinkText] = useState<string>("Privacy Policy")

  const [fields, setFields] = useState<FieldDef[]>([
    { id: "full", type: "full_name", label: "Full Name", required: true },
    { id: "email", type: "email", label: "Email Address", required: true },
    { id: "phone", type: "phone", label: "Phone Number", required: true },
  ])

  // Thank you configuration
  const [thankYouOpen, setThankYouOpen] = useState<boolean>(false)
  const [thankYouTitle, setThankYouTitle] = useState<string>("Thanks for your interest!")
  const [thankYouMessage, setThankYouMessage] = useState<string>("We'll contact you within 24 hours")
  const [thankYouButtonText, setThankYouButtonText] = useState<string>("Visit Website")
  const [thankYouButtonUrl, setThankYouButtonUrl] = useState<string>("")

  // UI overlays
  const [editingTitle, setEditingTitle] = useState<boolean>(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [privacyOpen, setPrivacyOpen] = useState<boolean>(false)
  const [selectDialogOpen, setSelectDialogOpen] = useState<boolean>(false)

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!formName || formName.trim().length < 3) e.formName = "Form name must be at least 3 characters"
    if (formName.length > 100) e.formName = "Form name must be less than 100 characters"
    if (!privacyUrl) e.privacyUrl = "Privacy policy URL is required"
    else if (!privacyUrl.startsWith("https://")) e.privacyUrl = "Privacy policy URL must start with https://"
    if (!privacyLinkText || privacyLinkText.trim().length < 3) e.privacyLinkText = "Link text must be at least 3 characters"
    if (thankYouButtonUrl && !thankYouButtonUrl.startsWith("https://")) {
      e.thankYouButtonUrl = "Button URL must start with https://"
    }
    return e
  }, [formName, privacyLinkText, privacyUrl, thankYouButtonUrl])

  const handleToggleRequired = (id: string) => {
    setFields((prev) => prev.map((f) => {
      if (f.id !== id) return f
      if (f.type === "full_name" || f.type === "email") return f
      return { ...f, required: !f.required }
    }))
  }

  const handleFieldLabelChange = (id: string, label: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, label } : f)))
  }

  const handleCreateForm = async () => {
    if (Object.keys(errors).length > 0) return
    if (!campaign?.id) return
    const res = await fetch("/api/meta/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        name: formName,
        privacyPolicy: { url: privacyUrl, link_text: privacyLinkText },
        locale: "en_US",
        questions: [{ type: "FULL_NAME" }, { type: "EMAIL" }, { type: "PHONE" }],
        thankYouPage: thankYouOpen
          ? { title: thankYouTitle, body: thankYouMessage, button_text: thankYouButtonText, button_url: thankYouButtonUrl }
          : undefined,
      }),
    })
    const json: unknown = await res.json()
    if (!res.ok) {
      // Surfacing failure inline would need a toast; for now, simply return
      return
    }
    const id = (json as { id?: string }).id
    if (!id) return
    onFormSelected({ id, name: formName })
  }

  // Derived fields for mockup
  const mockFields = fields.map((f) => ({ id: f.id, type: f.type, label: f.label, required: f.required }))

  return (
    <div className="space-y-4">
      {/* Segmented control */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          <Button
            variant={mode === "create" ? "default" : "ghost"}
            size="sm"
            className="px-4"
            onClick={() => setMode("create")}
          >
            Create New
          </Button>
          <Button
            variant={mode === "select" ? "default" : "ghost"}
            size="sm"
            className="px-4"
            onClick={() => {
              setMode("select")
              setSelectDialogOpen(true)
            }}
          >
            Select Existing
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex flex-col items-center gap-4">
        {/* Title row with gear for thank-you */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingTitle(true)}
            className="text-sm font-semibold text-foreground hover:underline"
            aria-label="Edit form title"
          >
            {formName}
          </button>
          <button
            onClick={() => setThankYouOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-border p-1 hover:bg-muted"
            aria-label="Thank you settings"
          >
            <Cog className="h-4 w-4" />
          </button>
        </div>

        <InstantFormPhoneMockup
          formName={formName}
          fields={mockFields}
          privacyUrl={privacyUrl}
          thankYouTitle={thankYouTitle}
          thankYouMessage={thankYouMessage}
          showThankYou={false}
          editable
          onTitleClick={() => setEditingTitle(true)}
          onFieldClick={(id) => setEditingFieldId(id)}
          onPrivacyClick={() => setPrivacyOpen(true)}
        />

        {/* Primary action */}
        {mode === "create" && (
          <Button onClick={handleCreateForm} disabled={Object.keys(errors).length > 0} className="w-[320px]">
            Create Form
          </Button>
        )}
      </div>

      {/* Edit title dialog */}
      <Dialog open={editingTitle} onOpenChange={setEditingTitle}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Form Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} maxLength={100} />
            {errors.formName && <p className="text-xs text-red-500">{errors.formName}</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit field dialog */}
      <Dialog open={editingFieldId !== null} onOpenChange={(o) => setEditingFieldId(o ? editingFieldId : null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Field</DialogTitle>
          </DialogHeader>
          {editingFieldId && (
            <div className="space-y-3">
              {(() => {
                const f = fields.find((x) => x.id === editingFieldId)
                if (!f) return null
                const isCore = f.type === "full_name" || f.type === "email"
                return (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Label</Label>
                      <Input
                        value={f.label}
                        onChange={(e) => handleFieldLabelChange(f.id, e.target.value)}
                        disabled={isCore}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Required</Label>
                      <Switch
                        checked={f.required}
                        onCheckedChange={() => handleToggleRequired(f.id)}
                        disabled={isCore}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Privacy dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Use default privacy policy</Label>
              <Switch
                checked={useDefaultPrivacy}
                onCheckedChange={(v) => {
                  setUseDefaultPrivacy(v)
                  if (v) setPrivacyUrl(defaultPrivacyUrl)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="privacy-url">Privacy Policy URL</Label>
              <Input
                id="privacy-url"
                placeholder="https://yourdomain.com/privacy"
                value={privacyUrl}
                onChange={(e) => setPrivacyUrl(e.target.value)}
                disabled={useDefaultPrivacy}
              />
              {errors.privacyUrl && <p className="text-xs text-red-500">{errors.privacyUrl}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="privacy-link">Link Text</Label>
              <Input
                id="privacy-link"
                placeholder="Privacy Policy"
                value={privacyLinkText}
                onChange={(e) => setPrivacyLinkText(e.target.value)}
                maxLength={50}
              />
              {errors.privacyLinkText && <p className="text-xs text-red-500">{errors.privacyLinkText}</p>}
            </div>
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2 text-xs text-muted-foreground flex gap-2">
              <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5" /> Required by Meta for all lead forms
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thank you dialog */}
      <Dialog open={thankYouOpen} onOpenChange={setThankYouOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Thank You Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ty-title">Title</Label>
              <Input id="ty-title" value={thankYouTitle} onChange={(e) => setThankYouTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ty-body">Message</Label>
              <Input id="ty-body" value={thankYouMessage} onChange={(e) => setThankYouMessage(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ty-btn">Button Text</Label>
              <Input id="ty-btn" value={thankYouButtonText} onChange={(e) => setThankYouButtonText(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ty-url">Button URL</Label>
              <Input id="ty-url" value={thankYouButtonUrl} onChange={(e) => setThankYouButtonUrl(e.target.value)} />
              {errors.thankYouButtonUrl && <p className="text-xs text-red-500">{errors.thankYouButtonUrl}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Select existing modal */}
      <SelectFormDialog
        open={selectDialogOpen}
        onOpenChange={(o) => setSelectDialogOpen(o)}
        onFormSelected={(d) => {
          setSelectDialogOpen(false)
          onFormSelected(d)
        }}
      />
    </div>
  )
}


