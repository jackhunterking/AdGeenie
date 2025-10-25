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
import { LeadFormSettingsDialog } from "./lead-form-settings-dialog"
import { Info, Shield, Cog, X, Settings } from "lucide-react"

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
  const [locale, setLocale] = useState<string>("en_US")
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
  const [thankYouTitle, setThankYouTitle] = useState<string>("Thanks for your interest!")
  const [thankYouMessage, setThankYouMessage] = useState<string>("We'll contact you within 24 hours")
  const [thankYouButtonText, setThankYouButtonText] = useState<string>("Website visit")
  const [thankYouButtonUrl, setThankYouButtonUrl] = useState<string>("")

  // UI overlays
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [selectDialogOpen, setSelectDialogOpen] = useState<boolean>(false)

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!formName || formName.trim().length < 3) e.formName = "Form name must be at least 3 characters"
    if (formName.length > 100) e.formName = "Form name must be less than 100 characters"
    if (!privacyUrl) e.privacyUrl = "Privacy policy URL is required"
    else if (!privacyUrl.startsWith("https://")) e.privacyUrl = "Privacy policy URL must start with https://"
    if (!privacyLinkText || privacyLinkText.trim().length < 3) e.privacyLinkText = "Link text must be at least 3 characters"
    if (!thankYouButtonText || thankYouButtonText.trim().length < 2) e.thankYouButtonText = "Button label is required"
    else if (thankYouButtonText.length > 60) e.thankYouButtonText = "Button label must be 60 characters or fewer"
    if (thankYouButtonUrl && !thankYouButtonUrl.startsWith("https://")) e.thankYouButtonUrl = "Button URL must start with https://"
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
        locale,
        questions: [{ type: "FULL_NAME" }, { type: "EMAIL" }, { type: "PHONE" }],
        thankYouPage: {
          title: thankYouTitle,
          body: thankYouMessage,
          button_text: thankYouButtonText,
          ...(thankYouButtonUrl && thankYouButtonUrl.startsWith("https://")
            ? { button_type: "VIEW_WEBSITE", button_url: thankYouButtonUrl }
            : { button_type: "VIEW_ON_FACEBOOK" }),
        },
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
    <div className="space-y-6 py-4">
      {/* Segmented control - match ad creative style */}
      <div className="flex justify-center pb-2">
        <div className="inline-flex rounded-lg p-1 bg-card">
          <Button
            variant={mode === "create" ? "default" : "ghost"}
            size="sm"
            className={mode === "create" ? "px-4 bg-[#1877F2] hover:bg-[#166FE5]" : "px-4"}
            onClick={() => setMode("create")}
          >
            Create New
          </Button>
          <Button
            variant={mode === "select" ? "default" : "ghost"}
            size="sm"
            className={mode === "select" ? "px-4 bg-[#1877F2] hover:bg-[#166FE5]" : "px-4"}
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
      <div className="flex flex-col items-center gap-6">
        {/* Title row with settings */}
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">{formName}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
        </div>

        <InstantFormPhoneMockup
          formName={formName}
          fields={mockFields}
          privacyUrl={privacyUrl}
          privacyLinkText={privacyLinkText}
        />

        {/* Primary action with validation feedback */}
        {mode === "create" && (
          <div className="w-[320px] space-y-2">
            {Object.keys(errors).length > 0 && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-500">⚠ Complete required fields</p>
            )}
            {Object.keys(errors).length === 0 && (
              <p className="text-xs text-center text-green-600 dark:text-green-500">✓ Ready to create</p>
            )}
            <Button 
              onClick={handleCreateForm} 
              disabled={Object.keys(errors).length > 0} 
              className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold"
            >
              Create Form
            </Button>
          </div>
        )}
      </div>

      {/* Settings dialog */}
      <LeadFormSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        formName={formName}
        onFormNameChange={setFormName}
        locale={locale}
        onLocaleChange={setLocale}
        useDefaultPrivacy={useDefaultPrivacy}
        onUseDefaultPrivacyChange={setUseDefaultPrivacy}
        privacyUrl={privacyUrl}
        onPrivacyUrlChange={setPrivacyUrl}
        privacyLinkText={privacyLinkText}
        onPrivacyLinkTextChange={setPrivacyLinkText}
        thankYouTitle={thankYouTitle}
        onThankYouTitleChange={setThankYouTitle}
        thankYouMessage={thankYouMessage}
        onThankYouMessageChange={setThankYouMessage}
        thankYouButtonText={thankYouButtonText}
        onThankYouButtonTextChange={setThankYouButtonText}
        thankYouButtonUrl={thankYouButtonUrl}
        onThankYouButtonUrlChange={setThankYouButtonUrl}
        errors={errors}
      />

      {/* Select existing modal */}
      <SelectFormDialog
        open={selectDialogOpen}
        onOpenChange={(o) => setSelectDialogOpen(o)}
        onFormSelected={(d) => {
          setSelectDialogOpen(false)
          onFormSelected(d)
        }}
        onRequestCreate={() => {
          setSelectDialogOpen(false)
          setMode("create")
        }}
      />
    </div>
  )
}


