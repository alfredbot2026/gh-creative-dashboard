/**
 * Category-specific extraction prompts for NotebookLM.
 * Each prompt asks for structured, specific knowledge — not generic summaries.
 * The response is then parsed by Gemini into KnowledgeEntry objects.
 */
import type { KnowledgeCategory, ContentLane } from './types'

export interface ExtractionPrompt {
  category: KnowledgeCategory
  query: string
  expectedLanes: ContentLane[]
  followUpQueries?: string[]  // optional deeper dives
}

export const EXTRACTION_PROMPTS: ExtractionPrompt[] = [
  {
    category: 'hook_library',
    query: `Extract every specific HOOK PATTERN or HOOK FRAMEWORK mentioned in this notebook. For each hook pattern:
1. Name it (e.g., "The Iceberg Effect", "Comparison Hook", "Ugly Hook")
2. Explain the structure/formula (how does it work?)
3. Give 2-3 EXACT examples of hooks using this pattern (word-for-word, not paraphrased)
4. Note which platforms it works best on
5. Note any data or evidence about its effectiveness

Format your response as a numbered list. Be exhaustive — include every distinct hook pattern, not just the top ones.`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
    followUpQueries: [
      'Are there any hook patterns specifically for ads or sales content? List them with examples.',
      'What are the "triple hook" rules — verbal, written, and visual hooks working together? Give specific examples.',
    ],
  },
  {
    category: 'scripting_framework',
    query: `Extract every SCRIPTING FRAMEWORK, SCRIPT STRUCTURE, or CONTENT FORMAT mentioned in this notebook. For each:
1. Name it (e.g., "Iverson Crossover", "Dance Method", "Hook-Hold-Reward")
2. Explain the step-by-step structure
3. Give a concrete example of a script following this framework
4. Note what content type it's best for (reel, YouTube, ad, etc.)
5. Note any effectiveness data

Be exhaustive — include every distinct framework.`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'content_funnel',
    query: `Extract every CONTENT STRATEGY FRAMEWORK mentioned — funnels (TOFU/MOFU/BOFU), posting frameworks (like 70/20/10), content pillar systems, series strategies, etc. For each:
1. Name it
2. Explain how it works in detail
3. Give specific examples of content for each stage/category
4. Note recommended ratios or posting frequencies
5. Note any evidence of effectiveness`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'virality_science',
    query: `Extract every VIRALITY PATTERN, SCIENTIFIC FINDING, or ALGORITHM INSIGHT mentioned. For each:
1. Name or describe the pattern (e.g., "5X Rule", "3-Second Rule", "STEPPS Framework", "Physiological Arousal Theory")
2. Explain the mechanism — why does this work?
3. Cite any specific data or research (percentages, study findings)
4. Note practical implications — how do you use this when creating content?
5. Note which platforms this applies to`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'ad_creative',
    query: `Extract every AD CREATIVE FRAMEWORK, AD COPY PATTERN, or ADVERTISING STRATEGY mentioned. For each:
1. Name it (e.g., "Angle Shifts", "Entity ID Trap", "Sell-by-Chat", "Creative as Targeting")
2. Explain how it works
3. Give specific examples of ad copy or creative approaches using this framework
4. Note any performance data (ROAS, CTR, conversion rates)
5. Note what ad format it's best for (static, video, carousel)`,
    expectedLanes: ['ads'],
    followUpQueries: [
      'What are the specific "angle shift" categories for ad creative? List each angle type with an example ad script.',
      'What objection-killing strategies are documented? List each with the exact objection and the counter-approach.',
    ],
  },
  {
    category: 'platform_intelligence',
    query: `Extract every PLATFORM-SPECIFIC INSIGHT about how algorithms work, what metrics matter, and what content performs best on each platform (Instagram, TikTok, YouTube, Facebook). For each:
1. Which platform
2. The specific insight or rule
3. Any data backing it up
4. Practical implication for content creators`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'competitor_intel',
    query: `Extract every COMPETITOR ANALYSIS, COMPETITIVE INSIGHT, or COMPETITIVE STRATEGY mentioned. For each:
1. Who is the competitor
2. What they do well / what their strategy is
3. What gaps or weaknesses exist
4. How to position against them
5. Any specific messaging hooks derived from competitive analysis`,
    expectedLanes: ['short-form', 'ads'],
  },
  {
    category: 'ai_prompting',
    query: `Extract every AI CONTENT CREATION WORKFLOW, PROMPTING TECHNIQUE, or AI-ASSISTED WRITING STRATEGY mentioned. For each:
1. Name it (e.g., "Brand Voice Injection", "Hook Architect", "Emotional Temperature Mapping")
2. Explain the step-by-step process
3. Give the exact prompt template or approach
4. Note what it's used for (hooks, scripts, carousel copy, etc.)
5. Note any "banned words" lists or quality checks mentioned`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'cro_patterns',
    query: `Extract every CONVERSION OPTIMIZATION PATTERN, LANDING PAGE TECHNIQUE, or CHECKOUT OPTIMIZATION mentioned. For each:
1. Name or describe the pattern
2. Explain how it works
3. Give specific examples
4. Note any conversion rate data
5. Note what type of product/service it's best for`,
    expectedLanes: ['ads'],
  },
]

/** Get extraction prompts relevant to a notebook based on its title/topic */
export function getPromptsForNotebook(notebookTitle: string): ExtractionPrompt[] {
  const title = notebookTitle.toLowerCase()
  
  // Content/viral notebooks get most categories
  if (title.includes('viral') || title.includes('personal brand') || title.includes('chris chung')) {
    return EXTRACTION_PROMPTS.filter(p => 
      ['hook_library', 'scripting_framework', 'content_funnel', 'virality_science', 
       'platform_intelligence', 'ai_prompting'].includes(p.category)
    )
  }
  
  // Ad-focused notebooks
  if (title.includes('ads') || title.includes('meta') || title.includes('conversion') || title.includes('p2p')) {
    return EXTRACTION_PROMPTS.filter(p =>
      ['ad_creative', 'platform_intelligence', 'cro_patterns'].includes(p.category)
    )
  }
  
  // Competitor notebooks
  if (title.includes('competitor') || title.includes('swipefile')) {
    return EXTRACTION_PROMPTS.filter(p =>
      ['competitor_intel', 'ad_creative'].includes(p.category)
    )
  }
  
  // CRO notebooks
  if (title.includes('cro')) {
    return EXTRACTION_PROMPTS.filter(p =>
      ['cro_patterns', 'ad_creative'].includes(p.category)
    )
  }
  
  // Default: all prompts
  return EXTRACTION_PROMPTS
}
