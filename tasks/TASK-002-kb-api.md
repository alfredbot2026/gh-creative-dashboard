# Task: TASK-002 — Knowledge Base CRUD API Routes

> **Track:** FAST
> **Builder:** solo
> **Requires review:** No
> **Depends on:** TASK-001 (schema + types must exist)

## Pre-Task Learning
**Read `corrections.md` FIRST if it exists.**

## Context
**Read these FIRST before writing any code:**
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/PROJECT-SPEC.md` — sections 3c, 3e (KB schema, how knowledge feeds generation)
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/lib/knowledge/types.ts` — TypeScript types (from TASK-001)
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/api/chat/route.ts` — existing API route pattern
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/actions/content.ts` — existing server action pattern
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/lib/supabase/server.ts` — Supabase client

## Objective
Create CRUD API routes + server actions for the knowledge base. These are the foundation for browsing, creating, and managing knowledge entries from the dashboard.

## Changes

### Wave 1: Server actions for knowledge entries

#### Task 1.1: Knowledge base server actions
- **File:** `app/actions/knowledge.ts`
- **Action:** Create
- **What to do:**
```typescript
/**
 * Knowledge Base Server Actions
 * CRUD operations for knowledge entries.
 * Pattern matches existing content.ts server actions.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { 
  KnowledgeEntryInsert, 
  KnowledgeEntryUpdate, 
  KnowledgeFilter,
  KnowledgeEntry,
  ReviewStatus 
} from '@/lib/knowledge/types'

/** Create a new knowledge entry */
export async function createKnowledgeEntry(data: KnowledgeEntryInsert): Promise<KnowledgeEntry> {
  const supabase = await createClient()
  
  const { data: entry, error } = await supabase
    .from('knowledge_entries')
    .insert({
      ...data,
      review_status: data.review_status || 'candidate',
      source_confidence: data.source_confidence || 'unverified',
    })
    .select('*')
    .single()
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/knowledge')
  return entry
}

/** Update an existing knowledge entry */
export async function updateKnowledgeEntry(id: string, data: KnowledgeEntryUpdate): Promise<KnowledgeEntry> {
  const supabase = await createClient()
  
  const { data: entry, error } = await supabase
    .from('knowledge_entries')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/knowledge')
  return entry
}

/** Delete a knowledge entry */
export async function deleteKnowledgeEntry(id: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('knowledge_entries')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/knowledge')
}

/** Approve/deprecate/archive an entry (governance) */
export async function updateReviewStatus(
  id: string, 
  status: ReviewStatus, 
  reviewedBy: string
): Promise<KnowledgeEntry> {
  return updateKnowledgeEntry(id, {
    review_status: status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  })
}

/** Bulk approve entries (after extraction review) */
export async function bulkApproveEntries(ids: string[], reviewedBy: string): Promise<number> {
  const supabase = await createClient()
  
  const { error, count } = await supabase
    .from('knowledge_entries')
    .update({
      review_status: 'approved' as ReviewStatus,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids)
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/knowledge')
  return count || 0
}

/** Query knowledge entries with filters */
export async function queryKnowledgeEntries(filter: KnowledgeFilter = {}): Promise<{
  entries: KnowledgeEntry[]
  total: number
}> {
  const supabase = await createClient()
  const limit = filter.limit || 50
  const offset = filter.offset || 0
  
  let query = supabase
    .from('knowledge_entries')
    .select('*', { count: 'exact' })
  
  // Apply filters
  if (filter.category) query = query.eq('category', filter.category)
  if (filter.subcategory) query = query.eq('subcategory', filter.subcategory)
  if (filter.lane) query = query.contains('lanes', [filter.lane])
  if (filter.review_status) query = query.eq('review_status', filter.review_status)
  if (filter.source) query = query.eq('source', filter.source)
  if (filter.source_confidence) query = query.eq('source_confidence', filter.source_confidence)
  if (filter.min_effectiveness) query = query.gte('effectiveness_score', filter.min_effectiveness)
  if (filter.tags && filter.tags.length > 0) query = query.overlaps('tags', filter.tags)
  if (filter.search) query = query.or(`title.ilike.%${filter.search}%,content.ilike.%${filter.search}%`)
  
  // Order by effectiveness score (most useful first)
  query = query.order('effectiveness_score', { ascending: false })
  query = query.range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) throw new Error(error.message)
  
  return { entries: data || [], total: count || 0 }
}

