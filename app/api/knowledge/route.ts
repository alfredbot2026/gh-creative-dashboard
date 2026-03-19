/**
 * Knowledge Base API — List + Create
 * GET /api/knowledge — query entries with filters
 * POST /api/knowledge — create a new entry
 */
import { NextRequest, NextResponse } from 'next/server'
import { queryKnowledgeEntries, createKnowledgeEntry, getKnowledgeStats } from '@/app/actions/knowledge'
import type { KnowledgeFilter, KnowledgeCategory, ContentLane, SourceType, ReviewStatus } from '@/lib/knowledge/types'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    
    // Check if stats are requested
    if (params.get('stats') === 'true') {
      const stats = await getKnowledgeStats()
      return NextResponse.json(stats)
    }
    
    const filter: KnowledgeFilter = {}
    if (params.get('category')) filter.category = params.get('category') as KnowledgeCategory
    if (params.get('subcategory')) filter.subcategory = params.get('subcategory')!
    if (params.get('lane')) filter.lane = params.get('lane') as ContentLane
    if (params.get('review_status')) filter.review_status = params.get('review_status') as ReviewStatus
    if (params.get('source')) filter.source = params.get('source') as SourceType
    if (params.get('search')) filter.search = params.get('search')!
    if (params.get('limit')) filter.limit = parseInt(params.get('limit')!)
    if (params.get('offset')) filter.offset = parseInt(params.get('offset')!)
    
    const result = await queryKnowledgeEntries(filter)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query knowledge base' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const entry = await createKnowledgeEntry(data)
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create entry' },
      { status: 500 }
    )
  }
}
