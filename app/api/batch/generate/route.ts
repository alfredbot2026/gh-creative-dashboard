/**
 * POST /api/batch/generate — Generate a full week of content across all lanes
 * 
 * Creates content items for:
 * - Short-form (reels): 3-4 posts
 * - YouTube: 1 video
 * - Social posts: 2-3 posts
 * - Ads: 2-3 concepts
 * 
 * Returns preview for review before saving to calendar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300 // 5 min max for batch generation

interface BatchItem {
  lane: 'short-form' | 'youtube' | 'social' | 'ads'
  content_type: string
  platform: string
  scheduled_date: string
  title: string
  hook?: string
  content?: Record<string, unknown>
  preview?: string
  purpose?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { weekStart, contentMix, save = false } = await req.json().catch(() => ({}))
  
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    // Get user's product context
    const { data: product } = await supabase
      .from('product_catalog')
      .select('name, description, price, usps, target_audience')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    // Default content mix if not specified
    const mix = contentMix || {
      shortForm: 3,
      youtube: 1,
      social: 2,
      ads: 2
    }

    const startDate = new Date(weekStart)
    const batchItems: BatchItem[] = []
    const generated: BatchItem[] = []

    // Generate short-form scripts (reels)
    for (let i = 0; i < mix.shortForm; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i * 2) // Spread across week
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/create/short-form`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: product?.name || 'sticker business',
            platform: i % 2 === 0 ? 'instagram-reels' : 'tiktok',
            style: 'hook-first',
            target_duration: 45,
            content_purpose: i === 0 ? 'educate' : i === 1 ? 'story' : 'sell',
            product_context: product || undefined
          })
        })
        
        if (res.ok) {
          const data = await res.json()
          batchItems.push({
            lane: 'short-form',
            content_type: 'reel',
            platform: i % 2 === 0 ? 'instagram' : 'tiktok',
            scheduled_date: date.toISOString().split('T')[0],
            title: data.script?.title || `Reel ${i + 1}`,
            hook: data.script?.hook,
            content: data.script,
            preview: data.script?.hook?.slice(0, 100) + '...',
            purpose: i === 0 ? 'educate' : i === 1 ? 'story' : 'sell'
          })
        }
      } catch (err) {
        console.error('[Batch] Short-form generation failed:', err)
      }
    }

    // Generate YouTube script
    if (mix.youtube > 0) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + 3) // Mid-week
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/create/youtube`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: product?.name || 'how to start a sticker business',
            video_type: 'tutorial',
            target_length: '8-12',
            content_purpose: 'educate',
            product_name: product?.name
          })
        })
        
        if (res.ok) {
          const data = await res.json()
          batchItems.push({
            lane: 'youtube',
            content_type: 'youtube_long',
            platform: 'youtube',
            scheduled_date: date.toISOString().split('T')[0],
            title: data.title_options?.[0] || 'YouTube Video',
            hook: data.sections?.[0]?.speaking_lines?.slice(0, 100),
            content: data,
            preview: data.title_options?.[0],
            purpose: 'educate'
          })
        }
      } catch (err) {
        console.error('[Batch] YouTube generation failed:', err)
      }
    }

    // Generate social posts
    for (let i = 0; i < mix.social; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i * 3 + 1)
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/create/social-post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: product?.name || 'sticker business tips',
            platform: i % 2 === 0 ? 'instagram' : 'facebook',
            content_purpose: i === 0 ? 'prove' : 'inspire',
            product_context: product || undefined
          })
        })
        
        if (res.ok) {
          const data = await res.json()
          batchItems.push({
            lane: 'social',
            content_type: 'post',
            platform: i % 2 === 0 ? 'instagram' : 'facebook',
            scheduled_date: date.toISOString().split('T')[0],
            title: data.caption?.slice(0, 50) || `Social Post ${i + 1}`,
            hook: data.hook_used,
            content: data,
            preview: data.caption?.slice(0, 150) + '...',
            purpose: i === 0 ? 'prove' : 'inspire'
          })
        }
      } catch (err) {
        console.error('[Batch] Social post generation failed:', err)
      }
    }

    // Generate ad concepts (use bank if available)
    if (mix.ads > 0) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + 5) // End of week
      
      // Check bank first
      const { data: bankHooks } = await supabase
        .from('hook_bank')
        .select('id, hook_text, hook_type, angle, persona')
        .eq('user_id', user.id)
        .eq('status', 'fresh')
        .limit(mix.ads * 2)
      
      if (bankHooks && bankHooks.length > 0) {
        for (let i = 0; i < Math.min(mix.ads, bankHooks.length); i++) {
          const hook = bankHooks[i]
          batchItems.push({
            lane: 'ads',
            content_type: 'ad_creative',
            platform: 'facebook',
            scheduled_date: date.toISOString().split('T')[0],
            title: `Ad: ${hook.hook_text.slice(0, 40)}...`,
            hook: hook.hook_text,
            content: { hook_id: hook.id, angle: hook.angle, persona: hook.persona },
            preview: hook.hook_text,
            purpose: 'sell'
          })
        }
      }
    }

    // If save requested, create all content items
    if (save && batchItems.length > 0) {
      const toInsert = batchItems.map(item => ({
        user_id: user.id,
        title: item.title,
        content_type: item.content_type,
        platform: item.platform,
        scheduled_date: item.scheduled_date,
        status: 'planned',
        hook: item.hook,
        script_data: item.content,
        generation_reasoning: `Batch generated for week of ${weekStart}`,
      }))

      const { data: saved, error } = await supabase
        .from('content_items')
        .insert(toInsert)
        .select('id')

      if (error) throw error
      
      return NextResponse.json({
        success: true,
        generated: batchItems.length,
        saved: saved?.length || 0,
        items: batchItems,
        weekStart,
      })
    }

    // Return preview for review
    return NextResponse.json({
      success: true,
      generated: batchItems.length,
      items: batchItems,
      weekStart,
      preview: true,
    })

  } catch (err: any) {
    console.error('[Batch] Generation failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}