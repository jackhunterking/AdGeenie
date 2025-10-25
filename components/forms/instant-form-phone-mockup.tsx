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
    <div className="mx-auto w-[340px]">
      {/* Device frame - iPhone style */}
      <div className="rounded-[40px] border-[8px] border-[#1c1c1e] bg-[#1c1c1e] shadow-2xl overflow-hidden">
        {/* Status bar with notch */}
        <div className="relative h-8 bg-white dark:bg-[#000000]">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#1c1c1e] rounded-b-[18px]" />
          {/* Status icons */}
          <div className="absolute inset-0 flex items-center justify-between px-6 text-[11px]">
            <span className="text-black dark:text-white font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2.5 border border-black dark:border-white rounded-sm" />
            </div>
          </div>
        </div>

        {/* Header with Meta gradient */}
        <div className="relative h-28 bg-gradient-to-b from-[#4267B2] to-[#5890FF]">
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-white drop-shadow-md" />
          </div>
        </div>

        {/* Form Body - Meta native style */}
        <div className="bg-white dark:bg-[#242526] p-4 space-y-4">
          <div className="text-base font-semibold text-[#050505] dark:text-[#E4E6EB] flex items-center gap-1.5 group">
            <button
              type="button"
              className={cn("text-left", editable && "hover:text-[#1877F2] transition-colors")}
              onClick={editable ? onTitleClick : undefined}
            >
              {formName}
            </button>
            {editable && (
              <Pencil className="h-3.5 w-3.5 text-[#65676B] opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>

          {showThankYou ? (
            <div className="rounded-xl border border-[#E4E6EB] dark:border-[#3E4042] bg-[#F0F2F5] dark:bg-[#3A3B3C] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-[#31A24C]" />
                <p className="text-base font-semibold text-[#050505] dark:text-[#E4E6EB]">{thankYouTitle}</p>
              </div>
              <p className="text-sm text-[#65676B] dark:text-[#B0B3B8]">{thankYouMessage}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5 group">
                  <label className="text-[13px] font-medium text-[#65676B] dark:text-[#B0B3B8] flex items-center gap-1.5">
                    {f.type === "full_name" && <User className="h-3.5 w-3.5" />}
                    {f.type === "email" && <Mail className="h-3.5 w-3.5" />}
                    {f.type === "phone" && <Phone className="h-3.5 w-3.5" />}
                    <button
                      type="button"
                      className={cn("text-left", editable && "hover:text-[#1877F2] transition-colors")}
                      onClick={editable ? () => onFieldClick && onFieldClick(f.id) : undefined}
                    >
                      {f.label}
                    </button>
                    {f.required && <span className="text-[#FA383E]">*</span>}
                    {editable && (
                      <Pencil className="h-3 w-3 text-[#65676B] opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    )}
                  </label>
                  <input
                    className={cn(
                      "w-full h-11 rounded-lg border border-[#CCD0D5] dark:border-[#3E4042]",
                      "bg-[#F0F2F5] dark:bg-[#3A3B3C] px-3 text-[15px] text-[#050505] dark:text-[#E4E6EB]",
                      "placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent",
                      "transition-all"
                    )}
                    placeholder="Enter your answer."
                    readOnly
                  />
                </div>
              ))}

              <button className="mt-4 w-full h-11 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-[15px] font-semibold shadow-sm transition-colors">
                Submit
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-[#CCD0D5] dark:border-[#3E4042]">
            {editable ? (
              <button
                type="button"
                onClick={onPrivacyClick}
                className="inline-flex items-center gap-1.5 text-[10px] text-[#65676B] dark:text-[#B0B3B8] hover:text-[#1877F2] transition-colors"
              >
                <Shield className="h-3 w-3" /> Privacy Policy
              </button>
            ) : (
              <a
                href={privacyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] text-[#65676B] dark:text-[#B0B3B8] hover:text-[#1877F2] hover:underline transition-colors"
              >
                <Shield className="h-3 w-3" /> Privacy Policy
              </a>
            )}
          </div>
        </div>

        {/* Home indicator - iPhone style */}
        <div className="h-6 bg-white dark:bg-[#242526] flex items-center justify-center">
          <div className="w-32 h-1 bg-[#1c1c1e] dark:bg-[#3E4042] rounded-full" />
        </div>
      </div>
    </div>
  )
}


