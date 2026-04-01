import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables.')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Source JSON files (absolute paths from workspace)
const SOURCE_FILES = [
  '/home/rob/.openclaw/workspace-coding/hooks_batch5_output.json',
  '/home/rob/.openclaw/workspace-coding/grace-hooks-batch6.json',
  '/home/rob/.openclaw/workspace-coding/grace-hooks-batch7.json',
  '/home/rob/.openclaw/workspace-coding/grace-hooks-batch8.json',
]

interface Hook {
  hook_text: string
  hook_type: string
  proof_points_used: string[]
}

interface Batch {
  angle: string
  persona: string
  hooks: Hook[]
}

interface HooksFile {
  batches: Batch[]
}

interface KnowledgeEntryInsert {
  category: 'hook_library'
  subcategory: string
  lanes: ('ads' | 'short-form')[]
  title: string
  content: string
  examples: string[]
  source: 'manual'
  source_detail: string | null
  source_confidence: 'curated_manual'
  extraction_version: string | null
  review_status: 'candidate'
  reviewed_by: string | null
  reviewed_at: string | null
  effectiveness_score: number
  confidence_interval: number
  min_sample_gate: number
  times_used: number
  times_successful: number
  times_approved: number
  times_rejected: number
  saturation_penalty: number
  tags: string[]
  is_mandatory_first_read: boolean
}

async function loadHooksFromFile(filePath: string): Promise<{ batch: Batch; hook: Hook }[]> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const data: HooksFile = JSON.parse(content)
  
  const results: { batch: Batch; hook: Hook }[] = []
  for (const batch of data.batches) {
    for (const hook of batch.hooks) {
      results.push({ batch, hook })
    }
  }
  return results
}

function mapHookToEntry(batch: Batch, hook: Hook): KnowledgeEntryInsert {
  // Clean angle and persona for tags
  const angleTag = `angle:${batch.angle.replace(/\s+/g, '_').toLowerCase()}`
  const personaTag = `persona:${batch.persona.toLowerCase()}`
  
  // Title is first 60 chars of hook text
  const title = hook.hook_text.length > 60 
    ? hook.hook_text.substring(0, 57) + '...'
    : hook.hook_text

  return {
    category: 'hook_library',
    subcategory: hook.hook_type,
    lanes: ['ads', 'short-form'],
    title,
    content: hook.hook_text,
    examples: hook.proof_points_used || [],
    source: 'manual',
    source_detail: null,
    source_confidence: 'curated_manual',
    extraction_version: null,
    review_status: 'candidate',
    reviewed_by: null,
    reviewed_at: null,
    effectiveness_score: 50,
    confidence_interval: 50,
    min_sample_gate: 3,
    times_used: 0,
    times_successful: 0,
    times_approved: 0,
    times_rejected: 0,
    saturation_penalty: 0,
    tags: [angleTag, personaTag],
    is_mandatory_first_read: false,
  }
}

async function seed() {
  console.log('Loading hooks from JSON files...\n')
  
  // Load all hooks from all files
  const allHookData: { batch: Batch; hook: Hook; sourceFile: string }[] = []
  
  for (const filePath of SOURCE_FILES) {
    const fileName = path.basename(filePath)
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: ${fileName} not found, skipping...`)
      continue
    }
    
    const hooks = await loadHooksFromFile(filePath)
    for (const { batch, hook } of hooks) {
      allHookData.push({ batch, hook, sourceFile: fileName })
    }
    console.log(`Loaded ${hooks.length} hooks from ${fileName}`)
  }
  
  console.log(`\nTotal hooks loaded: ${allHookData.length}`)
  
  // Deduplicate by content
  const seenContent = new Set<string>()
  const uniqueHooks: typeof allHookData = []
  let duplicatesSkipped = 0
  
  for (const hookData of allHookData) {
    const normalized = hookData.hook.hook_text.trim().toLowerCase()
    if (seenContent.has(normalized)) {
      duplicatesSkipped++
      continue
    }
    seenContent.add(normalized)
    uniqueHooks.push(hookData)
  }
  
  console.log(`Duplicates skipped: ${duplicatesSkipped}`)
  console.log(`Unique hooks to insert: ${uniqueHooks.length}\n`)
  
  // Check for existing content in DB to avoid re-inserting
  console.log('Checking for existing hooks in database...')
  const { data: existingEntries, error: fetchError } = await supabase
    .from('knowledge_entries')
    .select('content')
    .eq('category', 'hook_library')
  
  if (fetchError) {
    console.error('Failed to fetch existing entries:', fetchError)
    process.exit(1)
  }
  
  const existingContent = new Set(
    (existingEntries || []).map(e => e.content.trim().toLowerCase())
  )
  console.log(`Found ${existingContent.size} existing hook_library entries`)
  
  // Filter out already-existing content
  const newHooks = uniqueHooks.filter(hookData => {
    const normalized = hookData.hook.hook_text.trim().toLowerCase()
    return !existingContent.has(normalized)
  })
  
  const alreadyInDb = uniqueHooks.length - newHooks.length
  if (alreadyInDb > 0) {
    console.log(`Already in DB (will skip): ${alreadyInDb}`)
  }
  console.log(`New hooks to insert: ${newHooks.length}\n`)
  
  if (newHooks.length === 0) {
    console.log('No new hooks to insert. Exiting.')
    console.log('\n=== Summary ===')
    console.log(`Total parsed: ${allHookData.length}`)
    console.log(`Duplicates skipped (within files): ${duplicatesSkipped}`)
    console.log(`Already in DB: ${alreadyInDb}`)
    console.log(`Inserted: 0`)
    return
  }
  
  // Map to DB entries
  const entriesToInsert = newHooks.map(h => mapHookToEntry(h.batch, h.hook))
  
  // Insert in batches of 50
  const BATCH_SIZE = 50
  let inserted = 0
  let failed = 0
  
  console.log(`Inserting ${entriesToInsert.length} hooks in batches of ${BATCH_SIZE}...`)
  
  for (let i = 0; i < entriesToInsert.length; i += BATCH_SIZE) {
    const batch = entriesToInsert.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert(batch)
      .select('id')
    
    if (error) {
      console.error(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message)
      failed += batch.length
    } else {
      inserted += data?.length || 0
      process.stdout.write(`Inserted: ${inserted}/${entriesToInsert.length}\r`)
    }
  }
  
  console.log('\n')
  
  // Verify count
  const { count, error: countError } = await supabase
    .from('knowledge_entries')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'hook_library')
  
  if (countError) {
    console.error('Failed to get final count:', countError)
  } else {
    console.log(`\nTotal hook_library entries in DB: ${count}`)
  }
  
  // Print summary
  console.log('\n=== Summary ===')
  console.log(`Total parsed: ${allHookData.length}`)
  console.log(`Duplicates skipped (within files): ${duplicatesSkipped}`)
  console.log(`Already in DB: ${alreadyInDb}`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Failed: ${failed}`)
  
  if (failed > 0) {
    process.exit(1)
  }
}

seed().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
