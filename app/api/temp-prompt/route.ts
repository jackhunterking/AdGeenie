import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { promptText, goalType } = await request.json()

    // Optional correlation id for prod debugging
    const correlationId = request.headers.get('x-request-id') || undefined

    // Guard: ensure required envs are present in runtime (extra safety)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[TEMP-PROMPT] Missing Supabase server envs', { correlationId })
      return NextResponse.json(
        { error: 'Server is misconfigured. Please try again later.' },
        { status: 500 }
      )
    }

    if (!promptText || typeof promptText !== 'string') {
      return NextResponse.json(
        { error: 'Prompt text is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('temp_prompts')
      .insert({
        prompt_text: promptText,
        goal_type: goalType || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[TEMP-PROMPT] Failed to store prompt', {
        correlationId,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      })
      return NextResponse.json(
        { error: 'Failed to store prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tempId: data.id })
  } catch (error) {
    console.error('[TEMP-PROMPT] Unexpected error in POST', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tempId = searchParams.get('id')

    if (!tempId) {
      return NextResponse.json(
        { error: 'Temp ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('temp_prompts')
      .select('*')
      .eq('id', tempId)
      .eq('used', false)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Prompt not found or already used' },
        { status: 404 }
      )
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Prompt has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({ 
      promptText: data.prompt_text,
      goalType: data.goal_type 
    })
  } catch (error) {
    console.error('[TEMP-PROMPT] Unexpected error in GET', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

