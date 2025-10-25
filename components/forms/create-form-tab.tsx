"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Info, User, Mail, Phone, Smartphone } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { Switch } from "@/components/ui/switch"
import { InstantFormPhoneMockup } from "./instant-form-phone-mockup"

interface CreateFormTabProps {
  onFormCreated?: (formData: { id: string; name: string }) => void
}

export function CreateFormTab({ onFormCreated }: CreateFormTabProps) {
  const { campaign } = useCampaignContext()
  const [formName, setFormName] = useState("")
  const [useDefaultPrivacy, setUseDefaultPrivacy] = useState(true)
  const defaultPrivacyUrl = "https://adpilot.studio/general-privacy-policy"
  const [privacyUrl, setPrivacyUrl] = useState(defaultPrivacyUrl)
  const [privacyLinkText, setPrivacyLinkText] = useState("Privacy Policy")
  const [thankYouOpen, setThankYouOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [locale, setLocale] = useState("en_US")

  // Thank you page fields
  const [thankYouTitle, setThankYouTitle] = useState("Thanks for your interest!")
  const [thankYouMessage, setThankYouMessage] = useState("We'll contact you within 24 hours")
  const [thankYouButtonText, setThankYouButtonText] = useState("Visit Website")
  const [thankYouButtonUrl, setThankYouButtonUrl] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formName || formName.length < 3) {
      newErrors.formName = "Form name must be at least 3 characters"
    }
    if (formName.length > 100) {
      newErrors.formName = "Form name must be less than 100 characters"
    }

    if (!privacyUrl) {
      newErrors.privacyUrl = "Privacy policy URL is required"
    } else if (!privacyUrl.startsWith("https://")) {
      newErrors.privacyUrl = "Privacy policy URL must start with https://"
    }

    if (!privacyLinkText || privacyLinkText.length < 3) {
      newErrors.privacyLinkText = "Link text must be at least 3 characters"
    }

    if (thankYouButtonUrl && !thankYouButtonUrl.startsWith("https://")) {
      newErrors.thankYouButtonUrl = "Button URL must start with https://"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateForm = async () => {
    if (!validateForm()) return

    setIsCreating(true)
    setError(null)
    try {
      if (!campaign?.id) throw new Error('Missing campaignId')
      const res = await fetch('/api/meta/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          name: formName,
          privacyPolicy: { url: privacyUrl, link_text: privacyLinkText },
          locale,
          questions: [{ type: "FULL_NAME" }, { type: "EMAIL" }, { type: "PHONE" }],
          thankYouPage: thankYouOpen
            ? {
                title: thankYouTitle,
                body: thankYouMessage,
                button_text: thankYouButtonText,
                button_url: thankYouButtonUrl,
              }
            : undefined,
        }),
      })
      const json: unknown = await res.json()
      if (!res.ok) {
        const msg = typeof (json as { error?: string }).error === 'string' ? (json as { error?: string }).error! : 'Failed to create form'
        throw new Error(msg)
      }
      const id = (json as { id?: string }).id
      if (!id) throw new Error('Form ID not returned')
      if (onFormCreated) {
        onFormCreated({ id, name: formName })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create form')
    } finally {
      setIsCreating(false)
    }
  }

  // live mockup props derived from state
  const mockupFields = [
    { id: "full", type: "full_name" as const, label: "Full Name", required: true },
    { id: "email", type: "email" as const, label: "Email Address", required: true },
    { id: "phone", type: "phone" as const, label: "Phone Number", required: true },
  ]

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {/* Two-column: config left, live mockup right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* Form Name */}
          <div className="space-y-2">
        <Label htmlFor="form-name" className="text-sm font-medium text-foreground">
          Form Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="form-name"
          placeholder="e.g., Toronto Home Buyers Lead"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          maxLength={100}
          className={errors.formName ? "border-red-500" : ""}
        />
        {errors.formName && <p className="text-xs text-red-500">{errors.formName}</p>}
        <p className="text-xs text-muted-foreground">{formName.length}/100 characters</p>
          </div>

          {/* Privacy Policy Section */}
          <div className="rounded-lg border border-blue-500/20 p-4 space-y-3 bg-transparent">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <Label className="text-sm font-medium text-foreground">
              Privacy Policy <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">Required by Meta for all lead forms</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-foreground">Use default privacy policy</Label>
            <div className="flex items-center gap-2">
              <Switch checked={useDefaultPrivacy} onCheckedChange={(v) => {
                setUseDefaultPrivacy(v)
                if (v) setPrivacyUrl(defaultPrivacyUrl)
              }} />
            </div>
          </div>

          <Label htmlFor="privacy-url" className="text-xs text-foreground">
            Privacy Policy URL
          </Label>
          <Input
            id="privacy-url"
            placeholder="https://yourdomain.com/privacy"
            value={privacyUrl}
            onChange={(e) => setPrivacyUrl(e.target.value)}
            disabled={useDefaultPrivacy}
            className={errors.privacyUrl ? "border-red-500" : ""}
          />
          {errors.privacyUrl && <p className="text-xs text-red-500">{errors.privacyUrl}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="privacy-link-text" className="text-xs text-foreground">
            Link Text
          </Label>
          <Input
            id="privacy-link-text"
            placeholder="Privacy Policy"
            value={privacyLinkText}
            onChange={(e) => setPrivacyLinkText(e.target.value)}
            maxLength={50}
            className={errors.privacyLinkText ? "border-red-500" : ""}
          />
          {errors.privacyLinkText && <p className="text-xs text-red-500">{errors.privacyLinkText}</p>}
        </div>
          </div>

          {/* Form Fields Preview */}
          <div className="rounded-lg border border-blue-500/20 p-4 space-y-3 bg-transparent">
        <Label className="text-sm font-medium text-foreground">Form Fields</Label>
        <p className="text-xs text-muted-foreground">This form will collect:</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <span>Full Name</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <span>Email Address</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <span>Phone Number</span>
          </div>
        </div>
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-muted-foreground">Custom fields coming soon</AlertDescription>
        </Alert>
          </div>

          {/* Thank You Page Section */}
          <Collapsible open={thankYouOpen} onOpenChange={setThankYouOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {thankYouOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Label className="text-sm font-medium text-foreground cursor-pointer">Thank You Page (Optional)</Label>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-blue-500/20 p-4 space-y-3 bg-transparent">
            <div className="space-y-2">
              <Label htmlFor="thank-you-title" className="text-xs text-foreground">
                Title
              </Label>
              <Input
                id="thank-you-title"
                placeholder="Thanks for your interest!"
                value={thankYouTitle}
                onChange={(e) => setThankYouTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thank-you-message" className="text-xs text-foreground">
                Message
              </Label>
              <Textarea
                id="thank-you-message"
                placeholder="We'll contact you within 24 hours"
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thank-you-button-text" className="text-xs text-foreground">
                Button Text
              </Label>
              <Input
                id="thank-you-button-text"
                placeholder="Visit Website"
                value={thankYouButtonText}
                onChange={(e) => setThankYouButtonText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thank-you-button-url" className="text-xs text-foreground">
                Button URL
              </Label>
              <Input
                id="thank-you-button-url"
                placeholder="https://yourdomain.com"
                value={thankYouButtonUrl}
                onChange={(e) => setThankYouButtonUrl(e.target.value)}
                className={errors.thankYouButtonUrl ? "border-red-500" : ""}
              />
              {errors.thankYouButtonUrl && <p className="text-xs text-red-500">{errors.thankYouButtonUrl}</p>}
            </div>
          </div>
        </CollapsibleContent>
          </Collapsible>

          {/* Advanced Settings */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="w-full">
          
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="locale" className="text-xs text-foreground">
                Locale
              </Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_US">English (US) - en_US</SelectItem>
                  <SelectItem value="en_GB">English (UK) - en_GB</SelectItem>
                  <SelectItem value="en_CA">English (Canada) - en_CA</SelectItem>
                  <SelectItem value="fr_CA">French (Canada) - fr_CA</SelectItem>
                  <SelectItem value="es_ES">Spanish (Spain) - es_ES</SelectItem>
                  <SelectItem value="es_MX">Spanish (Mexico) - es_MX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Right column: live phone mockup */}
        <div className="hidden md:block">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Live mobile preview</p>
            </div>
            <InstantFormPhoneMockup
              formName={formName || "Lead Form"}
              fields={mockupFields}
              privacyUrl={privacyUrl}
              thankYouTitle={thankYouTitle}
              thankYouMessage={thankYouMessage}
              showThankYou={false}
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex pt-2">
        <Button
          onClick={handleCreateForm}
          disabled={isCreating || !formName || !privacyUrl}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isCreating ? "Creating..." : "Create Form"}
        </Button>
      </div>
    </div>
  )
}
