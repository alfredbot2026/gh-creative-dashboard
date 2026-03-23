import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/llm/client'
import type { ScriptScene } from '@/lib/create/types'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { blockIndex, block, allBlocks, topic, platform } = body as {
    blockIndex: number
    block: ScriptScene
    allBlocks: ScriptScene[]
    topic?: string
    platform?: string
  }

  if (blockIndex === undefined || !block || !allBlocks) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Build context from surrounding blocks
  const prevBlock = blockIndex > 0 ? allBlocks[blockIndex - 1] : null
  const nextBlock = blockIndex < allBlocks.length - 1 ? allBlocks[blockIndex + 1] : null

  const prompt = `You are rewriting ONE block of a ${platform || 'short-form video'} script.

Topic: ${topic || 'Unknown'}
Brand Voice: Taglish (Filipino-English mix, ~60% Filipino), warm, encouraging, practical.

CONTEXT — the blocks around the one you're rewriting:
${prevBlock ? `PREVIOUS BLOCK (${prevBlock.block_label || 'Scene ' + prevBlock.scene_number}): "${prevBlock.script_text}"` : 'This is the FIRST block.'}

BLOCK TO REWRITE (${block.block_label || 'Scene ' + block.scene_number}):
- Label: ${block.block_label || 'Scene ' + block.scene_number}
- Timing: ${block.timing || block.duration_seconds + 's'}
- Current script: "${block.script_text}"
- Current visual: "${block.visual_direction}"
${block.on_screen_text ? `- Current on-screen text: "${block.on_screen_text}"` : ''}

${nextBlock ? `NEXT BLOCK (${nextBlock.block_label || 'Scene ' + nextBlock.scene_number}): "${nextBlock.script_text}"` : 'This is the LAST block.'}

TASK: Write a DIFFERENT version of this block. Keep the same structure role (${block.block_label || 'same type'}) and timing, but give a fresh take — different wording, different angle, different visual approach. Must flow naturally from the previous block and into the next.

Return ONLY valid JSON:
{
  "script_text": "new script text (Taglish)",
  "visual_direction": "new visual direction",
  "on_screen_text": "new text overlay (short, punchy)",
  "production_notes": "any production tips"
}`

  try {
    const result = await generateJSON(
      'You are a creative content strategist specializing in short-form video scripts for Filipino creators.',
      prompt
    )
    return NextResponse.json(result.data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
