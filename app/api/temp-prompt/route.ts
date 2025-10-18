import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { promptText } = await request.json()

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
      })
      .select()
      .single()

    if (error) {
      console.error('Error storing temp prompt:', error)
      return NextResponse.json(
        { error: 'Failed to store prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tempId: data.id })
  } catch (error) {
    console.error('Error in temp-prompt POST:', error)
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

    return NextResponse.json({ promptText: data.prompt_text })
  } catch (error) {
    console.error('Error in temp-prompt GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

