import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/llm/client'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { script, platform } = await request.json()
  if (!script?.trim()) {
    return NextResponse.json({ error: 'Script text is required' }, { status: 400 })
  }

  const platformMap: Record<string, string> = {
    'reels': 'Instagram Reels / TikTok (15-60 seconds, vertical video)',
    'youtube': 'YouTube video (long-form, horizontal)',
    'facebook-post': 'Facebook post (text + optional media)',
  }
  const platformContext = platformMap[platform] || 'social media content'

  const prompt = `You are analyzing and improving a ${platformContext} script for a Filipino homeschool mom who sells handmade journals and crafting supplies.

Brand Voice: Taglish (Filipino-English mix, ~60% Filipino), warm, encouraging, practical.

ORIGINAL SCRIPT:
"""
${script.trim()}
"""

TASK:
1. Analyze the script — identify what works and what needs improvement
2. Rewrite it applying these proven techniques:
   - Hook must grab attention in the first 1-3 seconds (curiosity gap, pattern interrupt, or bold claim)
   - Every sentence must earn the next second of attention
   - Use specific numbers and results, not vague claims
   - End with a clear CTA that gives a reason to act
   - Keep the creator's voice and intent but sharpen everything
   ${platform === 'reels' ? '- Re-hooks every 7-10 seconds to maintain retention\n   - On-screen text suggestions for key moments' : ''}

Return ONLY valid JSON:
{
  "analysis": {
    "strengths": ["what works well (2-3 items)"],
    "improvements": ["what was improved and why (3-5 items)"]
  },
  "improved_script": "the full rewritten script with [BLOCK LABELS] marking each section",
  "hook_score_before": 5,
  "hook_score_after": 8,
  "overall_notes": "1-2 sentence summary of what changed"
}`

  try {
    const result = await generateJSON(
      'You are a content strategist specializing in short-form video scripts for Filipino creators.',
      prompt
    )
    return NextResponse.json(result.data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
