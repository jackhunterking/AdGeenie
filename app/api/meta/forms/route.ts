/**
 * Feature: Meta Lead Forms API
 * Purpose: List and create Instant Forms (leadgen forms) for a selected Page using stored tokens
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/nextjs
 *  - Meta Graph API (User → Pages): https://developers.facebook.com/docs/graph-api/reference/user/accounts/
 *  - Meta Graph API (Page → leadgen_forms): https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 *  - Lead Ads Instant Forms (Create): https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface LeadgenFormSummary {
  id: string
  name?: string
  created_time?: string
}

interface PrivacyPolicyInput {
  url: string
  link_text: string
}

interface ThankYouPageInput {
  title?: string
  body?: string
  button_text?: string
  button_url?: string
}

interface CreateFormBody {
  campaignId?: string
  name?: string
  privacyPolicy?: PrivacyPolicyInput
  locale?: string
  questions?: Array<{ type: string }>
  thankYouPage?: ThankYouPageInput
}

async function getPageAccessToken(graphVersion: string, userToken: string, pageId: string): Promise<string | null> {
  // Fetch the specific page's access token using the user token
  const res = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}?fields=access_token`, {
    headers: { Authorization: `Bearer ${userToken}` },
    cache: 'no-store',
  })
  const json = await res.json() as { access_token?: string; error?: unknown }
  if (json && typeof json.access_token === 'string' && json.access_token.length > 0) {
    return json.access_token
  }
  // Fallback: enumerate all pages
  const pagesRes = await fetch(`https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,access_token&limit=500`, {
    headers: { Authorization: `Bearer ${userToken}` },
    cache: 'no-store',
  })
  const pagesJson = await pagesRes.json() as { data?: Array<{ id: string; access_token?: string }> }
  const page = pagesJson.data?.find((p) => p.id === pageId)
  return page?.access_token || null
}

export async function GET(req: NextRequest) {
  try {
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    if (!FB_GRAPH_VERSION) {
      return NextResponse.json({ error: 'Server missing FB_GRAPH_VERSION' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load connection details
    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_page_id,long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const pageId = (conn as { selected_page_id?: string } | null)?.selected_page_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token

    if (!pageId || !userToken) {
      // Return empty list to keep UI flow simple
      return NextResponse.json({ forms: [] as LeadgenFormSummary[] })
    }

    const pageToken = await getPageAccessToken(FB_GRAPH_VERSION, userToken, pageId)
    if (!pageToken) {
      return NextResponse.json({ error: 'Could not derive page access token' }, { status: 400 })
    }

    const formsRes = await fetch(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(pageId)}/leadgen_forms?fields=id,name,created_time&limit=100`,
      { headers: { Authorization: `Bearer ${pageToken}` }, cache: 'no-store' }
    )
    const formsJson = await formsRes.json() as { data?: LeadgenFormSummary[]; error?: { message?: string } }
    if (!formsRes.ok) {
      return NextResponse.json({ error: formsJson?.error?.message || 'Failed to fetch forms' }, { status: formsRes.status })
    }

    const forms = Array.isArray(formsJson.data) ? formsJson.data : []
    return NextResponse.json({ forms })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    if (!FB_GRAPH_VERSION) {
      return NextResponse.json({ error: 'Server missing FB_GRAPH_VERSION' }, { status: 500 })
    }

    const body = await req.json() as CreateFormBody
    const { campaignId, name, privacyPolicy, locale, questions, thankYouPage } = body

    if (!campaignId || !name || !privacyPolicy?.url || !privacyPolicy?.link_text) {
      return NextResponse.json({ error: 'campaignId, name and privacyPolicy {url, link_text} are required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load connection details
    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_page_id,long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const pageId = (conn as { selected_page_id?: string } | null)?.selected_page_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!pageId || !userToken) {
      return NextResponse.json({ error: 'Missing selected page or user token' }, { status: 400 })
    }

    const pageToken = await getPageAccessToken(FB_GRAPH_VERSION, userToken, pageId)
    if (!pageToken) {
      return NextResponse.json({ error: 'Could not derive page access token' }, { status: 400 })
    }

    // Build Graph payload; Graph expects JSON for some complex fields
    const payload: Record<string, string> = {
      name,
      privacy_policy: JSON.stringify({ url: privacyPolicy.url, link_text: privacyPolicy.link_text }),
    }
    if (Array.isArray(questions) && questions.length > 0) {
      payload.questions = JSON.stringify(questions.map((q) => ({ type: q.type })))
    }
    if (locale) payload.locale = locale
    if (thankYouPage && (thankYouPage.title || thankYouPage.body || thankYouPage.button_text || thankYouPage.button_url)) {
      payload.thank_you_page = JSON.stringify(thankYouPage)
    }

    const formRes = await fetch(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(pageId)}/leadgen_forms`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pageToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload),
        cache: 'no-store',
      }
    )
    const formJson = await formRes.json() as { id?: string; success?: boolean; error?: { message?: string } }
    if (!formRes.ok || !formJson.id) {
      return NextResponse.json({ error: formJson?.error?.message || 'Failed to create form' }, { status: formRes.status || 400 })
    }

    return NextResponse.json({ id: formJson.id, name })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


