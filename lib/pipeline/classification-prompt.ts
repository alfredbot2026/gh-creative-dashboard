/**
 * Classification Prompt Builder
 * 
 * Builds a structured prompt that uses KB vocabulary to classify content.
 * Pulls hook types and frameworks from knowledge_entries so labels match
 * what the generation system already knows.
 */
import { createClient } from '@/lib/supabase/server'

interface KBEntry {
  title: string
  category: string
}

/**
 * Fetch valid classification vocabulary from the knowledge base.
 */
export async function getKBVocabulary(): Promise<{
  hookTypes: string[]
  frameworks: string[]
}> {
  const supabase = await createClient()

  const [hooks, frameworks] = await Promise.all([
    supabase
      .from('knowledge_entries')
      .select('title')
      .eq('category', 'hook_library')
      .order('title'),
    supabase
      .from('knowledge_entries')
      .select('title')
      .eq('category', 'scripting_framework')
      .order('title'),
  ])

  return {
    hookTypes: (hooks.data || []).map((e: { title: string }) => e.title),
    frameworks: (frameworks.data || []).map((e: { title: string }) => e.title),
  }
}

/**
 * Build the classification prompt for a single content item.
 */
export function buildClassificationPrompt(
  caption: string,
  contentType: string,
  platform: string,
  hookTypes: string[],
  frameworks: string[]
): string {
  const hookList = hookTypes.length > 0
    ? hookTypes.map(h => `- ${h}`).join('\n')
    : `- Curiosity Gap\n- Question Hook\n- Bold Claim\n- Comparison Hook\n- Story Hook\n- Statistic/Number Hook\n- Contrarian\n- How-To/Tutorial Hook\n- List Hook\n- Emotional Hook`

  const frameworkList = frameworks.length > 0
    ? frameworks.map(f => `- ${f}`).join('\n')
    : `- Step-by-Step Tutorial\n- Story Arc / Transformation\n- Listicle\n- Before/After\n- Day in the Life\n- Q&A / FAQ\n- Product Review\n- Behind the Scenes\n- Comparison\n- Case Study`

  return `You are analyzing a social media post from a Filipina paper crafting / planning content creator named Grace. She posts in Taglish (mix of Tagalog and English) about paper crafting, homeschooling, and her business "Papers to Profits."

Analyze this ${platform} ${contentType} post and classify it using the vocabulary below.

POST CAPTION:
"""
${caption || '(no caption)'}
"""

PLATFORM: ${platform}
CONTENT TYPE: ${contentType}

---

Classify using ONLY these options:

HOOK TYPES (pick the closest match):
${hookList}
- Other (specify)

CONTENT STRUCTURES (pick the closest match):
${frameworkList}
- Other (specify)

CONTENT PURPOSE (pick one):
- educate
- story
- sell
- prove
- inspire
- trend

VISUAL STYLE (pick one):
- talking_head
- b_roll_heavy
- text_overlay
- product_demo
- lifestyle
- behind_the_scenes
- tutorial_screencast
- mixed

TEXT OVERLAY STYLE (pick one):
- bold_sans_center
- subtitle_bottom
- minimal_corner
- full_screen_text
- none

PRODUCTION QUALITY (pick one):
- phone_casual
- lit_styled
- studio_pro

CTA TYPE (pick one or more):
- Follow, Save, Comment, Link in Bio, Subscribe, DM, Shop, None

EMOTIONAL TONE (pick one):
- warm_personal
- professional
- excited
- calm
- inspirational
- humorous
- urgent

---

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "hook_type": "...",
  "hook_confidence": 0.0-1.0,
  "structure": "...",
  "structure_confidence": 0.0-1.0,
  "topic_category": "...",
  "content_purpose": "...",
  "visual_style": "...",
  "text_overlay_style": "...",
  "production_quality": "...",
  "cta_type": "...",
  "emotional_tone": "...",
  "taglish_ratio": "...",
  "key_elements": ["...", "..."]
}`
}
