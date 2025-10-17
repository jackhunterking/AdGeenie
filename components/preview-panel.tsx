"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, ImageIcon, Video, Layers, Sparkles } from "lucide-react"
import { LocationTargeting } from "./location-targeting"
import { LocationSelectionCanvas } from "./location-selection-canvas"
import { AudienceSelectionCanvas } from "./audience-selection-canvas"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { GoalSelectionCanvas } from "./goal-selection-canvas"
import { ResultsTab } from "./results-tab"

interface PreviewPanelProps {
  activeTab: string
  targetedLocations?: any[]
}

export function PreviewPanel({ activeTab, targetedLocations }: PreviewPanelProps) {
  const [activeFormat, setActiveFormat] = useState("feed")
  const { adContent } = useAdPreview()
  const [showReelMessage, setShowReelMessage] = useState(false)

  const previewFormats = [
    { id: "feed", label: "Feed", icon: ImageIcon },
    { id: "story", label: "Story", icon: Layers },
    { id: "reel", label: "Reel", icon: Video },
  ]

  const handleReelClick = () => {
    setShowReelMessage(true);
    setTimeout(() => setShowReelMessage(false), 2500);
  };

  return (
    <div className="flex h-full flex-col relative">
      <div className="flex-1 overflow-auto bg-muted border border-border rounded-tl-lg p-6">
        <div className="animate-in fade-in duration-300">
          {activeTab === "preview" && (
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex justify-center pb-4">
                <div className="inline-flex rounded-lg border border-border p-1 bg-card">
                  {previewFormats.map((format) => {
                    const Icon = format.icon
                    const isActive = activeFormat === format.id

                    // Special handling for Reel button
                    if (format.id === "reel") {
                      return (
                        <div key={format.id} className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReelClick}
                            className="px-4 relative"
                          >
                            <Icon className="h-3.5 w-3.5 mr-1.5" />
                            {format.label}
                            <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                          </Button>
                          
                          {/* Coming Soon Popup - appears right below button */}
                          {showReelMessage && (
                            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="bg-popover border border-border rounded-md px-3 py-1.5 shadow-md">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Sparkles size={12} className="text-yellow-500" />
                                  <span className="font-medium">Coming Soon!</span>
                                </div>
                              </div>
                              {/* Arrow pointing up */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px">
                                <div className="border-4 border-transparent border-b-border" />
                                <div className="border-4 border-transparent border-b-popover absolute bottom-0 left-1/2 -translate-x-1/2 -mb-px" />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Regular buttons for Feed and Story
                    return (
                      <Button
                        key={format.id}
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveFormat(format.id)}
                        className="px-4"
                      >
                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                        {format.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {activeFormat === "feed" && (
                <div className="mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Feed Post Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-border">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Your Brand Name</p>
                        <p className="text-xs text-muted-foreground">Sponsored</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 px-2.5 text-xs"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="text-xs font-medium">Connect Meta</span>
                      </Button>
                    </div>

                    {adContent?.imageUrl ? (
                      <div className="aspect-square relative overflow-hidden">
                        <img
                          src={adContent.imageUrl || "/placeholder.svg"}
                          alt={adContent.headline}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center">
                        <div className="text-center text-white p-8">
                          <h3 className="text-lg font-bold mb-2">Your Ad Content</h3>
                          <p className="text-sm opacity-90">Feed post preview</p>
                        </div>
                      </div>
                    )}

                    {/* Feed Post Actions */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-4">
                        {/* Heart/Like icon */}
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        {/* Comment icon */}
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        {/* Share icon */}
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">1,234 likes</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Your Brand Name</span>{" "}
                        {adContent?.body || "Your caption text goes here..."}
                      </p>
                      {adContent?.cta && (
                        <Button size="sm" className="w-full bg-primary hover:bg-primary/90 mt-2">
                          {adContent.cta}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">View all 45 comments</p>
                    </div>
                  </div>
                </div>
              )}

              {activeFormat === "story" && (
                <div className="mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="aspect-[9/16] rounded-2xl border-2 border-border bg-card overflow-hidden relative">
                    {/* Story Background - use image if available */}
                    {adContent?.imageUrl ? (
                      <div className="absolute inset-0">
                        <img
                          src={adContent.imageUrl}
                          alt={adContent.headline}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500" />
                    )}

                    {/* Story Header */}
                    <div className="relative z-10 p-4">
                      <div className="h-1 bg-white/30 rounded-full mb-4">
                        <div className="h-full w-1/3 bg-white rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white" />
                        <p className="text-white text-sm font-semibold">{adContent?.headline || "Your Brand"}</p>
                        <p className="text-white/80 text-xs">2h</p>
                      </div>
                    </div>

                    {/* Story Content - only show text overlay if no image */}
                    {!adContent?.imageUrl && (
                      <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                        <div className="text-white">
                          <h3 className="text-2xl font-bold mb-2">Your Story</h3>
                          <p className="text-base opacity-90">Swipe up to learn more</p>
                        </div>
                      </div>
                    )}

                    {/* Story CTA */}
                    <div className="absolute bottom-8 left-0 right-0 px-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full py-3 px-6 text-center">
                        <p className="text-white font-semibold text-sm">{adContent?.cta || "Learn More"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFormat === "reel" && (
                <div className="mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="aspect-[9/16] rounded-2xl border-2 border-border bg-card overflow-hidden relative">
                    {/* Reel Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600" />

                    {/* Reel Content */}
                    <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                      <div className="text-white">
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                          <Play className="h-8 w-8 fill-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Your Reel</h3>
                        <p className="text-base opacity-90">Video content preview</p>
                      </div>
                    </div>

                    {/* Reel Sidebar */}
                    <div className="absolute right-3 bottom-20 flex flex-col gap-6 items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        </div>
                        <p className="text-white text-xs font-semibold">1.2K</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                        </div>
                        <p className="text-white text-xs font-semibold">234</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                        </div>
                        <p className="text-white text-xs font-semibold">89</p>
                      </div>
                    </div>

                    {/* Reel Bottom Info */}
                    <div className="absolute bottom-4 left-4 right-16 text-white">
                      <p className="font-semibold text-sm mb-1">@yourbrand</p>
                      <p className="text-xs opacity-90 line-clamp-2">Your reel caption and description goes here...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "location" && (
            <div className="h-full">
              <LocationSelectionCanvas />
            </div>
          )}

          {activeTab === "audience" && (
            <div className="h-full">
              <AudienceSelectionCanvas />
            </div>
          )}

          {activeTab === "goal" && (
            <div className="h-full">
              <GoalSelectionCanvas />
            </div>
          )}

          {activeTab === "results" && (
            <div className="mx-auto max-w-4xl">
              <ResultsTab />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
