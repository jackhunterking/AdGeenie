"use client"

/**
 * Feature: Instant Form mobile mockup
 * Purpose: Render a realistic phone-framed preview of a Meta Instant Form while configuring.
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { cn } from "@/lib/utils"
import { MapPin, Shield, User, Mail, Phone, Check, Pencil, ChevronLeft, ChevronRight, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"

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
  privacyLinkText: string
}

export function InstantFormPhoneMockup({
  formName,
  fields,
  privacyUrl,
  privacyLinkText,
}: InstantFormPhoneMockupProps) {
  const [stage, setStage] = useState(1)
  const totalStages = 3

  const stages = [
    { title: "Prefill information", fields: ["email", "full_name"] },
    { title: "Contact information", fields: ["phone"] },
    { title: "Review", fields: [] },
  ]

  const currentStage = stages[stage - 1]

  const handlePrev = () => {
    setStage((prev) => (prev > 1 ? prev - 1 : totalStages))
  }

  const handleNext = () => {
    setStage((prev) => (prev < totalStages ? prev + 1 : 1))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "ArrowRight") handleNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="mx-auto w-[360px]">
      {/* Device frame - iPhone style */}
      <div className="rounded-[40px] border-[8px] border-[#1c1c1e] bg-[#1c1c1e] shadow-2xl overflow-hidden">
        {/* Status bar with notch */}
        <div className="relative h-8 bg-[#F7F8FA] dark:bg-[#18191A]">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#1c1c1e] rounded-b-[18px]" />
          {/* Status icons */}
          <div className="absolute inset-0 flex items-center justify-between px-6 text-[11px]">
            <span className="text-[#050505] dark:text-white font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2.5 border border-[#050505] dark:border-white rounded-sm" />
            </div>
          </div>
        </div>

        {/* Body - light gray background like Meta */}
        <div className="bg-[#F7F8FA] dark:bg-[#18191A] min-h-[580px] flex flex-col">
          {/* Stage navigation header */}
          <div className="bg-white dark:bg-[#242526] border-b border-[#E4E6EB] dark:border-[#3E4042] p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                className="p-2 hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] rounded-lg transition-colors"
                aria-label="Previous stage"
              >
                <ChevronLeft className="h-5 w-5 text-[#65676B] dark:text-[#B0B3B8]" />
              </button>
              
              <div className="text-center flex-1" aria-live="polite">
                <h2 className="text-base font-semibold text-[#050505] dark:text-[#E4E6EB]">{currentStage.title}</h2>
                <p className="text-xs text-[#65676B] dark:text-[#B0B3B8]">{stage} of {totalStages}</p>
              </div>
              
              <button
                onClick={handleNext}
                className="p-2 hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] rounded-lg transition-colors"
                aria-label="Next stage"
              >
                <ChevronRight className="h-5 w-5 text-[#65676B] dark:text-[#B0B3B8]" />
              </button>
            </div>
          </div>

          {/* Form content */}
          <div className="flex-1 p-4 space-y-4">
            {stage === 3 ? (
              /* Review stage */
              <div className="rounded-xl border border-[#E4E6EB] dark:border-[#3E4042] bg-white dark:bg-[#242526] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-[#65676B] dark:text-[#B0B3B8]" />
                  <h3 className="text-sm font-semibold text-[#050505] dark:text-[#E4E6EB]">Review your information</h3>
                </div>
                <div className="space-y-2 text-sm text-[#65676B] dark:text-[#B0B3B8]">
                  <p>Email: example@email.com</p>
                  <p>Full name: John Doe</p>
                  <p>Phone: +1 234 567 8900</p>
                </div>
              </div>
            ) : (
              /* Field card - Meta style */
              <div className="rounded-xl border border-[#E4E6EB] dark:border-[#3E4042] bg-white dark:bg-[#242526] p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#050505] dark:text-[#E4E6EB]">
                    {stage === 1 ? "Contact information" : "Additional details"}
                  </h3>
                  <Info className="h-4 w-4 text-[#65676B] dark:text-[#B0B3B8]" />
                </div>

                {stage === 1 ? (
                  <div className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="text-[13px] font-normal text-[#65676B] dark:text-[#B0B3B8]">Email</Label>
                      <input
                        className="w-full border-b border-[#CCD0D5] dark:border-[#3E4042] bg-transparent pb-2 text-[16px] text-[#050505] dark:text-[#E4E6EB] placeholder:text-[#8E8E93] focus:outline-none focus:border-[#1877F2] transition-colors"
                        placeholder="Enter your answer."
                        readOnly
                      />
                    </div>

                    {/* Full name */}
                    <div className="space-y-2">
                      <Label className="text-[13px] font-normal text-[#65676B] dark:text-[#B0B3B8]">Full name</Label>
                      <input
                        className="w-full border-b border-[#CCD0D5] dark:border-[#3E4042] bg-transparent pb-2 text-[16px] text-[#050505] dark:text-[#E4E6EB] placeholder:text-[#8E8E93] focus:outline-none focus:border-[#1877F2] transition-colors"
                        placeholder="Enter your answer."
                        readOnly
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Phone */}
                    <div className="space-y-2">
                      <Label className="text-[13px] font-normal text-[#65676B] dark:text-[#B0B3B8]">Phone number</Label>
                      <input
                        className="w-full border-b border-[#CCD0D5] dark:border-[#3E4042] bg-transparent pb-2 text-[16px] text-[#050505] dark:text-[#E4E6EB] placeholder:text-[#8E8E93] focus:outline-none focus:border-[#1877F2] transition-colors"
                        placeholder="Enter your answer."
                        readOnly
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom section */}
          <div className="bg-white dark:bg-[#242526] border-t border-[#E4E6EB] dark:border-[#3E4042] p-4 space-y-4">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-[#E4E6EB] dark:bg-[#3E4042] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1877F2] transition-all duration-300 rounded-full"
                style={{ width: `${(stage / totalStages) * 100}%` }}
              />
            </div>

            {/* Continue button */}
            <button className="w-full h-11 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-[15px] font-semibold shadow-sm transition-colors">
              Continue
            </button>

            {/* Privacy policy */}
            <div className="text-center">
              <a
                href={privacyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#65676B] dark:text-[#B0B3B8] hover:text-[#1877F2] hover:underline transition-colors inline-flex items-center gap-1"
              >
                <Shield className="h-3 w-3" /> {privacyLinkText}
              </a>
            </div>
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


