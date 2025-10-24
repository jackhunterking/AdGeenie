"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { AuthModal } from '@/components/auth/auth-modal'
import { HomepageHeader } from '@/components/homepage/homepage-header'
import { LoggedInHeader } from '@/components/homepage/logged-in-header'
import { HeroSection } from '@/components/homepage/hero-section'
import { AdCarousel } from '@/components/homepage/ad-carousel'
import { CampaignGrid } from '@/components/homepage/campaign-grid'

function HomeContent() {
  const { user, loading } = useAuth()
  const { createCampaign } = useCampaignContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [processingPrompt, setProcessingPrompt] = useState(false)

  // Check for temp_prompt_id after login and create campaign (fallback only)
  useEffect(() => {
    const handlePostAuth = async () => {
      if (!user || loading) return
      
      // If we already processed in dedicated post-login flow, skip
      if (typeof window !== 'undefined' && sessionStorage.getItem('post_login_processed')) {
        return
      }

      const isVerified = searchParams?.get('verified') === 'true'
      if (!isVerified) return
      
      // CHECK FOR SUPABASE ERRORS FIRST
      const error = searchParams?.get('error')
      const errorCode = searchParams?.get('error_code')
      const errorDescription = searchParams?.get('error_description')
      
      if (error || errorCode) {
        console.error('[HOMEPAGE] Verification error:', { error, errorCode, errorDescription })
        
        // Show user-friendly error message
        if (errorCode === 'otp_expired') {
          alert('Your verification link has expired. Please sign up again to receive a new verification email.')
        } else {
          alert(`Verification failed: ${errorDescription || error || 'Unknown error'}`)
        }
        
        // Clean up URL and stop processing
        window.history.replaceState({}, '', '/')
        return
      }
      
      // Prevent double-processing
      const hasProcessed = sessionStorage.getItem('processed_verification')
      if (hasProcessed) return
      sessionStorage.setItem('processed_verification', 'true')
      
      setProcessingPrompt(true)
      
      try {
        // Get temp_prompt_id from user metadata (NOT localStorage)
        const tempPromptId = user.user_metadata?.temp_prompt_id
        
        if (!tempPromptId) {
          // User verified but no temp prompt - just stay on homepage
          console.log('[HOMEPAGE] User verified without temp prompt')
          sessionStorage.removeItem('processed_verification')
          setProcessingPrompt(false)
          return
        }
        
        // Fetch the temp prompt
        const promptResponse = await fetch(`/api/temp-prompt?id=${tempPromptId}`)
        
        if (!promptResponse.ok) {
          // Prompt expired/used - redirect to homepage
          console.warn('[HOMEPAGE] Temp prompt expired or already used')
          sessionStorage.removeItem('processed_verification')
          setProcessingPrompt(false)
          return
        }
        
        const { promptText, goalType } = await promptResponse.json()
        
        // Create campaign using context with goal
        const campaign = await createCampaign(
          `Campaign: ${promptText.substring(0, 50)}...`,
          promptText,
          goalType
        )
        
        if (campaign) {
          // Redirect to campaign - client will auto-submit
          router.push(`/${campaign.id}`)
        } else {
          console.error('[HOMEPAGE] Failed to create campaign')
          sessionStorage.removeItem('processed_verification')
          setProcessingPrompt(false)
        }
      } catch (error) {
        console.error('[HOMEPAGE] Error:', error)
        sessionStorage.removeItem('processed_verification')
        setProcessingPrompt(false)
      }
    }
    
    handlePostAuth()
  }, [user, loading, router, searchParams, createCampaign])

  // Handle normal sign-in or OAuth sign-in: consume temp_prompt_id from localStorage (fallback only)
  useEffect(() => {
    const tryConsumeLocalTempPrompt = async () => {
      if (loading || !user) return

      if (typeof window !== 'undefined' && sessionStorage.getItem('post_login_processed')) {
        return
      }

      // Avoid double runs across reloads
      const alreadyProcessing = sessionStorage.getItem('processed_temp_prompt')
      if (alreadyProcessing) return

      const tempPromptId = typeof window !== 'undefined'
        ? localStorage.getItem('temp_prompt_id')
        : null

      if (!tempPromptId) return

      sessionStorage.setItem('processed_temp_prompt', 'true')
      setProcessingPrompt(true)

      try {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Untitled Campaign', tempPromptId }),
        })

        if (!res.ok) {
          console.error('[HOMEPAGE] Failed to create campaign from temp prompt:', await res.text())
          sessionStorage.removeItem('processed_temp_prompt')
          setProcessingPrompt(false)
          return
        }

        localStorage.removeItem('temp_prompt_id')
        const { campaign } = await res.json()
        router.push(`/${campaign.id}`)
      } catch (e) {
        console.error('[HOMEPAGE] Error creating campaign from temp prompt:', e)
        sessionStorage.removeItem('processed_temp_prompt')
        setProcessingPrompt(false)
      }
    }

    tryConsumeLocalTempPrompt()
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
