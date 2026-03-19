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
