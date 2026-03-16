/**
 * LLM Prompt Builder
 * Assembles rich context for the content strategy generator.
 * 
 * Two-fold generation approach:
 * 1. Analyze what we've done → avoid repeats, learn from patterns
 * 2. Pull research principles → align content with proven strategies
 * 
 * Every generated item includes research_refs for traceability.
 */

import { createClient } from '@/lib/supabase/server'

/* -- Output shape the LLM should produce -- */
export interface GeneratedContentItem {
    title: string
    content_type: string    // reel, youtube, youtube_short, ad, story, carousel, post
    platform: string        // instagram, youtube, tiktok, facebook
    hook: string            // opening hook (first 3 seconds)
    cta: string             // call to action
    scheduled_date: string  // YYYY-MM-DD
    reasoning: string       // why this content was suggested
    research_refs: string[] // titles of research sources used
    script_data: {
        format: string      // e.g. "UGC Selfie", "Talking Head + B-roll", "Slideshow"
        length: string      // e.g. "60s", "45s", "15s"
        scene_brief: {
            visual_goal: string
            setting: string
            camera: string
            first_frame: string
            lighting: string
            avoid: string
            mood_ref: string
        }
        script: Array<{
            time: string        // e.g. "0-5s"
            visual: string      // what the viewer sees
            says: string        // what the person says (dialogue)
            text_overlay: string // on-screen text
        }>
    }
}

export interface GeneratedPlan {
    week_summary: string
    items: GeneratedContentItem[]
}

/**
 * Build the full content plan prompt with all context.
 * Fetches: business profile, recent content (memory), research insights, top ads.
 * Optionally includes fresh research from NotebookLM if available.
 */
