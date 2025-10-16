"use client"

import { PreviewPanel } from "./preview-panel"
import AiChat from "./ai-chat"

export function Dashboard() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* AI Chat - Takes 1/3 width */}
      <div className="w-1/3 border-r border-border bg-chat-panel text-chat-panel-foreground flex flex-col h-full">
        <AiChat />
      </div>

      {/* Preview Panel - Takes 2/3 width */}
      <div className="flex-1 bg-preview-panel text-preview-panel-foreground">
        <PreviewPanel />
      </div>
    </div>
  )
}
