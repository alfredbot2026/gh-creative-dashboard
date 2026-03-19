/**
 * Content Templates API
 * GET /api/templates — list user's templates
 * POST /api/templates — save a generation as template
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('content_templates')
      .select('*')
      .eq('is_active', true)
      .order('times_used', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const body = await request.json()

    const { name, content_purpose, content_lane, hook_entry_id, framework_entry_id, product_id, template_params, sample_output } = body

    if (!name || !template_params) {
      return NextResponse.json({ error: 'name and template_params required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('content_templates')
      .insert({
        user_id: user?.id || null,
        name,
        content_purpose: content_purpose || null,
        content_lane: content_lane || 'short-form',
        hook_entry_id: hook_entry_id || null,
        framework_entry_id: framework_entry_id || null,
        product_id: product_id || null,
        template_params,
        sample_output: sample_output || null,
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
