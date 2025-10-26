/**
 * Feature: Website Visits Goal Configuration
 * Purpose: Form for configuring website destination URL
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGoal } from "@/lib/context/goal-context"
import { CheckCircle2, Check, AlertCircle, Link, Tags } from "lucide-react"

export function WebsiteConfiguration() {
  const { setFormData, goalState } = useGoal()
  const [websiteUrl, setWebsiteUrl] = useState(goalState.formData?.websiteUrl || "")
  const [error, setError] = useState("")
  const [enableUtm, setEnableUtm] = useState(Boolean(goalState.formData?.utm))
  const [utm, setUtm] = useState({
    source: goalState.formData?.utm?.source || "facebook",
    medium: goalState.formData?.utm?.medium || "cpc",
    campaign: goalState.formData?.utm?.campaign || "adpilot",
    term: goalState.formData?.utm?.term || "",
    content: goalState.formData?.utm?.content || "",
  })

  const finalUrl = useMemo(() => {
    try {
      const url = new URL(websiteUrl)
      if (enableUtm) {
        url.searchParams.set('utm_source', utm.source)
        url.searchParams.set('utm_medium', utm.medium)
        url.searchParams.set('utm_campaign', utm.campaign)
        if (utm.term) url.searchParams.set('utm_term', utm.term)
        if (utm.content) url.searchParams.set('utm_content', utm.content)
      }
      return url.toString()
    } catch {
      return websiteUrl
    }
  }, [websiteUrl, enableUtm, utm.campaign, utm.content, utm.medium, utm.source, utm.term])

  const validateUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSave = () => {
    if (!websiteUrl) {
      setError("Website URL is required")
      return
    }

    if (!validateUrl(websiteUrl)) {
      setError("Please enter a valid URL (including http:// or https://)")
      return
    }

    setError("")
    setFormData({
      websiteUrl: finalUrl,
      utm: enableUtm ? utm : undefined,
    })
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold">Website Configuration</h3>
        <p className="text-muted-foreground">
          Enter the destination URL for your ad
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://www.example.com"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value)
              setError("")
            }}
          />
          <p className="text-xs text-muted-foreground">
            Enter the full URL where you want to drive traffic
          </p>
        </div>

        {/* UTM Builder */}
        <div className="space-y-3 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Tags className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="utmToggle"
                type="checkbox"
                checked={enableUtm}
                onChange={(e) => setEnableUtm(e.target.checked)}
              />
              <Label htmlFor="utmToggle" className="text-sm cursor-pointer">Append UTM parameters</Label>
            </div>
          </div>
          {enableUtm && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="utm_source" className="text-xs">utm_source</Label>
                <Input id="utm_source" value={utm.source} onChange={(e) => setUtm(prev => ({...prev, source: e.target.value}))} />
              </div>
              <div>
                <Label htmlFor="utm_medium" className="text-xs">utm_medium</Label>
                <Input id="utm_medium" value={utm.medium} onChange={(e) => setUtm(prev => ({...prev, medium: e.target.value}))} />
              </div>
              <div>
                <Label htmlFor="utm_campaign" className="text-xs">utm_campaign</Label>
                <Input id="utm_campaign" value={utm.campaign} onChange={(e) => setUtm(prev => ({...prev, campaign: e.target.value}))} />
              </div>
              <div>
                <Label htmlFor="utm_term" className="text-xs">utm_term (optional)</Label>
                <Input id="utm_term" value={utm.term} onChange={(e) => setUtm(prev => ({...prev, term: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="utm_content" className="text-xs">utm_content (optional)</Label>
                <Input id="utm_content" value={utm.content} onChange={(e) => setUtm(prev => ({...prev, content: e.target.value}))} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link className="h-3.5 w-3.5" />
            <span className="truncate">Final URL: <span className="font-mono">{finalUrl}</span></span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {websiteUrl && validateUrl(websiteUrl) && !error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-600">Valid URL format</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={!websiteUrl}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Check className="h-4 w-4 mr-2" />
        Save Configuration
      </Button>
    </div>
  )
}

