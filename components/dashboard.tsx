"use client"

import { useState } from "react"
import { PreviewPanel } from "./preview-panel"
import AiChat from "./ai-chat"
import { Button } from "@/components/ui/button"
import { BarChart3, Play, Target, DollarSign, Flag, Eye, ChevronDown, ArrowLeft, Edit } from "lucide-react"
import { COMPANY_NAME } from "@/lib/constants"
import { ModeSwitcher } from "./mode-switcher"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const TAB_COLORS = {
  preview: { bg: "bg-slate-500/10 dark:bg-slate-500/20", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500" },
  target: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500" },
  budget: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-600 dark:text-green-400", border: "border-green-500" },
  goal: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "border-[#4B73FF]" },
  results: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500" },
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("preview")
  const [credits, setCredits] = useState(205.5)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dailyCredits = 500

  const tabs = [
    { id: "preview", label: "Preview", icon: Eye },
    { id: "target", label: "Target", icon: Target },
    { id: "budget", label: "Budget", icon: DollarSign },
    { id: "goal", label: "Goal", icon: Flag },
    { id: "results", label: "Results", icon: BarChart3 },
  ]

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Full-width Header */}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const colors = TAB_COLORS[tab.id as keyof typeof TAB_COLORS]

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 transition-all duration-300 ease-in-out ${
                  isActive
                    ? `border ${colors.border} ${colors.bg} text-foreground px-3 py-1.5 rounded-lg`
                    : "h-8 w-8 border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {isActive && (
                  <span className="text-xs font-medium animate-in fade-in slide-in-from-left-2 duration-300">
                    {tab.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <ModeSwitcher />
          <Button
            variant="outline"
            className="h-8 gap-1.5 px-3 text-xs"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="text-xs font-medium">Connect Meta</span>
          </Button>

          <Button size="sm" className="gap-1.5 bg-[#4B73FF] hover:bg-[#3d5fd9] text-white h-8 px-3 text-xs">
            <Play className="h-3 w-3" />
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content - Chat and Preview side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* AI Chat - Takes 1/3 width */}
        <div className="w-1/3 bg-preview-panel text-preview-panel-foreground flex flex-col h-full">
          <AiChat />
        </div>

        {/* Preview Panel - Takes 2/3 width */}
        <div className="flex-1">
          <PreviewPanel activeTab={activeTab} />
        </div>
      </div>
    </div>
  )
}
