"use client"

/**
 * Feature: Instant Form mobile mockup
 * Purpose: Render a realistic phone-framed preview of a Meta Instant Form while configuring.
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { cn } from "@/lib/utils"
import { MapPin, Shield, User, Mail, Phone, Check, Pencil } from "lucide-react"

interface MockField {
  id: string
  type: "full_name" | "email" | "phone"
  label: string
  required: boolean
}

interface InstantFormPhoneMockupProps {
  formName: string
  fields: MockField[]
  privacyUrl: string
  thankYouTitle: string
  thankYouMessage: string
  showThankYou?: boolean
  editable?: boolean
  onTitleClick?: () => void
  onFieldClick?: (id: string) => void
  onPrivacyClick?: () => void
}

export function InstantFormPhoneMockup({
  formName,
  fields,
  privacyUrl,
  thankYouTitle,
  thankYouMessage,
  showThankYou = false,
  editable = false,
  onTitleClick,
  onFieldClick,
  onPrivacyClick,
}: InstantFormPhoneMockupProps) {
  return (
    <div className="mx-auto w-[320px]">
      {/* Device frame */}
      <div className="rounded-[32px] border border-border bg-background shadow-xl overflow-hidden">
        {/* Status bar */}
        <div className="h-6 bg-background/80" />

        {/* Map header */}
        <div className="relative h-32 bg-muted">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/40 to-blue-700/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Body */}
        <div className="p-3 space-y-3">
          <div className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              className={cn("text-left", editable && "hover:underline")}
              onClick={editable ? onTitleClick : undefined}
            >
              {formName}
            </button>
            {editable && (
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>

          {showThankYou ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium">{thankYouTitle}</p>
              </div>
              <p className="text-xs text-muted-foreground">{thankYouMessage}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((f) => (
                <div key={f.id} className="space-y-1">
                  <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    {f.type === "full_name" && <User className="h-3 w-3" />}
                    {f.type === "email" && <Mail className="h-3 w-3" />}
                    {f.type === "phone" && <Phone className="h-3 w-3" />}
                    <button
                      type="button"
                      className={cn("text-left", editable && "hover:underline")}
                      onClick={editable ? () => onFieldClick && onFieldClick(f.id) : undefined}
                    >
                      {f.label}
                    </button>
                    {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    className={cn(
                      "w-full h-8 rounded-md border border-border bg-background px-2 text-[12px]",
                      "placeholder:text-muted-foreground/70"
                    )}
                    placeholder={f.label}
                    readOnly
                  />
                </div>
              ))}

              <button className="mt-2 w-full h-9 rounded-md bg-blue-600 text-white text-[12px] font-semibold">
                Submit
              </button>
            </div>
          )}

          <div className="pt-2">
            {editable ? (
              <button
                type="button"
                onClick={onPrivacyClick}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Shield className="h-3 w-3" /> Privacy Policy
              </button>
            ) : (
              <a
                href={privacyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Shield className="h-3 w-3" /> Privacy Policy
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


