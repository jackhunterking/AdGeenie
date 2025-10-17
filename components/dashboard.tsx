"use client"

import { useState, useEffect } from "react"
import { PreviewPanel } from "./preview-panel"
import AiChat from "./ai-chat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart3, Play, Target, DollarSign, Flag, Eye, ChevronDown, ArrowLeft, Edit, Plus, Minus, Moon, Sun, Check, MapPin, Users } from "lucide-react"
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

const TAB_COLORS = {
  preview: { bg: "bg-slate-500/10 dark:bg-slate-500/20", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500" },
  location: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500" },
  audience: { bg: "bg-cyan-500/10 dark:bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500" },
  budget: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-600 dark:text-green-400", border: "border-green-500" },
  goal: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "border-[#4B73FF]" },
  results: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500" },
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("preview")
  const [credits, setCredits] = useState(205.5)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dailyCredits = 500
  const [targetedLocations, setTargetedLocations] = useState<any[]>([])
  const { setTheme, resolvedTheme } = useTheme()
  const { isPublished, setIsPublished } = useAdPreview()
  const { goalState } = useGoal()
  
  // Budget state
  const [dailyBudget, setDailyBudget] = useState(20)
  const [isBudgetDropdownOpen, setIsBudgetDropdownOpen] = useState(false)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInputValue, setBudgetInputValue] = useState(dailyBudget.toString())
  const minBudget = 5
  const maxBudget = 100
  const increment = 5

  // Budget handlers
  const handleIncrementBudget = () => {
    setDailyBudget((prev) => Math.min(prev + increment, maxBudget))
  }

  const handleDecrementBudget = () => {
    setDailyBudget((prev) => Math.max(prev - increment, minBudget))
  }

  const handleBudgetClick = () => {
    setIsEditingBudget(true)
    setBudgetInputValue(dailyBudget.toString())
  }

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setBudgetInputValue(value)
  }

  const handleBudgetInputBlur = () => {
    const numValue = Number.parseInt(budgetInputValue) || minBudget
    const clampedValue = Math.max(minBudget, Math.min(maxBudget, numValue))
    setDailyBudget(clampedValue)
    setIsEditingBudget(false)
  }

  const handleBudgetInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBudgetInputBlur()
    } else if (e.key === "Escape") {
      setIsEditingBudget(false)
      setBudgetInputValue(dailyBudget.toString())
    }
  }

  // Listen for location updates from chat
  useEffect(() => {
    const handleLocationsUpdate = (event: any) => {
      const newLocations = event.detail;
      
      // Merge new locations with existing ones (avoid duplicates by name+mode)
      setTargetedLocations(prev => {
        const existingMap = new Map(prev.map(loc => [`${loc.name}-${loc.mode}`, loc]));
        
        // Add or update with new locations
        newLocations.forEach((newLoc: any) => {
          existingMap.set(`${newLoc.name}-${newLoc.mode}`, newLoc);
        });
        
        return Array.from(existingMap.values());
      });
    }

    window.addEventListener('locationsUpdated', handleLocationsUpdate)
    return () => window.removeEventListener('locationsUpdated', handleLocationsUpdate)
  }, [])

  // Listen for location removal from location targeting component
  useEffect(() => {
    const handleLocationRemoved = (event: any) => {
      const { id } = event.detail;
      setTargetedLocations(prev => prev.filter(loc => loc.id !== id));
    }

    window.addEventListener('locationRemoved', handleLocationRemoved);
    return () => window.removeEventListener('locationRemoved', handleLocationRemoved);
  }, [])

  // Listen for tab switch requests from chat
  useEffect(() => {
    const handleTabSwitch = (event: any) => {
      const tabId = event.detail;
      setActiveTab(tabId);
    }

    window.addEventListener('switchToTab', handleTabSwitch);
    return () => window.removeEventListener('switchToTab', handleTabSwitch);
  }, [])

  const tabs = [
    { id: "preview", label: "Preview", icon: Eye },
    { id: "location", label: "Location", icon: MapPin },
    { id: "audience", label: "Audience", icon: Target },
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

        <div className="flex items-center gap-1.5">
          {tabs.map((tab) => {
            // Skip budget tab as it's now in the header
            if (tab.id === "budget") return null

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
          {/* Budget Dropdown */}
          <DropdownMenu onOpenChange={setIsBudgetDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 gap-1.5 px-3 text-xs border-green-500 bg-green-500/10 hover:bg-green-500/20 text-foreground"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Budget</span>
                <span className="text-xs font-bold text-green-600">
                  ${dailyBudget}
                </span>
                <span className="text-xs text-muted-foreground">/ day</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-2 py-3">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Daily Budget</span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDecrementBudget}
                    disabled={dailyBudget <= minBudget}
                    className="h-10 w-10 rounded-lg hover:bg-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  {isEditingBudget ? (
                    <div className="flex items-baseline gap-0">
                      <span className="text-3xl font-bold text-green-600 leading-none">$</span>
                      <Input
                        type="text"
                        value={budgetInputValue}
                        onChange={handleBudgetInputChange}
                        onBlur={handleBudgetInputBlur}
                        onKeyDown={handleBudgetInputKeyDown}
                        autoFocus
                        className="w-[90px] text-3xl font-bold text-green-600 text-center bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-[40px] leading-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={handleBudgetClick}
                      className="text-3xl font-bold text-green-600 hover:opacity-80 transition-opacity cursor-pointer leading-none min-w-[90px] text-center"
                    >
                      ${dailyBudget}
                    </button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleIncrementBudget}
                    disabled={dailyBudget >= maxBudget}
                    className="h-10 w-10 rounded-lg hover:bg-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            size="sm" 
            className="gap-1.5 bg-[#4B73FF] hover:bg-[#3d5fd9] text-white h-8 px-3 text-xs disabled:opacity-50"
            disabled={!isPublished && goalState.status !== 'completed'}
            onClick={() => {
              setIsPublished(!isPublished)
              // You can add additional publish logic here (e.g., API call to Supabase)
            }}
            title={!isPublished && goalState.status !== 'completed' ? 'Complete goal setup before publishing' : ''}
          >
            <Play className="h-3 w-3" />
            {isPublished ? 'Unpublish' : 'Publish'}
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
          <PreviewPanel activeTab={activeTab} targetedLocations={targetedLocations} />
        </div>
      </div>
    </div>
  )
}
