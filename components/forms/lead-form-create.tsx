"use client"

/**
 * Feature: Lead Form Create (Left Column)
 * Purpose: Accordion inputs for form name, privacy policy, fields, and thank you; confirms creation
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useCampaignContext } from "@/lib/context/campaign-context"

interface FieldDef { id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }

interface LeadFormCreateProps {
  formName: string
  onFormNameChange: (v: string) => void
  privacyUrl: string
  onPrivacyUrlChange: (v: string) => void
  privacyLinkText: string
  onPrivacyLinkTextChange: (v: string) => void
  fields: FieldDef[]
  onFieldsChange: (v: FieldDef[]) => void
  onConfirm: (data: { id: string; name: string }) => void
}

export function LeadFormCreate({
  formName,
  onFormNameChange,
  privacyUrl,
  onPrivacyUrlChange,
  privacyLinkText,
  onPrivacyLinkTextChange,
  fields,
  onFieldsChange,
  onConfirm,
}: LeadFormCreateProps) {
  const { campaign } = useCampaignContext()

  // Thank you state (local only for now)
  const [thankYouTitle, setThankYouTitle] = useState<string>("Thanks for your interest!")
  const [thankYouMessage, setThankYouMessage] = useState<string>("We'll contact you within 24 hours")

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!formName || formName.trim().length < 3) e.formName = "Form name must be at least 3 characters"
    if (!privacyUrl) e.privacyUrl = "Privacy policy URL is required"
    else if (!privacyUrl.startsWith("https://")) e.privacyUrl = "Privacy policy URL must start with https://"
    if (!privacyLinkText || privacyLinkText.trim().length < 3) e.privacyLinkText = "Link text must be at least 3 characters"
    return e
  }, [formName, privacyUrl, privacyLinkText])

  const toggleRequired = (id: string) => {
    onFieldsChange(fields.map(f => f.id === id ? { ...f, required: !f.required } : f))
  }

  const createForm = async () => {
    if (!campaign?.id) return
    if (Object.keys(errors).length > 0) return

    const res = await fetch("/api/meta/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        name: formName,
        privacyPolicy: { url: privacyUrl, link_text: privacyLinkText },
        questions: [{ type: "FULL_NAME" }, { type: "EMAIL" }, { type: "PHONE" }],
        thankYouPage: { title: thankYouTitle, body: thankYouMessage },
      }),
    })
    const json: unknown = await res.json()
    if (!res.ok) return
    const id = (json as { id?: string }).id
    if (!id) return
    onConfirm({ id, name: formName })
  }

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="name">
          <AccordionTrigger>Form name</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Label>Form name</Label>
              <Input value={formName} onChange={(e) => onFormNameChange(e.target.value)} placeholder="Lead Form" />
              {errors.formName && <p className="text-xs text-amber-600">{errors.formName}</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>Privacy policy</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Label>Privacy link text</Label>
              <Input value={privacyLinkText} onChange={(e) => onPrivacyLinkTextChange(e.target.value)} placeholder="Privacy Policy" />
              {errors.privacyLinkText && <p className="text-xs text-amber-600">{errors.privacyLinkText}</p>}
              <Label className="mt-3">Privacy URL</Label>
              <Input value={privacyUrl} onChange={(e) => onPrivacyUrlChange(e.target.value)} placeholder="https://..." />
              {errors.privacyUrl && <p className="text-xs text-amber-600">{errors.privacyUrl}</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fields">
          <AccordionTrigger>Fields</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">Required: {f.required ? "Yes" : "No"}</p>
                  </div>
                  <Switch checked={f.required} onCheckedChange={() => toggleRequired(f.id)} disabled={f.type !== "phone"} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="thankyou">
          <AccordionTrigger>Thank you</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={thankYouTitle} onChange={(e) => setThankYouTitle(e.target.value)} />
              <Label className="mt-2">Message</Label>
              <Input value={thankYouMessage} onChange={(e) => setThankYouMessage(e.target.value)} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button onClick={createForm} disabled={Object.keys(errors).length > 0} className="w-full">Create and select form</Button>
    </div>
  )
}
