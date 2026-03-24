/**
 * Generation Audit Script
 * Tests every platform + structure combo and saves results for comparison.
 */
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3000'
const TOPIC = 'How to start a sticker business with less than 500 pesos'

// Auth: we need a valid session cookie
async function getAuthCookie() {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    'https://mnqwquoewvgfztenyygf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucXdxdW9ld3ZnZnp0ZW55eWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTMxMzEsImV4cCI6MjA4ODU4OTEzMX0.gmiE3MVmHS5-FlmN_9Hvtz-n0K1Yqx9YVsCKsILTdq8'
  )
  const { data } = await supabase.auth.signInWithPassword({
    email: 'grace@ghcreative.test',
    password: 'testpass123'
  })
  return data.session?.access_token
}

const TEST_CASES = [
  // Facebook Ads (6 structures + 1 no-structure)
  { platform: 'facebook-ad', goal: 'sell', structure_slug: 'before-after-bridge', name: 'Before-After-Bridge' },
  { platform: 'facebook-ad', goal: 'sell', structure_slug: 'benefit-caveat', name: 'Benefit-Caveat' },
  { platform: 'facebook-ad', goal: 'sell', structure_slug: 'hook-story-offer', name: 'Hook-Story-Offer' },
  { platform: 'facebook-ad', goal: 'sell', structure_slug: 'pas', name: 'PAS' },
  { platform: 'facebook-ad', goal: 'sell', structure_slug: 'pastor', name: 'PASTOR' },
  { platform: 'facebook-ad', goal: 'sell', structure_slug: 'who-why-offer-action', name: 'WHO-WHY-OFFER-ACTION' },
  { platform: 'facebook-ad', goal: 'sell', structure_slug: null, name: '(No structure)' },
  
  // Reels (7 structures + 1 no-structure)
  { platform: 'reels', goal: 'educate', structure_slug: 'comparison', name: 'Comparison' },
  { platform: 'reels', goal: 'educate', structure_slug: 'full-reel-anatomy', name: 'Full Reel Anatomy' },
  { platform: 'reels', goal: 'educate', structure_slug: 'hook-hold-reward', name: 'Hook-Hold-Reward' },
  { platform: 'reels', goal: 'educate', structure_slug: 'iceberg-effect', name: 'Iceberg Effect' },
  { platform: 'reels', goal: 'story', structure_slug: 'micro-story-arc', name: 'Micro-Story Arc' },
  { platform: 'reels', goal: 'educate', structure_slug: 'myth-truth-move', name: 'Myth, Truth, Move' },
  { platform: 'reels', goal: 'educate', structure_slug: 'show-then-tell', name: 'Show Then Tell' },
  { platform: 'reels', goal: 'educate', structure_slug: null, name: '(No structure)' },
  
  // Facebook Posts (4 structures + 1 no-structure)
  { platform: 'facebook-post', goal: 'story', structure_slug: 'four-founder-videos', name: '4 Founder Videos' },
  { platform: 'facebook-post', goal: 'story', structure_slug: 'six-step-my-story', name: '6-Step My Story' },
  { platform: 'facebook-post', goal: 'story', structure_slug: 'three-part-brand-story', name: 'Three-Part Brand Story' },
  { platform: 'facebook-post', goal: 'story', structure_slug: 'year-by-year', name: 'Year-by-Year' },
  { platform: 'facebook-post', goal: 'story', structure_slug: null, name: '(No structure)' },
  
  // YouTube (3 structures + 1 no-structure)
  { platform: 'youtube', goal: 'educate', structure_slug: 'four-cs-youtube-intro', name: '4 Cs YouTube Intro' },
  { platform: 'youtube', goal: 'educate', structure_slug: 'heit-framework', name: 'HEIT Framework' },
  { platform: 'youtube', goal: 'educate', structure_slug: 'one-concept-five-stories', name: 'One Concept, Five Stories' },
  { platform: 'youtube', goal: 'educate', structure_slug: null, name: '(No structure)' },
]

