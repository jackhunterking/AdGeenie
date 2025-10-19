"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface GenerationContextType {
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  generationMessage: string
  setGenerationMessage: (message: string) => void
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined)

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationMessage, setGenerationMessage] = useState("Generating ad variations...")

  return (
    <GenerationContext.Provider 
      value={{ 
        isGenerating, 
        setIsGenerating,
        generationMessage,
        setGenerationMessage
      }}
    >
      {children}
    </GenerationContext.Provider>
  )
}

export function useGeneration() {
  const context = useContext(GenerationContext)
  if (context === undefined) {
    throw new Error("useGeneration must be used within a GenerationProvider")
  }
  return context
}

