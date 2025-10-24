"use client"

/**
 * Feature: Post-verify prompt handoff (email sign-up)
 * Purpose: After email verification returns, consume temp prompt (metadata or local) and create a campaign
 * References:
 *  - Supabase (Advanced SSR Auth): https://supabase.com/docs/guides/auth/server-side/advanced-guide
 */
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

function PostVerifyContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusText, setStatusText] = useState<string>("Verifying…")

  useEffect(() => {
    const run = async () => {
      if (loading) return

      // Require verified=true to avoid accidental access
      const isVerified = searchParams?.get("verified") === "true"
      if (!user || !isVerified) {
        router.replace("/")
        return
      }

      const sentinelKey = "post_verify_processed"
      if (sessionStorage.getItem(sentinelKey)) {
        router.replace("/")
        return
      }
      sessionStorage.setItem(sentinelKey, "true")

      try {
        const localId = typeof window !== "undefined" ? localStorage.getItem("temp_prompt_id") : null
        const meta = (user?.user_metadata ?? {}) as { temp_prompt_id?: unknown }
        const metaId = typeof meta.temp_prompt_id === "string" ? meta.temp_prompt_id : undefined
        const idToUse = localId || metaId || null

        if (!idToUse) {
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
          router.replace("/")
          return
        }

        const { campaign } = await res.json()
        if (localId) localStorage.removeItem("temp_prompt_id")

        // Clean URL
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/auth/post-verify")
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

export default function PostVerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    }>
      <PostVerifyContent />
    </Suspense>
  )
}


