"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { AuthModal } from '@/components/auth/auth-modal'
import { HomepageHeader } from '@/components/homepage/homepage-header'
import { LoggedInHeader } from '@/components/homepage/logged-in-header'
import { HeroSection } from '@/components/homepage/hero-section'
import { AdCarousel } from '@/components/homepage/ad-carousel'
import { CampaignGrid } from '@/components/homepage/campaign-grid'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [processingPrompt, setProcessingPrompt] = useState(false)

  // Check for temp_prompt_id after login and create campaign
  useEffect(() => {
    const handlePostAuth = async () => {
      // Only process if user is authenticated and auth is not loading
      if (!user || loading) return
      
      const tempPromptId = localStorage.getItem('temp_prompt_id')
      if (!tempPromptId) return

      // Show loading state
      setProcessingPrompt(true)

      try {
        // Fetch the temp prompt
        const promptResponse = await fetch(`/api/temp-prompt?id=${tempPromptId}`)
        if (promptResponse.ok) {
          const { promptText } = await promptResponse.json()
          
          // Create campaign with the prompt
          const campaignResponse = await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Campaign: ${promptText.substring(0, 50)}...`,
              tempPromptId,
              prompt: promptText,
            }),
          })

          if (campaignResponse.ok) {
            const { campaign } = await campaignResponse.json()
            // Clear the temp prompt ID
            localStorage.removeItem('temp_prompt_id')
            // Redirect to the new campaign with initial prompt flag
            router.push(`/${campaign.id}?autostart=true`)
          } else {
            console.error('Failed to create campaign')
            setProcessingPrompt(false)
          }
        } else {
          console.error('Failed to fetch temp prompt')
          localStorage.removeItem('temp_prompt_id')
          setProcessingPrompt(false)
        }
      } catch (error) {
        console.error('Error creating campaign from temp prompt:', error)
        localStorage.removeItem('temp_prompt_id')
        setProcessingPrompt(false)
      }
    }

    handlePostAuth()
  }, [user, loading, router])

  const handleSignInClick = () => {
    setAuthTab('signin')
    setAuthModalOpen(true)
  }

  const handleSignUpClick = () => {
    setAuthTab('signup')
    setAuthModalOpen(true)
  }

  const handleAuthRequired = () => {
    setAuthTab('signup')
    setAuthModalOpen(true)
  }

  if (loading || processingPrompt) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          {processingPrompt && (
            <p className="text-sm text-muted-foreground">Creating your campaign...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {user ? (
        <LoggedInHeader />
      ) : (
        <HomepageHeader onSignInClick={handleSignInClick} onSignUpClick={handleSignUpClick} />
      )}

      <main className="flex-1">
        <HeroSection onAuthRequired={handleAuthRequired} />
        
        {user ? (
          <CampaignGrid />
        ) : (
          <AdCarousel />
        )}
      </main>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authTab}
      />
    </div>
  )
}
