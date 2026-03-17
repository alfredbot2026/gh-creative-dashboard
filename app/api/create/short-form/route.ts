import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShortFormScript } from '@/lib/create/shortform-generator'
import type { GenerateShortFormRequest } from '@/lib/create/types'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: GenerateShortFormRequest = await request.json()

    // Validate required fields
    if (!body.topic || !body.platform) {
      return NextResponse.json(
        { error: 'topic and platform are required' },
        { status: 400 }
      )
    }

    // Validate platform
    const validPlatforms = ['instagram-reels', 'tiktok', 'youtube-shorts']
    if (!validPlatforms.includes(body.platform)) {
      return NextResponse.json(
        { error: `platform must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await generateShortFormScript(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Short-form generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
