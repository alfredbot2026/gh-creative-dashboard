/**
 * Import seed-output batch JSON files into hook_bank + script_bank
 * 
 * Maps 129 batch files (1,161 variants) into:
 * - hook_bank: one row per variant (hook_text + metadata)
 * - script_bank: one row per variant (full content/scenes)
 * 
 * Run: cd gh-creative-dashboard && export $(grep -v '^#' .env.local | xargs) && node scripts/import-seed-variants.js
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const SEED_DIR = '/home/rob/.openclaw/workspace-coding/seed-output'
const BATCH_INSERT_SIZE = 50

// Map content goal keywords to angles
function inferAngle(hook, content) {
  const text = (hook + ' ' + JSON.stringify(content)).toLowerCase()
  if (text.includes('proof') || text.includes('resibo') || text.includes('receipt') || text.includes('screenshot') || text.includes('gcash'))
    return 'prove'
  if (text.includes('enroll') || text.includes('₱1,300') || text.includes('sign up') || text.includes('dm me') || text.includes('last chance'))
    return 'sell'
  if (text.includes('story') || text.includes('noong') || text.includes('kwento') || text.includes('nanay'))
    return 'story'
  if (text.includes('how to') || text.includes('step') || text.includes('tip') || text.includes('mistake') || text.includes('paano'))
    return 'educate'
  if (text.includes('inspire') || text.includes('dream') || text.includes('pangarap') || text.includes('kaya mo'))
    return 'inspire'
  return 'story' // default
}

// Infer format from content structure
function inferFormat(content) {
  if (!content || typeof content !== 'object') return 'video_ugc'
  if (content.slides) return 'carousel'
  if (content.blocks) {
    // Static image posts use blocks without scenes
    const blocks = Array.isArray(content.blocks) ? content.blocks : []
    const hasImagePrompt = blocks.some(b => b.imagePrompt) || content.imagePrompt
    if (hasImagePrompt) return 'static_image'
    return 'video_ugc'
  }
  if (content.scenes) return 'video_ugc'
  if (content.format === 'instagram_carousel') return 'carousel'
  if (content.platform === 'TikTok/Reels' || content.platform === 'Reels/TikTok') return 'video_ugc'
  return 'video_ugc'
}

// Extract scenes/blocks into a normalized scenes array for script_bank
function extractScenes(content) {
  if (!content || typeof content !== 'object') return []
  if (content.scenes && Array.isArray(content.scenes)) return content.scenes
  if (content.blocks && Array.isArray(content.blocks)) {
    return content.blocks.map((b, i) => ({
      block_id: b.block_id || b.id || `block_${i+1}`,
      block_label: b.block_label || b.label || b.headline || `Block ${i+1}`,
      timing: b.timing || '',
      script_text: b.subtext || b.text || b.script_text || '',
      visual_direction: b.imagePrompt || b.visual_direction || '',
      headline: b.headline || '',
    }))
  }
  if (content.slides && Array.isArray(content.slides)) {
    return content.slides.map((s, i) => ({
      block_id: `slide_${i+1}`,
      block_label: s.title || s.headline || `Slide ${i+1}`,
      timing: '',
      script_text: s.text || s.body || s.caption || '',
      visual_direction: s.imagePrompt || s.visual_direction || s.image_description || '',
    }))
  }
  return []
}

// Infer hook_type from hook text
function inferHookType(hook) {
  const h = hook.toLowerCase()
  if (h.includes('?')) return 'question'
  if (h.includes('hindi') || h.includes('never') || h.includes('stop') || h.includes('unpopular'))
    return 'contrarian'
  if (h.includes('₱') || h.includes('sold') || h.includes('orders') || h.includes('gcash'))
    return 'social_proof'
  if (h.includes('secret') || h.includes('nobody') || h.includes('they don\'t'))
    return 'curiosity_gap'
  if (h.includes('how') || h.includes('paano') || h.includes('step'))
    return 'how_to'
  if (h.includes('story') || h.includes('noong') || h.includes('one day'))
    return 'story_opening'
  return 'bold_claim'
}

async function main() {
  // Get user_id
  const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
  const userId = tokenRow?.user_id
  if (!userId) { console.error('No user found in meta_tokens'); process.exit(1) }
  console.log('User ID:', userId)

  // Get existing hook hashes for dedup
  const { data: existing } = await supabase.from('hook_bank').select('exclusion_hash')
  const existingHashes = new Set((existing || []).map(e => e.exclusion_hash).filter(Boolean))
  console.log('Existing hooks:', existingHashes.size)

  // Load all batch files
  const files = fs.readdirSync(SEED_DIR)
    .filter(f => f.match(/^batch-\d+\.json$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0])
      const nb = parseInt(b.match(/\d+/)[0])
      return na - nb
    })
  
  console.log(`Found ${files.length} batch files`)

  const hookRows = []
  const scriptRows = []
  let skippedDupes = 0

  const badFiles = []
  for (const file of files) {
    let data
    try {
      data = JSON.parse(fs.readFileSync(path.join(SEED_DIR, file), 'utf-8'))
    } catch (e) {
      badFiles.push(file)
      continue
    }
    const variants = data.variants || []
    const batchNum = parseInt(file.match(/\d+/)[0])

    for (const v of variants) {
      const hook = v.hook || ''
      if (!hook) continue

      const hash = crypto.createHash('md5').update(hook.trim().toLowerCase()).digest('hex')
      if (existingHashes.has(hash)) {
        skippedDupes++
        continue
      }
      existingHashes.add(hash)

      const content = v.content || {}
      const angle = inferAngle(hook, content)
      const format = inferFormat(content)
      const scenes = extractScenes(content)
      const quality = v.qualityScore ? v.qualityScore / 100 : 0.85

      // Hook row
      hookRows.push({
        user_id: userId,
        angle,
        persona: 'grace',
        hook_text: hook,
        hook_type: inferHookType(hook),
        proof_points_used: [],
        generated_by: 'seed-batch',
        generated_model: 'kimi-k2.5/claude-sonnet-4',
        quality_score: quality,
        generation_context: { batch: batchNum, variant: v.number || v.id, source: 'seed-output' },
        status: 'fresh',
        exclusion_hash: hash,
      })

      // Script row (full content)
      if (scenes.length > 0) {
        scriptRows.push({
          user_id: userId,
          angle,
          persona: 'grace',
          format,
          hook_text: hook,
          scenes,
          caption_draft: null,
          hashtags: [],
          cta: null,
          total_duration_seconds: format === 'video_ugc' ? 45 : null,
          generated_by: 'seed-batch',
          generated_model: 'kimi-k2.5/claude-sonnet-4',
          quality_score: quality,
          kb_hooks_used: [],
          kb_frameworks_used: [],
          generation_context: { batch: batchNum, variant: v.number || v.id, source: 'seed-output' },
          status: 'fresh',
        })
      }
    }
  }

  if (badFiles.length > 0) {
    console.log(`\nSkipped ${badFiles.length} bad JSON files: ${badFiles.join(', ')}`)
  }
  console.log(`\nParsed: ${hookRows.length} hooks, ${scriptRows.length} scripts`)
  console.log(`Skipped dupes: ${skippedDupes}`)

  // Insert hooks in batches
  let insertedHooks = 0
  let failedHooks = 0
  console.log(`\nInserting ${hookRows.length} hooks...`)
  for (let i = 0; i < hookRows.length; i += BATCH_INSERT_SIZE) {
    const batch = hookRows.slice(i, i + BATCH_INSERT_SIZE)
    const { data, error } = await supabase.from('hook_bank').insert(batch).select('id')
    if (error) {
      console.error(`Hook batch ${Math.floor(i/BATCH_INSERT_SIZE)+1} failed:`, error.message)
      failedHooks += batch.length
    } else {
      insertedHooks += data?.length || 0
      process.stdout.write(`  Hooks: ${insertedHooks}/${hookRows.length}\r`)
    }
  }
  console.log(`\n  Hooks inserted: ${insertedHooks}, failed: ${failedHooks}`)

  // Insert scripts in batches
  let insertedScripts = 0
  let failedScripts = 0
  console.log(`\nInserting ${scriptRows.length} scripts...`)
  for (let i = 0; i < scriptRows.length; i += BATCH_INSERT_SIZE) {
    const batch = scriptRows.slice(i, i + BATCH_INSERT_SIZE)
    const { data, error } = await supabase.from('script_bank').insert(batch).select('id')
    if (error) {
      console.error(`Script batch ${Math.floor(i/BATCH_INSERT_SIZE)+1} failed:`, error.message)
      failedScripts += batch.length
    } else {
      insertedScripts += data?.length || 0
      process.stdout.write(`  Scripts: ${insertedScripts}/${scriptRows.length}\r`)
    }
  }
  console.log(`\n  Scripts inserted: ${insertedScripts}, failed: ${failedScripts}`)

  // Final counts
  const { count: hc } = await supabase.from('hook_bank').select('*', { count: 'exact', head: true })
  const { count: sc } = await supabase.from('script_bank').select('*', { count: 'exact', head: true })
  
  console.log('\n=== SUMMARY ===')
  console.log(`Hooks:   ${insertedHooks} inserted (${failedHooks} failed) → total in DB: ${hc}`)
  console.log(`Scripts: ${insertedScripts} inserted (${failedScripts} failed) → total in DB: ${sc}`)
  console.log(`Dupes skipped: ${skippedDupes}`)

  if (failedHooks > 0 || failedScripts > 0) process.exit(1)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
