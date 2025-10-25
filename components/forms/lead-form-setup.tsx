"use client"

/**
 * Feature: Lead Form Two-Column Builder
 * Purpose: Orchestrates Create New vs Select Existing flows with left controls and right live mockup
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Supabase (server auth, not used directly here): https://supabase.com/docs/guides/auth/server/nextjs
 */

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { InstantFormPhoneMockup } from "@/components/forms/instant-form-phone-mockup"
import { LeadFormCreate } from "@/components/forms/lead-form-create"
import { LeadFormExisting } from "@/components/forms/lead-form-existing"

interface SelectedFormData {
  id: string
  name: string
}

interface LeadFormSetupProps {
  onFormSelected: (form: SelectedFormData) => void
  onChangeGoal: () => void
}

export function LeadFormSetup({ onFormSelected, onChangeGoal }: LeadFormSetupProps) {
  const [tab, setTab] = useState<"create" | "existing">("create")

  // Shared preview state for Create tab
  const [formName, setFormName] = useState<string>("Lead Form")
  const [privacyUrl, setPrivacyUrl] = useState<string>("https://adpilot.studio/general-privacy-policy")
  const [privacyLinkText, setPrivacyLinkText] = useState<string>("Privacy Policy")
  const [fields, setFields] = useState<Array<{ id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }>>([
    { id: "full", type: "full_name", label: "Full Name", required: true },
    { id: "email", type: "email", label: "Email Address", required: true },
    { id: "phone", type: "phone", label: "Phone Number", required: true },
  ])

  const mockFields = useMemo(() => fields.map(f => ({ ...f })), [fields])

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky header with Change Goal */}
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "existing")}> 
          <TabsList>
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="existing">Select Existing</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" onClick={onChangeGoal}>Change Goal</Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "existing")}> 
            <TabsContent value="create" className="m-0">
              <LeadFormCreate
                formName={formName}
                onFormNameChange={setFormName}
                privacyUrl={privacyUrl}
                onPrivacyUrlChange={setPrivacyUrl}
                privacyLinkText={privacyLinkText}
                onPrivacyLinkTextChange={setPrivacyLinkText}
                fields={fields}
                onFieldsChange={setFields}
                onConfirm={(created) => onFormSelected(created)}
              />
            </TabsContent>
            <TabsContent value="existing" className="m-0">
              <LeadFormExisting
                onPreview={(preview) => {
                  // When previewing existing, optionally mirror to right
                  setFormName(preview.name)
                  setPrivacyUrl(preview.privacyUrl || "")
                  setPrivacyLinkText(preview.privacyLinkText || "Privacy Policy")
                  setFields(preview.fields)
                }}
                onConfirm={(existing) => onFormSelected(existing)}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - Live mockup */}
        <div className="flex items-start justify-center">
          <InstantFormPhoneMockup
            formName={formName}
            fields={mockFields}
            privacyUrl={privacyUrl}
            privacyLinkText={privacyLinkText}
          />
        </div>
      </div>
    </div>
  )
}
