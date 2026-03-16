/**
 * Single Conversation API — Get messages and Delete
 * GET    /api/conversations/[id] → load all messages
 * DELETE /api/conversations/[id] → delete conversation + messages
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/* GET — load all messages for a conversation */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        // Get conversation info
        const { data: conversation, error: convError } = await supabase
            .from('chat_conversations')
            .select('id, title, summary, created_at')
            .eq('id', id)
            .single()

        if (convError) throw new Error(convError.message)

        // Get all messages for this conversation
        const { data: messages, error: msgError } = await supabase
            .from('chat_messages')
            .select('id, role, content, metadata, created_at')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true })

        if (msgError) throw new Error(msgError.message)

        return NextResponse.json({ conversation, messages })
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load conversation' },
            { status: 500 }
        )
    }
}

/* DELETE — remove conversation and all its messages (cascade) */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { error } = await supabase
            .from('chat_conversations')
            .delete()
            .eq('id', id)

        if (error) throw new Error(error.message)
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to delete conversation' },
            { status: 500 }
        )
    }
}
