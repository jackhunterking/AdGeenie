"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { AuthModal } from '@/components/auth/auth-modal'
import { HomepageHeader } from '@/components/homepage/homepage-header'
import { LoggedInHeader } from '@/components/homepage/logged-in-header'
import { HeroSection } from '@/components/homepage/hero-section'
import { AdCarousel } from '@/components/homepage/ad-carousel'
import { CampaignGrid } from '@/components/homepage/campaign-grid'

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [processingPrompt, setProcessingPrompt] = useState(false)

  // Check for temp_prompt_id after login and create campaign
  useEffect(() => {
    const handlePostAuth = async () => {
      // Only process if user is authenticated and auth is not loading
      if (!user || loading) return
      
      // Check if this is a new user from email verification
      const isVerified = searchParams?.get('verified') === 'true'
      const tempPromptId = localStorage.getItem('temp_prompt_id')
      
      // If verified (with or without temp prompt), fetch campaigns created by trigger
      if (isVerified) {
        // Check if we've already processed this verification to avoid double processing
        const hasProcessedVerification = sessionStorage.getItem('processed_verification')
        if (hasProcessedVerification) return
        
        sessionStorage.setItem('processed_verification', 'true')
        setProcessingPrompt(true)

        try {
          // Fetch campaigns (trigger should have created one if temp_prompt_id existed)
          const response = await fetch('/api/campaigns')
          
          if (response.ok) {
            const { campaigns } = await response.json()
            
            if (campaigns && campaigns.length > 0) {
              // Redirect to newest campaign
              router.push(`/${campaigns[0].id}`)
            } else {
              // No campaigns found - user signed up without prompt
              // Clear localStorage and stay on homepage
              if (tempPromptId) {
                localStorage.removeItem('temp_prompt_id')
              }
              setProcessingPrompt(false)
              sessionStorage.removeItem('processed_verification')
            }
          } else {
            console.error('Failed to fetch campaigns')
            sessionStorage.removeItem('processed_verification')
            setProcessingPrompt(false)
          }
        } catch (error) {
          console.error('Error fetching campaigns:', error)
          sessionStorage.removeItem('processed_verification')
          setProcessingPrompt(false)
        }
        return
      }
      
      // Original logic for temp_prompt_id (when user starts on homepage)
      if (tempPromptId) {
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
              // Redirect to the new campaign
              router.push(`/${campaign.id}`)
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
    }

    handlePostAuth()
  }, [user, loading, router, searchParams])

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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
