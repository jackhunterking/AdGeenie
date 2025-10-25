"use client"

/**
 * Feature: Lead Form Settings Dialog
 * Purpose: Comprehensive settings modal with tabs for General, Privacy, Fields, and Thank You configuration
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Shield, User, Mail, Phone } from "lucide-react"

interface LeadFormSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  
  // General
  formName: string
  onFormNameChange: (value: string) => void
  locale: string
  onLocaleChange: (value: string) => void
  
  // Privacy
  useDefaultPrivacy: boolean
  onUseDefaultPrivacyChange: (value: boolean) => void
  privacyUrl: string
  onPrivacyUrlChange: (value: string) => void
  privacyLinkText: string
  onPrivacyLinkTextChange: (value: string) => void
  
  // Thank You
  thankYouTitle: string
  onThankYouTitleChange: (value: string) => void
  thankYouMessage: string
  onThankYouMessageChange: (value: string) => void
  thankYouButtonText: string
  onThankYouButtonTextChange: (value: string) => void
  thankYouButtonUrl: string
  onThankYouButtonUrlChange: (value: string) => void
  
  // Validation errors
  errors: Record<string, string>
}

export function LeadFormSettingsDialog({
  open,
  onOpenChange,
  formName,
  onFormNameChange,
  locale,
  onLocaleChange,
  useDefaultPrivacy,
  onUseDefaultPrivacyChange,
  privacyUrl,
  onPrivacyUrlChange,
  privacyLinkText,
  onPrivacyLinkTextChange,
  thankYouTitle,
  onThankYouTitleChange,
  thankYouMessage,
  onThankYouMessageChange,
  thankYouButtonText,
  onThankYouButtonTextChange,
  thankYouButtonUrl,
  onThankYouButtonUrlChange,
  errors,
}: LeadFormSettingsDialogProps) {
  const defaultPrivacyUrl = "https://adpilot.studio/general-privacy-policy"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Lead Form Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="thankyou">Thank You</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="settings-form-name">
                  Form Name <span className="text-[#FA383E]">*</span>
                </Label>
                <Input
                  id="settings-form-name"
                  value={formName}
                  onChange={(e) => onFormNameChange(e.target.value)}
                  maxLength={100}
                  placeholder="e.g., Toronto Home Buyers Lead"
                />
                {errors.formName && <p className="text-xs text-red-500">{errors.formName}</p>}
                <p className="text-xs text-muted-foreground">{formName.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-locale">Locale</Label>
                <Select value={locale} onValueChange={onLocaleChange}>
                  <SelectTrigger id="settings-locale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="en_GB">English (UK)</SelectItem>
                    <SelectItem value="en_CA">English (Canada)</SelectItem>
                    <SelectItem value="fr_CA">French (Canada)</SelectItem>
                    <SelectItem value="es_ES">Spanish (Spain)</SelectItem>
                    <SelectItem value="es_MX">Spanish (Mexico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-4 mt-0">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-[#65676B] dark:text-[#B0B3B8] flex gap-2">
                <Info className="h-4 w-4 text-[#1877F2] flex-shrink-0 mt-0.5" />
                <span>Privacy policy is required by Meta for all lead forms</span>
              </div>

              <div className="flex items-center justify-between">
                <Label>Use default privacy policy</Label>
                <Switch
                  checked={useDefaultPrivacy}
                  onCheckedChange={(v) => {
                    onUseDefaultPrivacyChange(v)
                    if (v) onPrivacyUrlChange(defaultPrivacyUrl)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-privacy-url">
                  Privacy Policy URL <span className="text-[#FA383E]">*</span>
                </Label>
                <Input
                  id="settings-privacy-url"
                  value={privacyUrl}
                  onChange={(e) => onPrivacyUrlChange(e.target.value)}
                  disabled={useDefaultPrivacy}
                  placeholder="https://yourdomain.com/privacy"
                />
                {errors.privacyUrl && <p className="text-xs text-red-500">{errors.privacyUrl}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-privacy-link">Link Text</Label>
                <Input
                  id="settings-privacy-link"
                  value={privacyLinkText}
                  onChange={(e) => onPrivacyLinkTextChange(e.target.value)}
                  maxLength={50}
                  placeholder="Privacy Policy"
                />
                {errors.privacyLinkText && <p className="text-xs text-red-500">{errors.privacyLinkText}</p>}
              </div>
            </TabsContent>

            {/* Fields Tab */}
            <TabsContent value="fields" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground">This form will collect the following information:</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="h-8 w-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#1877F2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Full Name</p>
                    <p className="text-xs text-muted-foreground">Required by Meta</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="h-8 w-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-[#1877F2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-xs text-muted-foreground">Required by Meta</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="h-8 w-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-[#1877F2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Phone Number</p>
                    <p className="text-xs text-muted-foreground">Required</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-[#65676B] dark:text-[#B0B3B8] flex gap-2">
                <Info className="h-4 w-4 text-[#1877F2] flex-shrink-0 mt-0.5" />
                <span>Custom fields coming soon</span>
              </div>
            </TabsContent>

            {/* Thank You Tab */}
            <TabsContent value="thankyou" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-6">
                {/* Left: Form inputs */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="settings-ty-title">Title</Label>
                    <Input
                      id="settings-ty-title"
                      value={thankYouTitle}
                      onChange={(e) => onThankYouTitleChange(e.target.value)}
                      placeholder="Thanks for your interest!"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settings-ty-message">Message</Label>
                    <Input
                      id="settings-ty-message"
                      value={thankYouMessage}
                      onChange={(e) => onThankYouMessageChange(e.target.value)}
                      placeholder="We'll contact you within 24 hours"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settings-ty-btn">Button Text</Label>
                    <Input
                      id="settings-ty-btn"
                      value={thankYouButtonText}
                      onChange={(e) => onThankYouButtonTextChange(e.target.value)}
                      placeholder="Visit Website"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settings-ty-url">Button URL</Label>
                    <Input
                      id="settings-ty-url"
                      value={thankYouButtonUrl}
                      onChange={(e) => onThankYouButtonUrlChange(e.target.value)}
                      placeholder="https://yourdomain.com"
                    />
                    {errors.thankYouButtonUrl && <p className="text-xs text-red-500">{errors.thankYouButtonUrl}</p>}
                  </div>
                </div>

                {/* Right: Native preview */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <div className="rounded-xl border border-border bg-white dark:bg-[#242526] p-6 space-y-4">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#1877F2] to-[#5890FF] flex items-center justify-center text-white text-2xl font-bold">
                        U
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-[#050505] dark:text-[#E4E6EB]">
                          {thankYouTitle || "Thanks for your interest!"}
                        </h3>
                        <p className="text-sm text-[#65676B] dark:text-[#B0B3B8]">
                          {thankYouMessage || "We'll contact you within 24 hours"}
                        </p>
                      </div>
                      <div className="w-full rounded-lg border border-[#E4E6EB] dark:border-[#3E4042] bg-[#F0F2F5] dark:bg-[#3A3B3C] p-3 text-xs text-[#65676B] dark:text-[#B0B3B8] flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-[#1877F2] flex-shrink-0 mt-0.5" />
                        <span>You successfully submitted your responses.</span>
                      </div>
                      {thankYouButtonText && (
                        <button className="w-full h-10 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-semibold transition-colors">
                          {thankYouButtonText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