async function runAudit() {
  const token = await getAuthCookie()
  if (!token) {
    console.error('Failed to get auth token')
    process.exit(1)
  }
  
  const results = []
  let passed = 0
  let failed = 0
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i]
    const label = `[${i+1}/${TEST_CASES.length}] ${tc.platform} | ${tc.name}`
    process.stdout.write(`${label}... `)
    
    try {
      const body = {
        topic: TOPIC,
        platform: tc.platform,
        contentType: tc.goal,
        variants: 1,  // Just 1 variant per combo to save API calls
      }
      if (tc.structure_slug) body.structure_slug = tc.structure_slug
      
      const res = await fetch(`${BASE_URL}/api/create/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sb-mnqwquoewvgfztenyygf-auth-token=${token}`
        },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (!res.ok || data.error) {
        console.log('❌ ERROR: ' + (data.error || res.status))
        results.push({ ...tc, status: 'ERROR', error: data.error || res.status, variant: null })
        failed++
        continue
      }
      
      const variant = data.variants?.[0]
      if (!variant) {
        console.log('❌ NO VARIANTS')
        results.push({ ...tc, status: 'NO_VARIANTS', error: 'Empty variants array', variant: null })
        failed++
        continue
      }
      
      const content = variant.content || {}
      const scenes = content.scenes || []
      const hasBlocks = scenes.length > 0 && scenes[0]?.block_label
      const blockLabels = scenes.map(s => s.block_label).filter(Boolean)
      
      const analysis = {
        hook: variant.hook || '(none)',
        hookLength: (variant.hook || '').length,
        hasScenes: scenes.length > 0,
        sceneCount: scenes.length,
        hasBlockLabels: hasBlocks,
        blockLabels,
        hasCaption: !!content.caption,
        captionLength: (content.caption || '').length,
        hasHeadline: !!content.headline,
        headline: content.headline || null,
        hasPrimaryText: !!content.primaryText,
        hasSlides: !!(content.slides?.length),
        slideCount: content.slides?.length || 0,
        hasSections: !!(content.sections?.length),
        sectionCount: content.sections?.length || 0,
        qualityScore: variant.qualityScore || null,
        totalScriptLength: scenes.map(s => (s.script_text || '').length).reduce((a,b) => a+b, 0),
      }
      
      // Determine if output format is correct
      let formatCorrect = false
      if (tc.structure_slug) {
        // With structure: expect scenes with block_labels
        formatCorrect = hasBlocks && scenes.length >= 3
      } else {
        // Without structure: depends on platform
        if (tc.platform === 'reels') formatCorrect = scenes.length > 0
        else if (tc.platform === 'youtube') formatCorrect = scenes.length > 0 || (content.sections?.length > 0)
        else if (tc.platform === 'facebook-ad') formatCorrect = !!content.headline || hasBlocks
        else if (tc.platform === 'facebook-post') formatCorrect = !!content.caption || hasBlocks
      }
      
      const status = formatCorrect ? 'PASS' : 'FORMAT_ISSUE'
      console.log(status === 'PASS' ? '✅' : '⚠️', 
        `scenes:${scenes.length} blocks:${hasBlocks} hook:${(variant.hook||'').substring(0,50)}...`)
      
      results.push({ ...tc, status, analysis, variant })
      if (status === 'PASS') passed++
      else failed++
      
    } catch (err) {
      console.log('❌ EXCEPTION: ' + err.message)
      results.push({ ...tc, status: 'EXCEPTION', error: err.message, variant: null })
      failed++
    }
    
    // Small delay to not hammer the API
    await new Promise(r => setTimeout(r, 1000))
  }
  
  // Write full results
  const outputPath = path.join(__dirname, '..', 'GENERATION-AUDIT.md')
  let md = `# Generation Audit Report\n`
  md += `**Date:** ${new Date().toISOString()}\n`
  md += `**Topic:** "${TOPIC}"\n`
  md += `**Total:** ${TEST_CASES.length} | **Pass:** ${passed} | **Issues:** ${failed}\n\n`
  
  md += `## Summary\n\n`
  md += `| # | Platform | Structure | Goal | Status | Scenes | Blocks | Hook (truncated) |\n`
  md += `|---|----------|-----------|------|--------|--------|--------|------------------|\n`
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const a = r.analysis || {}
    md += `| ${i+1} | ${r.platform} | ${r.name} | ${r.goal} | ${r.status} | ${a.sceneCount || 0} | ${a.hasBlockLabels ? a.blockLabels?.length : 0} | ${(a.hook || r.error || '').substring(0, 60)} |\n`
  }
  
  md += `\n---\n\n## Detailed Output\n\n`
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    md += `### ${i+1}. ${r.platform} — ${r.name} (${r.goal})\n`
    md += `**Status:** ${r.status}\n\n`
    
    if (r.error) {
      md += `**Error:** ${r.error}\n\n`
      continue
    }
    
    const v = r.variant
    const a = r.analysis
    if (!v) continue
    
    md += `**Hook:** ${v.hook}\n`
    md += `**Quality Score:** ${a.qualityScore || 'N/A'}\n\n`
    
    const content = v.content || {}
    
    if (a.hasBlockLabels) {
      md += `**Blocks (${a.blockLabels.length}):** ${a.blockLabels.join(' → ')}\n\n`
      for (const s of content.scenes) {
        md += `#### ${s.block_label}\n`
        if (s.timing) md += `*Timing: ${s.timing}*\n\n`
        md += `${s.script_text || '(no text)'}\n\n`
        if (s.visual_direction) md += `> Visual: ${s.visual_direction}\n\n`
        if (s.on_screen_text) md += `> On-screen: ${s.on_screen_text}\n\n`
      }
    } else if (content.scenes?.length) {
      md += `**Scenes (${content.scenes.length}):**\n\n`
      for (const s of content.scenes) {
        md += `- **Scene ${s.sceneNumber || '?'}:** ${s.voiceover || s.script_text || ''}\n`
        if (s.visual || s.visual_direction) md += `  > Visual: ${s.visual || s.visual_direction}\n`
      }
      md += '\n'
    } else if (content.headline) {
      md += `**Headline:** ${content.headline}\n`
      md += `**Primary Text:** ${content.primaryText || content.body || ''}\n`
      if (content.imagePrompt) md += `**Image Prompt:** ${content.imagePrompt}\n`
      md += '\n'
    } else if (content.caption) {
      md += `**Caption:**\n${content.caption}\n\n`
      if (content.hashtags?.length) md += `**Hashtags:** ${content.hashtags.map(h => '#' + h.replace('#','')).join(' ')}\n\n`
    } else if (content.slides?.length) {
      md += `**Slides (${content.slides.length}):**\n\n`
      for (const s of content.slides) {
        md += `- Slide: ${s.text}\n`
      }
      md += '\n'
    } else if (content.sections?.length) {
      md += `**Sections (${content.sections.length}):**\n\n`
      for (const s of content.sections) {
        md += `- **${s.timestamp || ''}:** ${s.content || ''}\n`
      }
      md += '\n'
    } else {
      md += `**Raw content:** ${JSON.stringify(content).substring(0, 500)}\n\n`
    }
    
    md += `---\n\n`
  }
  
  fs.writeFileSync(outputPath, md)
  console.log(`\n✅ Audit complete. Report: ${outputPath}`)
  console.log(`Pass: ${passed}/${TEST_CASES.length} | Issues: ${failed}/${TEST_CASES.length}`)
}

runAudit().catch(console.error)