/** Get entries for generation (70/20/10 weighted selection) */
export async function getEntriesForGeneration(
  lane: string,
  categories?: string[],
  limit: number = 15
): Promise<{
  exploit: KnowledgeEntry[]    // 70% — top scoring approved entries
  explore: KnowledgeEntry[]    // 20% — mid-range or underused entries  
  novel: KnowledgeEntry[]      // 10% — new/untested entries
}> {
  const supabase = await createClient()
  
  const exploitLimit = Math.ceil(limit * 0.7)
  const exploreLimit = Math.ceil(limit * 0.2)
  const novelLimit = Math.max(1, limit - exploitLimit - exploreLimit)
  
  // Base query builder
  const baseQuery = () => {
    let q = supabase.from('knowledge_entries').select('*').contains('lanes', [lane])
    if (categories && categories.length > 0) q = q.in('category', categories)
    return q
  }
  
  // EXPLOIT: top-scoring approved entries, not overused
  const { data: exploit } = await baseQuery()
    .eq('review_status', 'approved')
    .gte('times_used', 0)  // has been used or is new
    .order('effectiveness_score', { ascending: false })
    .order('last_used_at', { ascending: true, nullsFirst: true })  // least recently used first
    .limit(exploitLimit)
  
  // EXPLORE: mid-range entries or underused ones
  const { data: explore } = await baseQuery()
    .in('review_status', ['approved', 'candidate'])
    .gte('effectiveness_score', 30)
    .lte('effectiveness_score', 70)
    .order('times_used', { ascending: true })  // least used first
    .limit(exploreLimit)
  
  // NOVEL: newest entries, not yet proven
  const { data: novel } = await baseQuery()
    .eq('review_status', 'candidate')
    .order('created_at', { ascending: false })
    .limit(novelLimit)
  
  return {
    exploit: exploit || [],
    explore: explore || [],
    novel: novel || [],
  }
}

/** Get KB stats for dashboard display */
export async function getKnowledgeStats(): Promise<{
  total: number
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  byLane: Record<string, number>
  avgEffectiveness: number
}> {
  const supabase = await createClient()
  
  const { data: entries } = await supabase
    .from('knowledge_entries')
    .select('category, review_status, lanes, effectiveness_score')
  
  if (!entries) return { total: 0, byCategory: {}, byStatus: {}, byLane: {}, avgEffectiveness: 0 }
  
  const byCategory: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const byLane: Record<string, number> = {}
  let totalScore = 0
  
  for (const entry of entries) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1
    byStatus[entry.review_status] = (byStatus[entry.review_status] || 0) + 1
    totalScore += Number(entry.effectiveness_score)
    for (const lane of (entry.lanes as string[])) {
      byLane[lane] = (byLane[lane] || 0) + 1
    }
  }
  
  return {
    total: entries.length,
    byCategory,
    byStatus,
    byLane,
    avgEffectiveness: entries.length > 0 ? totalScore / entries.length : 0,
  }
}
```
- **Verify:** `npx tsc --noEmit` — zero errors

### Wave 2: API routes

#### Task 2.1: Knowledge CRUD API route
- **File:** `app/api/knowledge/route.ts`
- **Action:** Create
- **What to do:**
```typescript
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
```
- **Verify:** `npx tsc --noEmit`

#### Task 2.2: Knowledge entry detail route (update + delete)
- **File:** `app/api/knowledge/[id]/route.ts`
- **Action:** Create
- **What to do:**
```typescript
/**
 * Knowledge Entry Detail API
 * PATCH /api/knowledge/[id] — update entry
 * DELETE /api/knowledge/[id] — delete entry
 */
import { NextRequest, NextResponse } from 'next/server'
import { updateKnowledgeEntry, deleteKnowledgeEntry, updateReviewStatus } from '@/app/actions/knowledge'

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Special case: review status change
    if (data._action === 'review') {
      const entry = await updateReviewStatus(id, data.review_status, data.reviewed_by || 'rob')
      return NextResponse.json(entry)
    }
    
    const entry = await updateKnowledgeEntry(id, data)
    return NextResponse.json(entry)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update entry' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteKnowledgeEntry(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete entry' },
      { status: 500 }
    )
  }
}
```
- **Verify:** `npx tsc --noEmit`

#### Task 2.3: Generation-focused KB query route
- **File:** `app/api/knowledge/generate/route.ts`
- **Action:** Create
- **What to do:**
```typescript
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
```
- **Verify:** `npx tsc --noEmit`

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
ls app/actions/knowledge.ts app/api/knowledge/route.ts app/api/knowledge/\[id\]/route.ts app/api/knowledge/generate/route.ts
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat(knowledge): add KB CRUD server actions and API routes"
```

## Build Report (5-point handoff — ALL required)
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-002.md`

## Output
- Branch: `feat/knowledge-base-schema` (same branch as TASK-001)
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-002.md`
- Notify: Dr. Strange via sessions_send
