import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getContextWithPinnedSelections } from '@/lib/create/kb-retriever'
import { generateJSON } from '@/lib/llm/client'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    topic,
    video_type = 'tutorial',
    target_length = '8-12',
    content_purpose,
    product_name,
    hook_id,
    framework_id,
  } = body

  if (!topic && !content_purpose) {
    return NextResponse.json({ error: 'Topic or content purpose is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Load brand context
  const { data: profile } = await supabase
    .from('business_profile')
    .select('business_name, brand_voice, target_audience, content_pillars')
    .limit(1)
    .maybeSingle()

  const { data: persona } = await supabase
    .from('brand_persona')
    .select('character_name, backstory, voice_preset, custom_voice_notes')
    .limit(1)
    .maybeSingle()

  // Retrieve relevant knowledge
  const knowledge = await getContextWithPinnedSelections(
    'youtube',
    ['hook_library', 'content_funnel', 'viral_anatomy', 'retention_techniques'],
    hook_id,
    framework_id,
    8,
  )

  const kbContext = knowledge.entries.length > 0
    ? knowledge.entries.map(e => `[${e.category}] ${e.title}: ${e.content}`).join('\n')
    : ''

  const voiceGuide = persona?.voice_preset === 'custom' && persona?.custom_voice_notes
    ? persona.custom_voice_notes
    : persona?.voice_preset === 'warm_empowering'
    ? 'Warm, encouraging ate energy. Mix of Filipino and English (Taglish). Speak like a trusted older sister.'
    : persona?.voice_preset === 'hustle_queen'
    ? 'Motivational, high-energy. Push viewers to take action. Taglish with more power words.'
    : persona?.voice_preset === 'expert_teacher'
    ? 'Clear, structured, educational. Use numbered steps and visual cues.'
    : 'Warm and relatable Taglish voice.'

  const prompt = `You are a YouTube script writer for ${profile?.business_name || 'a Filipino creator'}.

BRAND CONTEXT:
- Creator: ${persona?.character_name || 'Grace'}
- Backstory: ${persona?.backstory || 'Filipino mompreneur'}
- Target audience: ${profile?.target_audience || 'Filipino moms who want to earn from home'}
- Voice: ${voiceGuide}
- Content pillars: ${(profile?.content_pillars || []).join(', ')}

VIDEO DETAILS:
- Topic: ${topic || `${content_purpose} content`}
- Type: ${video_type}
- Target length: ${target_length} minutes
${product_name ? `- Featured product: ${product_name}` : ''}
${content_purpose ? `- Content purpose: ${content_purpose}` : ''}

KNOWLEDGE BASE CONTEXT:
${kbContext || '(no specific knowledge entries matched)'}

Write a complete YouTube script with these sections:
1. HOOK (first 5-10 seconds) — grab attention immediately. Use a proven hook pattern.
2. INTRO (15-30 seconds) — establish credibility, preview what they'll learn
3. MAIN CONTENT — the meat of the video. Break into clear segments/chapters.
4. CTA — what to do next (subscribe, comment, buy, etc.)
5. OUTRO — warm closing

For each section, include:
- Speaking lines (what to say, in Taglish)
- Visual notes [in brackets] describing what's on screen
- Timing estimates

Also provide:
- Title options (3 clickable titles)
- Description (SEO-optimized, with relevant keywords)
- Tags (10-15 YouTube tags)
- Thumbnail concept (what the thumbnail should show)

Respond in JSON format:
{
  "title_options": ["...", "...", "..."],
  "description": "...",
  "tags": ["...", ...],
  "thumbnail_concept": "...",
  "total_duration_estimate": "...",
  "sections": [
    {
      "name": "HOOK",
      "duration": "0:00 - 0:10",
      "speaking_lines": "...",
      "visual_notes": "...",
      "tips": "..."
    },
    ...
  ]
}`

  const systemPrompt = 'You are a YouTube script writer. Output valid JSON only. No markdown fences.'

  const result = await generateJSON<any>(systemPrompt, prompt)

  return NextResponse.json({
    ...result.data,
    model: result.model,
    knowledge_used: knowledge.entries.map(e => ({
      title: e.title,
      category: e.category,
    })),
  })
}
