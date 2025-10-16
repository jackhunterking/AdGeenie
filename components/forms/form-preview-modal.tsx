"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Smartphone } from "lucide-react"

interface FormPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formName: string
  privacyLinkText: string
  thankYouTitle?: string
}

export function FormPreviewModal({
  open,
  onOpenChange,
  formName,
  privacyLinkText,
  thankYouTitle,
}: FormPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Form Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">This is how your form will appear on Facebook and Instagram</p>

          {/* Mock mobile form preview */}
          <div className="rounded-lg border-2 border-border bg-background p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{formName}</h3>
              <p className="text-xs text-muted-foreground">Fill out this form to get in touch</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input placeholder="John Doe" disabled className="bg-muted" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input placeholder="john@example.com" disabled className="bg-muted" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number</Label>
                <Input placeholder="+1 (555) 000-0000" disabled className="bg-muted" />
              </div>
            </div>

            <Button className="w-full" disabled>
              Submit
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By submitting, you agree to our <span className="text-primary underline">{privacyLinkText}</span>
            </p>
          </div>

          {thankYouTitle && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs font-medium mb-1">After submission:</p>
              <p className="text-sm font-semibold">{thankYouTitle}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
