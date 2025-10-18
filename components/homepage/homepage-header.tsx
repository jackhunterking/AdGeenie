"use client"

import { Button } from '@/components/ui/button'
import { COMPANY_NAME } from '@/lib/constants'

interface HomepageHeaderProps {
  onSignInClick: () => void
  onSignUpClick: () => void
}

export function HomepageHeader({ onSignInClick, onSignUpClick }: HomepageHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between px-6 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <div className="relative h-6 w-6">
          <img src="/vibeads-logo.png" alt="AdGeenie" className="h-6 w-6" />
        </div>
        <span className="text-lg font-semibold">{COMPANY_NAME}</span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onSignInClick}>
          Sign In
        </Button>
        <Button onClick={onSignUpClick}>
          Sign Up
        </Button>
      </div>
    </header>
  )
}

