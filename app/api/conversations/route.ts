/**
 * Conversations API — List and Create
 * GET  /api/conversations → list all conversations
 * POST /api/conversations → create a new conversation
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/* GET — list all conversations, newest first */
export async function GET() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('chat_conversations')
            .select('id, title, summary, created_at, updated_at')
            .order('updated_at', { ascending: false })
            .limit(50)

        if (error) throw new Error(error.message)
        return NextResponse.json({ conversations: data })
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to list conversations' },
            { status: 500 }
        )
    }
}

/* POST — create a new conversation */
export async function POST() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('chat_conversations')
            .insert({ title: 'New conversation' })
            .select('id, title, created_at')
            .single()

        if (error) throw new Error(error.message)
        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to create conversation' },
            { status: 500 }
        )
    }
}
