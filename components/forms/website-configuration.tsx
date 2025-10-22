/**
 * Feature: Website Visits Goal Configuration
 * Purpose: Form for configuring website destination URL
 * References:
 *  - AI SDK: https://ai-sdk.dev/elements/overview
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGoal } from "@/lib/context/goal-context"
import { CheckCircle2, Check, AlertCircle } from "lucide-react"

export function WebsiteConfiguration() {
  const { setFormData, goalState } = useGoal()
  const [websiteUrl, setWebsiteUrl] = useState(goalState.formData?.websiteUrl || "")
  const [error, setError] = useState("")

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
      websiteUrl,
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

