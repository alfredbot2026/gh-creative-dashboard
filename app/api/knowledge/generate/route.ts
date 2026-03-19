/**
 * Knowledge entries for generation (70/20/10 weighted selection)
 * GET /api/knowledge/generate?lane=short-form&categories=hook_library,scripting_framework
 */
import { NextRequest, NextResponse } from 'next/server'
import { getEntriesForGeneration } from '@/app/actions/knowledge'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const lane = params.get('lane')
    if (!lane) {
      return NextResponse.json({ error: 'lane parameter required' }, { status: 400 })
    }
    
    const categories = params.get('categories')?.split(',').filter(Boolean)
    const limit = params.get('limit') ? parseInt(params.get('limit')!) : 15
    
    const result = await getEntriesForGeneration(lane, categories, limit)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get generation entries' },
      { status: 500 }
    )
  }
}
