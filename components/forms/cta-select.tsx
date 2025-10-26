/**
 * Feature: CTA Selection
 * Purpose: Reusable selector for ad call-to-action based on goal
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Meta Ads: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action/
 */

"use client"

import { useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useGoal } from "@/lib/context/goal-context"

const WEBSITE_CTAS = [
  "Learn More",
  "Shop Now",
  "Get Offer",
  "Sign Up",
  "Subscribe",
  "Contact Us",
  "Apply Now",
  "Book Now",
  "Download",
] as const

export function CTASelect() {
  const { adContent, setAdContent } = useAdPreview()
  const { goalState } = useGoal()

  const goal = goalState.selectedGoal
  const isCalls = goal === 'calls'
  const isWebsite = goal === 'website-visits'

  const current = adContent?.cta || (isCalls ? 'Call Now' : 'Learn More')

  const options = useMemo(() => {
    if (isCalls) return ["Call Now"] as const
    if (isWebsite) return WEBSITE_CTAS
    return WEBSITE_CTAS
  }, [isCalls, isWebsite])

  const handleChange = (value: string) => {
    setAdContent(prev => ({
      ...(prev ?? { headline: "", body: "", cta: "", imageVariations: [] }),
      cta: value,
    }))
  }

  return (
    <div className="space-y-2">
      <Label>Call to Action</Label>
      <Select value={current} onValueChange={handleChange} disabled={isCalls}>
        <SelectTrigger>
          <SelectValue placeholder="Select CTA" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCalls && (
        <p className="text-xs text-muted-foreground">CTA is fixed to Call Now for call ads.</p>
      )}
    </div>
  )
}


