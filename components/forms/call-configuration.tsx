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

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGoal } from "@/lib/context/goal-context"
import { Phone, Check, Clock, AlertCircle } from "lucide-react"

export function CallConfiguration() {
  const { setFormData, goalState } = useGoal()
  const [phoneNumber, setPhoneNumber] = useState(goalState.formData?.phoneNumber || "")
  const [countryCode, setCountryCode] = useState(goalState.formData?.countryCode || "+1")
  const [callTracking, setCallTracking] = useState(goalState.formData?.callTracking || false)
  const [error, setError] = useState("")

  const [businessHours, setBusinessHours] = useState(() => {
    const existing = goalState.formData?.businessHours
    return existing ?? {
      mon: { enabled: true, start: "09:00", end: "17:00" },
      tue: { enabled: true, start: "09:00", end: "17:00" },
      wed: { enabled: true, start: "09:00", end: "17:00" },
      thu: { enabled: true, start: "09:00", end: "17:00" },
      fri: { enabled: true, start: "09:00", end: "17:00" },
      sat: { enabled: false, start: "10:00", end: "14:00" },
      sun: { enabled: false, start: "10:00", end: "14:00" },
    }
  })

  const e164 = useMemo(() => new RegExp(/^\+?[1-9]\d{1,14}$/), [])

  const fullPhone = useMemo(() => {
    const trimmed = phoneNumber.replace(/\s|\-|\(|\)/g, "")
    const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`
    // If user already typed with country code, avoid double prefixing
    if (trimmed.startsWith("+")) return trimmed
    return `${cc}${trimmed}`
  }, [phoneNumber, countryCode])

  const handleSave = () => {
    // Validate E.164
    if (!e164.test(fullPhone)) {
      setError("Enter a valid phone in international format (e.g., +15551234567)")
      return
    }

    // Validate business hours windows
    const validHours = Object.values(businessHours).every((d) => {
      if (!d.enabled) return true
      return d.start < d.end
    })
    if (!validHours) {
      setError("Business hours must have start time before end time")
      return
    }

    setError("")
    setFormData({
      phoneNumber: fullPhone,
      countryCode,
      callTracking,
      businessHours,
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
            Enter the local phone; we will format to international E.164.
          </p>
          {phoneNumber && (
            <p className="text-xs text-muted-foreground">Formatted: <span className="font-mono">{fullPhone}</span></p>
          )}
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

        {/* Business Hours */}
        <div className="space-y-3 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Business Hours (optional)</p>
              <p className="text-xs text-muted-foreground">We’ll favor call delivery during these windows.</p>
            </div>
          </div>
          {([
            ['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat'],['sun','Sun']
          ] as const).map(([key, label]) => {
            const day = businessHours[key]
            return (
              <div key={key} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-2 text-xs">{label}</div>
                <div className="col-span-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => setBusinessHours(prev => ({...prev, [key]: { ...prev[key], enabled: e.target.checked }}))}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    type="time"
                    value={day.start}
                    onChange={(e) => setBusinessHours(prev => ({...prev, [key]: { ...prev[key], start: e.target.value }}))}
                    disabled={!day.enabled}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    type="time"
                    value={day.end}
                    onChange={(e) => setBusinessHours(prev => ({...prev, [key]: { ...prev[key], end: e.target.value }}))}
                    disabled={!day.enabled}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
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

