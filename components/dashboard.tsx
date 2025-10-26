"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PreviewPanel } from "./preview-panel"
import AiChat from "./ai-chat"
import { Button } from "@/components/ui/button"
import { ChevronDown, ArrowLeft, Edit, Moon, Sun, Check } from "lucide-react"
import { COMPANY_NAME } from "@/lib/constants"
import { useTheme } from "next-themes"
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
import { UIMessage } from "ai"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { SaveIndicator } from "./save-indicator"

interface DashboardProps {
  messages?: UIMessage[]  // AI SDK v5 prop name
  campaignId?: string
  conversationId?: string | null  // Stable conversation ID from server
  campaignMetadata?: { initialPrompt?: string; initialGoal?: string | null } | null
}

export function Dashboard({ 
  messages = [],
  campaignId,
  conversationId,
  campaignMetadata,
}: DashboardProps = {}) {
  const router = useRouter()
  const [credits] = useState(205.5)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dailyCredits = 500
  const { setTheme, resolvedTheme } = useTheme()
  const { campaign } = useCampaignContext()

  console.log(`[DASHBOARD] Received ${messages.length} messages`, messages.map(m => ({ 
    id: m.id, 
    role: m.role, 
    partsCount: m.parts?.length || 0 
  })));
  console.log(`[DASHBOARD] Campaign:`, campaign ? { id: campaign.id, hasStates: !!campaign.campaign_states } : 'null');
  console.log(`[DASHBOARD] conversationId from server:`, conversationId);

  // Note: Campaign loading is now handled by the nested CampaignProvider in app/[campaignId]/page.tsx
  // No need to manually call loadCampaign here

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content - Chat and Preview side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* AI Chat - Takes 1/4 width */}
        <div className="w-1/4 bg-preview-panel text-preview-panel-foreground flex flex-col h-full">
          {/* Header - Only for left section */}
          <div className="flex h-12 items-center justify-between px-4 bg-preview-panel text-preview-panel-foreground shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8">
                <img src="/AdPilot-Logomark.svg" alt="AdPilot" className="h-8 w-8" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold truncate max-w-[160px]">{campaign?.name ?? COMPANY_NAME}</span>
                <div className="-mt-0.5">
                  <SaveIndicator />
                </div>
              </div>
              <DropdownMenu onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronDown className={`h-4 w-4 transition-colors ${isDropdownOpen ? 'text-foreground' : 'text-muted-foreground'}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" alignOffset={-140} className="w-56">
                  <DropdownMenuItem onClick={() => router.push('/')}>
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
                  <RenameCampaignMenuItem />
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
          <AiChat 
            campaignId={campaignId}
            conversationId={conversationId}
            messages={messages}
            campaignMetadata={campaignMetadata ?? undefined}
          />
        </div>

        {/* Preview Panel - Takes 3/4 width */}
        <div className="flex-1">
          <PreviewPanel />
        </div>
      </div>
    </div>
  )
}

// Inline component for rename dialog/menu item to keep file cohesive
function RenameCampaignMenuItem() {
  const { campaign, updateCampaign } = useCampaignContext()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState<string>(campaign?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async () => {
    if (!campaign?.id) return
    const next = name.trim()
    if (!next) {
      setError('Please enter a name')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await updateCampaign({ name: next })
      setOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to rename'
      // Surface common conflict error
      if (/409|unique|exists|used/i.test(msg)) {
        setError('Name already used. Try a different word combination.')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DropdownMenuItem onClick={() => { setName(campaign?.name ?? ''); setOpen(true) }}>
        <Edit className="mr-2 h-4 w-4" />
        Rename ad
      </DropdownMenuItem>
      {/* Simple dialog using existing UI primitives */}
      <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-lg border border-border bg-card p-4 shadow-xl">
          <h3 className="text-sm font-medium mb-2">Rename Campaign</h3>
          <p className="text-xs text-muted-foreground mb-3">Recommended up to 3 words. You can edit anytime.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. Bright Maple Launch"
          />
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button size="sm" onClick={onSubmit} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </div>
    </>
  )
}
