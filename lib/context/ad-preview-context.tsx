"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AdContent {
  imageUrl: string
  headline: string
  body: string
  cta: string
}

interface AdPreviewContextType {
  adContent: AdContent | null
  setAdContent: (content: AdContent | null) => void
}

const AdPreviewContext = createContext<AdPreviewContextType | undefined>(undefined)

export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const [adContent, setAdContent] = useState<AdContent | null>(null)

  return <AdPreviewContext.Provider value={{ adContent, setAdContent }}>{children}</AdPreviewContext.Provider>
}

export function useAdPreview() {
  const context = useContext(AdPreviewContext)
  if (context === undefined) {
    throw new Error("useAdPreview must be used within an AdPreviewProvider")
  }
  return context
}
