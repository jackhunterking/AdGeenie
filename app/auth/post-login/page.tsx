"use client"

/**
 * Feature: Post-login prompt handoff
 * Purpose: After OAuth returns, consume the saved temp prompt and create a campaign, then redirect into the wizard
 * References:
 *  - Supabase (Advanced SSR Auth): https://supabase.com/docs/guides/auth/server-side/advanced-guide
 *  - Supabase (Code exchange route pattern): https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
 */
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

function PostLoginContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusText, setStatusText] = useState<string>("Finishing sign-in…")

  useEffect(() => {
    const run = async () => {
      if (loading) return

      // If no user, bounce to home. This page only handles post-auth.
      if (!user) {
        router.replace("/")
        return
      }

      // Avoid double processing across reloads
      const sentinelKey = "post_login_processed"
      if (sessionStorage.getItem(sentinelKey)) {
        router.replace("/")
        return
      }
      sessionStorage.setItem(sentinelKey, "true")

      try {
        // Prefer localStorage id created on anonymous prompt submit
        const tempPromptId = typeof window !== "undefined"
          ? localStorage.getItem("temp_prompt_id")
          : null

        // If we have no local id, try user metadata as a fallback (e.g., email flows)
        // Safely read metadata without using any
        const meta = (user?.user_metadata ?? {}) as { temp_prompt_id?: unknown }
        const metaPromptId = typeof meta.temp_prompt_id === "string" ? meta.temp_prompt_id : undefined

        const idToUse = tempPromptId || metaPromptId || null

        if (!idToUse) {
          // Nothing to process – go back home gracefully
          router.replace("/")
          return
        }

        setStatusText("Creating your campaign…")

        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Untitled Campaign", tempPromptId: idToUse }),
        })

        if (!res.ok) {
          // If for some reason the temp prompt was used/expired, just return home
          router.replace("/")
          return
        }

        const { campaign } = await res.json()

        // Clean up client state
        if (tempPromptId) {
          localStorage.removeItem("temp_prompt_id")
        }

        // Optional: clear any query indicators like auth=success for a clean URL on next page
        const authSuccess = searchParams?.get("auth") === "success"
        if (authSuccess && typeof window !== "undefined") {
          window.history.replaceState({}, "", "/auth/post-login")
        }

        router.replace(`/${campaign.id}`)
      } catch {
        router.replace("/")
      }
    }

    run()
  }, [user, loading, router, searchParams])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="text-sm text-muted-foreground">{statusText}</p>
      </div>
    </div>
  )
}

export default function PostLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    }>
      <PostLoginContent />
    </Suspense>
  )
}


