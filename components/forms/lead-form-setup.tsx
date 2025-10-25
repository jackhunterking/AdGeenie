"use client"

/**
 * Feature: Lead Form Two-Column Builder
 * Purpose: Orchestrates Create New vs Select Existing flows with left controls and right live mockup
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Supabase (server auth, not used directly here): https://supabase.com/docs/guides/auth/server/nextjs
 */

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { InstantFormPhoneMockup } from "@/components/forms/instant-form-phone-mockup"
import { LeadFormCreate } from "@/components/forms/lead-form-create"
import { LeadFormExisting } from "@/components/forms/lead-form-existing"
import { cn } from "@/lib/utils"

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

  const tabs = [
    { id: "create", label: "Create New" },
    { id: "existing", label: "Select Existing" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Format Tabs - matching creative/copy style */}
      <div className="flex justify-center pb-4">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          {tabs.map((tabItem) => {
            const isActive = tab === tabItem.id
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id as "create" | "existing")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tabItem.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-4">
          {tab === "create" && (
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
          )}
          {tab === "existing" && (
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
          )}
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

      {/* Change Goal button at bottom */}
      <div className="flex justify-center pt-6 border-t border-border">
        <Button variant="outline" size="lg" onClick={onChangeGoal}>
          Change Goal
        </Button>
      </div>
    </div>
  )
}