export async function buildContentPlanPrompt(
    weekStartDate: string,
    freshResearch?: string | null
): Promise<{ systemPrompt: string; userPrompt: string }> {
    const supabase = await createClient()

    // -- Fetch all context in parallel for speed --
    const [profileResult, recentResult, insightsResult, topAdsResult] = await Promise.all([
        // 1. Business profile
        supabase.from('business_profile').select('*').limit(1).single(),
        // 2. Content memory (last 30 days)
        supabase.from('content_items')
            .select('title, content_type, platform, scheduled_date, hook, cta, status')
            .gte('scheduled_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('scheduled_date', { ascending: false })
            .limit(50),
        // 3. Research insights (saved from NotebookLM queries)
        supabase.from('research_insights')
            .select('topic, title, content, actionable_takeaways, source')
            .order('created_at', { ascending: false })
            .limit(15),
        // 4. Top performing ads (what creative works)
        supabase.from('ad_performance')
            .select('campaign_name, ad_name, spend, roas, ctr, conversions, status, ad_copy, headline, cta_type, creative_type')
            .order('roas', { ascending: false })
            .limit(10),
    ])

    const profile = profileResult.data
    const recentContent = recentResult.data
    const insights = insightsResult.data
    const topAds = topAdsResult.data

    // -- Count available context for the report --
    const contextReport = {
        hasProfile: !!profile,
        recentContentCount: recentContent?.length || 0,
        insightsCount: insights?.length || 0,
        adsCount: topAds?.length || 0,
        hasFreshResearch: !!freshResearch,
    }
    console.log('[Content Generation] Context:', contextReport)

    // ====================================================
    // BUILD SYSTEM PROMPT — Two-fold approach
    // ====================================================

    let systemPrompt = `You are a content strategy AI for a creative business.
You generate weekly content plans using a TWO-FOLD approach:

## APPROACH
**FOLD 1 — LEARN FROM THE PAST:**
- Analyze what content was already created (see CONTENT MEMORY below)
- Identify what's working (formats, hooks, platforms with most activity)
- Never repeat similar titles, hooks, or formats within 2 weeks
- Build on successful patterns while keeping things fresh

**FOLD 2 — APPLY RESEARCH PRINCIPLES:**
- Use research insights and viral content principles to guide each suggestion
- Every piece of content must be backed by at least one principle or data point
- Align hooks with proven viral patterns (curiosity gaps, pattern interrupts, emotional triggers)
- Match CTAs with conversion-driving patterns from ad data

## RULES
1. Every content suggestion MUST reference a research insight, ad finding, or proven principle
2. Never suggest content too similar to items in the CONTENT MEMORY section
3. Include specific, ready-to-use hooks (not generic — these should be copy-pasteable)
4. CTAs should be specific and conversion-focused
5. Spread content evenly across the week (at least 1 item per day)
6. Mix content types and platforms for variety
7. Output valid JSON matching the schema below

## OUTPUT FORMAT
Generate FULL PRODUCTION SCRIPTS for each content piece.
Every item must include a scene_brief (production direction) and a script (shot-by-shot).
The script dialogue can mix English and Filipino/Taglish to feel natural and relatable.

{
  "week_summary": "Brief strategic overview of this week's plan and WHY these were chosen",
  "items": [
    {
      "title": "Specific content title (e.g. AD-005 — Student Speaks)",
      "content_type": "reel|youtube|youtube_short|ad|story|carousel|post",
      "platform": "instagram|youtube|tiktok|facebook",
      "hook": "Word-for-word opening hook text (first 3 seconds)",
      "cta": "Exact call to action text",
      "scheduled_date": "YYYY-MM-DD",
      "reasoning": "WHY this content was chosen — what principle or data backs it",
      "research_refs": ["Name of principle/source 1", "Name of principle/source 2"],
      "script_data": {
        "format": "UGC Selfie | Talking Head + B-roll | Slideshow | Screen Recording",
        "length": "60s",
        "scene_brief": {
          "visual_goal": "What should the viewer FEEL when they see this? Describe the vibe.",
          "setting": "Describe the physical setting in detail. Be specific.",
          "camera": "Camera angle and movement (handheld, selfie, tripod, etc.)",
          "first_frame": "Exactly what appears in the FIRST FRAME the viewer sees.",
          "lighting": "Lighting setup — natural, ring light, window, etc.",
          "avoid": "What to NOT do — things that would break the vibe.",
          "mood_ref": "Reference video or vibe — like 'a TikTok from a real customer sharing results'"
        },
        "script": [
          {
            "time": "0-5s",
            "visual": "What the viewer sees on screen",
            "says": "Exact dialogue the person says (can be Taglish)",
            "text_overlay": "ON-SCREEN TEXT IN CAPS"
          }
        ]
      }
    }
  ]
}`

    // -- Add business context --
    if (profile) {
        systemPrompt += `\n\n## BUSINESS PROFILE
- Business: ${profile.business_name}
- Industry: ${profile.industry}
- Audience: ${profile.target_audience}
- Brand voice: ${profile.brand_voice}
- Content pillars: ${JSON.stringify(profile.content_pillars)}
- Products/Services: ${JSON.stringify(profile.products_services)}
- USPs: ${JSON.stringify(profile.unique_selling_points)}
- Platforms: ${JSON.stringify(profile.platforms)}`
    }

    // -- Add content memory (FOLD 1 — learn from past) --
    if (recentContent && recentContent.length > 0) {
        systemPrompt += `\n\n## CONTENT MEMORY (FOLD 1 — LEARN FROM THESE, DON'T REPEAT)
${recentContent.map(c => `- [${c.content_type}/${c.platform}] "${c.title}" (${c.scheduled_date}) [${c.status}]${c.hook ? ` Hook: "${c.hook}"` : ''}`).join('\n')}`
    } else {
        systemPrompt += `\n\n## CONTENT MEMORY
No previous content found. This is a fresh start — be bold with variety.`
    }

    // -- Add saved research insights (FOLD 2 — apply principles) --
    if (insights && insights.length > 0) {
        systemPrompt += `\n\n## RESEARCH INSIGHTS (FOLD 2 — APPLY THESE PRINCIPLES)
${insights.map(i => `### ${i.title} [${i.topic}]${i.source ? ` — from: ${i.source}` : ''}
${i.content?.slice(0, 400)}
${i.actionable_takeaways && (i.actionable_takeaways as string[]).length > 0 ? `Key Takeaways: ${JSON.stringify(i.actionable_takeaways)}` : ''}`).join('\n\n')}`
    } else {
        systemPrompt += `\n\n## RESEARCH INSIGHTS
No saved research insights yet. Use general best practices for content creation.`
    }

    // -- Add fresh NotebookLM research (if available) --
    if (freshResearch) {
        systemPrompt += `\n\n## FRESH RESEARCH (JUST QUERIED FROM NOTEBOOKLM)
This is live research pulled right before generation. Use these insights heavily.

${freshResearch.slice(0, 2000)}`
    }

    // -- Add ad performance context --
    if (topAds && topAds.length > 0) {
        systemPrompt += `\n\n## TOP PERFORMING ADS (LEARN FROM AD CREATIVE)
These ads are performing well. Mirror their hooks, formats, and CTAs in organic content.
${topAds.map(a => `- ${a.campaign_name} / ${a.ad_name}: ROAS ${a.roas}x, CTR ${(parseFloat(a.ctr) * 100).toFixed(1)}%, ${a.conversions} conversions
  Copy: "${a.ad_copy || 'N/A'}" | Headline: "${a.headline || 'N/A'}" | CTA: ${a.cta_type || 'N/A'} | Format: ${a.creative_type || 'unknown'}`).join('\n')}`
    }

    // -- Build user prompt --
    const weekEnd = new Date(weekStartDate)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const userPrompt = `Generate a content plan for the week of ${weekStartDate} to ${weekEnd.toISOString().split('T')[0]}.

Create 7-10 content items spread across the week. Each item must:
1. Not repeat any topic/hook from the CONTENT MEMORY
2. Reference at least one principle from RESEARCH INSIGHTS or FRESH RESEARCH
3. Have a specific, word-for-word hook that's ready to use
4. Have a conversion-focused CTA
5. Include a FULL PRODUCTION SCRIPT with scene_brief and shot-by-shot script breakdown

IMPORTANT for scripts:
- Write REAL, specific dialogue — not generic placeholder text
- The dialogue should feel natural and relatable (Taglish is OK)
- Scene briefs should describe exactly what to set up for the shoot
- Script timing should add up to the total length
- Each script row must have a specific visual, exact dialogue, and text overlay
- Vary the formats: mix UGC selfie, talking head + B-roll, slideshows, screen recordings

Prioritize content types and platforms based on what's been performing well in the ads and past content.`

    return { systemPrompt, userPrompt }
}
