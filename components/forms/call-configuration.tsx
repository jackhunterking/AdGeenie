/**
 * Feature: Call Goal Configuration
 * Purpose: Form for configuring call tracking setup
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGoal } from "@/lib/context/goal-context"
import { Phone, Check } from "lucide-react"

export function CallConfiguration() {
  const { setFormData, goalState } = useGoal()
  const [phoneNumber, setPhoneNumber] = useState(goalState.formData?.phoneNumber || "")
  const [countryCode, setCountryCode] = useState(goalState.formData?.countryCode || "+1")
  const [callTracking, setCallTracking] = useState(goalState.formData?.callTracking || false)

  const handleSave = () => {
    setFormData({
      phoneNumber,
      countryCode,
      callTracking,
    })
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <Phone className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold">Call Configuration</h3>
        <p className="text-muted-foreground">
          Set up your phone number for call tracking
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="countryCode">Country Code</Label>
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger id="countryCode">
              <SelectValue placeholder="Select country code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+1">+1 (US/Canada)</SelectItem>
              <SelectItem value="+44">+44 (UK)</SelectItem>
              <SelectItem value="+61">+61 (Australia)</SelectItem>
              <SelectItem value="+81">+81 (Japan)</SelectItem>
              <SelectItem value="+49">+49 (Germany)</SelectItem>
              <SelectItem value="+33">+33 (France)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="(555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the phone number people should call
          </p>
        </div>

        <div className="flex items-center space-x-2 p-4 rounded-lg border">
          <input
            type="checkbox"
            id="callTracking"
            checked={callTracking}
            onChange={(e) => setCallTracking(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="callTracking" className="text-sm cursor-pointer">
            Enable call tracking (recommended)
          </Label>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={!phoneNumber}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Check className="h-4 w-4 mr-2" />
        Save Configuration
      </Button>
    </div>
  )
}

