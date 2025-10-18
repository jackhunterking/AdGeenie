"use client"

import { useState } from "react"
import { PreviewPanel } from "./preview-panel"
import AiChat from "./ai-chat"
import { Button } from "@/components/ui/button"
import { ChevronDown, ArrowLeft, Edit, Moon, Sun, Check } from "lucide-react"
import { COMPANY_NAME } from "@/lib/constants"
import { useTheme } from "next-themes"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useGoal } from "@/lib/context/goal-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

export function Dashboard() {
  const [credits, setCredits] = useState(205.5)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dailyCredits = 500
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content - Chat and Preview side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* AI Chat - Takes 1/4 width */}
        <div className="w-1/4 bg-preview-panel text-preview-panel-foreground flex flex-col h-full">
          {/* Header - Only for left section */}
          <div className="flex h-12 items-center justify-between px-4 bg-preview-panel text-preview-panel-foreground shrink-0">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2">
                <div className="relative h-5 w-5">
                  <img src="/vibeads-logo.png" alt="Vibeads" className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">{COMPANY_NAME}</span>
              </a>
              
              {/* Dropdown Menu */}
              <DropdownMenu onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronDown className={`h-4 w-4 transition-colors ${isDropdownOpen ? 'text-foreground' : 'text-muted-foreground'}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" alignOffset={-140} className="w-56">
                  <DropdownMenuItem>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Credits</span>
                      <span className="text-sm font-medium">{credits} left</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                        style={{ width: `${(credits / dailyCredits) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
                      Daily credits used first
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Rename ad
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      {resolvedTheme === "dark" ? (
                        <Moon className="mr-2 h-4 w-4" />
                      ) : (
                        <Sun className="mr-2 h-4 w-4" />
                      )}
                      Appearance
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                        {resolvedTheme === "light" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                        {resolvedTheme === "dark" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* AI Chat Content */}
          <AiChat />
        </div>

        {/* Preview Panel - Takes 3/4 width */}
        <div className="flex-1">
          <PreviewPanel />
        </div>
      </div>
    </div>
  )
}
