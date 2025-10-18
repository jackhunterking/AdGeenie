"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronLeft, Edit3, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export function ProjectDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="relative h-5 w-5">
          <img src="/vibeads-logo.png" alt="AdGeenie" className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold">AdGeenie</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[320px] rounded-lg dropdown-surface shadow-xl z-50">
          {/* Menu Items */}
          <div className="p-2">
            {/* Go to Dashboard */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 px-3 text-sm font-normal hover-surface"
              onClick={() => setIsOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
              Go to Dashboard
            </Button>

            {/* Credits Section */}
            <div className="my-2 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-3">Pro Plan</p>

              <div className="rounded-lg bg-muted border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Credits</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">203.2 left</span>
                    <ChevronLeft className="h-3 w-3 rotate-180 text-muted-foreground" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-[20%] bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Rename Project */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 px-3 text-sm font-normal hover-surface"
              onClick={() => setIsOpen(false)}
            >
              <Edit3 className="h-4 w-4" />
              Rename project
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 px-3 text-sm font-normal hover-surface"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  Light mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Dark mode
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
