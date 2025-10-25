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
import { getGraphVersion, getPageAccessToken } from '@/lib/meta/graph'

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

export async function GET(req: NextRequest) {
  try {
    const FB_GRAPH_VERSION = getGraphVersion()
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
    const FB_GRAPH_VERSION = getGraphVersion()
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
    // Thank You page: allow only documented keys. Map unsupported `button_url` to button_text only.
    if (thankYouPage && (thankYouPage.title || thankYouPage.body || thankYouPage.button_text)) {
      const safeTYP: Record<string, string> = {}
      if (thankYouPage.title) safeTYP.title = thankYouPage.title
      if (thankYouPage.body) safeTYP.body = thankYouPage.body
      if (thankYouPage.button_text) safeTYP.button_text = thankYouPage.button_text
      // Note: button_url is not an accepted parameter for form creation per API; use ad creative link instead
      payload.thank_you_page = JSON.stringify(safeTYP)
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


