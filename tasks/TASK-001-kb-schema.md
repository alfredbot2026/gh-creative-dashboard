# Task: TASK-001 — Knowledge Base Schema + Migration

> **Track:** FAST
> **Builder:** solo
> **Requires review:** No (no auth/RLS changes)

## Pre-Task Learning
**Read `corrections.md` FIRST if it exists.** Are any past corrections relevant to this task? If yes, note them and apply proactively.

## Context
**Read these FIRST before writing any code:**
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/PROJECT-SPEC.md` — sections 3b, 3c, 3d (knowledge base architecture)
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/actions/content.ts` — existing pattern for server actions
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/lib/supabase/server.ts` — how Supabase client is created

## Objective
Create the `knowledge_entries` table in Supabase and the corresponding TypeScript types. This is the structured knowledge base that replaces flat `research_insights` for content generation.

## Important Notes
- **Do NOT delete or modify the existing `research_insights` table.** It stays for raw NotebookLM query results (reading room). The new `knowledge_entries` table is specifically for structured, categorized, scored knowledge used in generation.
- The project uses Supabase (hosted). Migrations are applied via Supabase Dashboard SQL editor or `supabase db push`. Create the SQL file for manual application.
- No RLS needed yet — this is a single-user dashboard.

## Changes

### Wave 1: Database schema

#### Task 1.1: Create knowledge_entries table SQL migration
- **File:** `supabase/migrations/001_knowledge_entries.sql`
- **Action:** Create
- **What to do:**
```sql
-- Knowledge Base table for structured, categorized, performance-weighted entries
-- See PROJECT-SPEC.md §3c for full field documentation

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN (
    'hook_library', 'scripting_framework', 'content_funnel', 
    'virality_science', 'ad_creative', 'platform_intelligence',
    'competitor_intel', 'ai_prompting', 'brand_identity', 
    'cro_patterns', 'performance_learning'
  )),
  subcategory TEXT NOT NULL,  -- e.g., 'iceberg_effect', 'super_hook', 'STEPPS'
  lanes TEXT[] NOT NULL DEFAULT '{}',  -- content lanes: 'short-form', 'ads', 'youtube'
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  examples JSONB DEFAULT '[]'::jsonb,  -- array of concrete examples
  
  -- Source tracking
  source TEXT NOT NULL CHECK (source IN (
    'notebooklm', 'manual', 'performance_data', 'competitor_analysis'
  )),
  source_detail TEXT,  -- notebook name/ID, URL, extraction run ID
  source_confidence TEXT NOT NULL DEFAULT 'notebooklm_extracted' CHECK (source_confidence IN (
    'performance_data', 'curated_manual', 'notebooklm_extracted', 'unverified'
  )),
  extraction_version TEXT,  -- which extraction run produced this entry (for rollback)
  
  -- Governance
  review_status TEXT NOT NULL DEFAULT 'candidate' CHECK (review_status IN (
    'candidate', 'approved', 'deprecated', 'archived'
  )),
  reviewed_by TEXT,  -- who approved: 'grace', 'rob', 'auto'
  reviewed_at TIMESTAMPTZ,
  
  -- Effectiveness scoring
  effectiveness_score NUMERIC(5,2) DEFAULT 50.00,  -- 0-100
  confidence_interval NUMERIC(5,2) DEFAULT 50.00,  -- uncertainty range (wide = low data)
  min_sample_gate INTEGER DEFAULT 3,  -- entries can't influence ranking until N uses
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Approval tracking (Grace's approve/reject decisions)
  times_approved INTEGER DEFAULT 0,
  times_rejected INTEGER DEFAULT 0,
  
  -- Anti-repetition
  saturation_penalty NUMERIC(5,2) DEFAULT 0.00,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_mandatory_first_read BOOLEAN DEFAULT FALSE,  -- brand identity entries = true
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX idx_knowledge_lanes ON knowledge_entries USING GIN(lanes);
CREATE INDEX idx_knowledge_review_status ON knowledge_entries(review_status);
CREATE INDEX idx_knowledge_effectiveness ON knowledge_entries(effectiveness_score DESC);
CREATE INDEX idx_knowledge_source ON knowledge_entries(source);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_entries_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```
- **Verify:** SQL is syntactically valid. Check with: `cat supabase/migrations/001_knowledge_entries.sql`

#### Task 1.2: Create generation_provenance table SQL
- **File:** `supabase/migrations/002_generation_provenance.sql`
- **Action:** Create
- **What to do:**
```sql
-- Provenance chain: every generated piece traces back to KB entries used
-- See PROJECT-SPEC.md §3e for documentation

CREATE TABLE IF NOT EXISTS generation_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was generated
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  lane TEXT NOT NULL CHECK (lane IN ('short-form', 'ads', 'youtube')),
  
  -- Which KB entries were used
  primary_entries UUID[] DEFAULT '{}',    -- KB entry IDs that were primary context
  auxiliary_entries UUID[] DEFAULT '{}',   -- KB entry IDs that were explore/novel context
  
  -- Generation metadata
  generation_params JSONB DEFAULT '{}'::jsonb,  -- prompt config, model, temperature, etc.
  pipeline_steps JSONB DEFAULT '[]'::jsonb,     -- which pipeline steps ran, their outputs
  brand_voice_score NUMERIC(5,2),               -- automated brand voice rubric score
  
  -- Outcome tracking (filled in later by learning loop)
  performance_score NUMERIC(5,2),
  grace_decision TEXT CHECK (grace_decision IN ('approved', 'rejected', 'edited', NULL)),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provenance_content_item ON generation_provenance(content_item_id);
CREATE INDEX idx_provenance_lane ON generation_provenance(lane);
CREATE INDEX idx_provenance_created ON generation_provenance(created_at DESC);
```
- **Verify:** SQL is syntactically valid

### Wave 2: TypeScript types

#### Task 2.1: Create knowledge base types
- **File:** `lib/knowledge/types.ts`
- **Action:** Create
- **What to do:**
```typescript
/**
 * Knowledge Base Types
 * Structured, categorized, performance-weighted knowledge entries.
 * See PROJECT-SPEC.md §3c for full documentation.
 */

export const KNOWLEDGE_CATEGORIES = [
  'hook_library',
  'scripting_framework', 
  'content_funnel',
  'virality_science',
  'ad_creative',
  'platform_intelligence',
  'competitor_intel',
  'ai_prompting',
  'brand_identity',
  'cro_patterns',
  'performance_learning',
] as const

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number]

export const CONTENT_LANES = ['short-form', 'ads', 'youtube'] as const
export type ContentLane = typeof CONTENT_LANES[number]

export const SOURCE_TYPES = ['notebooklm', 'manual', 'performance_data', 'competitor_analysis'] as const
export type SourceType = typeof SOURCE_TYPES[number]

export const SOURCE_CONFIDENCE_LEVELS = ['performance_data', 'curated_manual', 'notebooklm_extracted', 'unverified'] as const
export type SourceConfidence = typeof SOURCE_CONFIDENCE_LEVELS[number]

export const REVIEW_STATUSES = ['candidate', 'approved', 'deprecated', 'archived'] as const
export type ReviewStatus = typeof REVIEW_STATUSES[number]

export interface KnowledgeEntry {
  id: string
  category: KnowledgeCategory
  subcategory: string
  lanes: ContentLane[]
  title: string
  content: string
  examples: string[]  // concrete examples
  source: SourceType
  source_detail: string | null
  source_confidence: SourceConfidence
  extraction_version: string | null
  review_status: ReviewStatus
  reviewed_by: string | null
  reviewed_at: string | null
  effectiveness_score: number
  confidence_interval: number
  min_sample_gate: number
  times_used: number
  times_successful: number
  last_used_at: string | null
  times_approved: number
  times_rejected: number
  saturation_penalty: number
  tags: string[]
  is_mandatory_first_read: boolean
  created_at: string
  updated_at: string
}

/** For creating new entries */
export type KnowledgeEntryInsert = Omit<KnowledgeEntry, 
  'id' | 'created_at' | 'updated_at' | 'effectiveness_score' | 'confidence_interval' |
  'times_used' | 'times_successful' | 'last_used_at' | 'times_approved' | 'times_rejected' |
  'saturation_penalty'
> & {
  effectiveness_score?: number
  confidence_interval?: number
}

/** For updating existing entries */
export type KnowledgeEntryUpdate = Partial<Omit<KnowledgeEntry, 'id' | 'created_at'>>

/** Filter options for querying */
export interface KnowledgeFilter {
  category?: KnowledgeCategory
  subcategory?: string
  lane?: ContentLane
  review_status?: ReviewStatus
  source?: SourceType
  source_confidence?: SourceConfidence
  min_effectiveness?: number
  search?: string  // full-text search on title + content
  tags?: string[]
  limit?: number
  offset?: number
}

/** Human-readable labels for categories */
export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  hook_library: '🪝 Hook Library',
  scripting_framework: '📝 Scripting Frameworks',
  content_funnel: '🔻 Content Funnel Strategy',
  virality_science: '🧪 Virality Science',
  ad_creative: '📢 Ad Creative Frameworks',
  platform_intelligence: '📱 Platform Intelligence',
  competitor_intel: '🔍 Competitor Intel',
  ai_prompting: '🤖 AI Prompting Workflows',
  brand_identity: '🎨 Brand Identity',
  cro_patterns: '📊 CRO / Conversion Patterns',
  performance_learning: '📈 Performance Learnings',
}

/** Provenance record for generated content */
export interface GenerationProvenance {
  id: string
  content_item_id: string | null
  lane: ContentLane
  primary_entries: string[]
  auxiliary_entries: string[]
  generation_params: Record<string, unknown>
  pipeline_steps: Record<string, unknown>[]
  brand_voice_score: number | null
  performance_score: number | null
  grace_decision: 'approved' | 'rejected' | 'edited' | null
  created_at: string
}
```
- **Verify:** `npx tsc --noEmit` — zero errors on this file

## Final Verification (EVIDENCE REQUIRED)
```bash
# Must all pass before reporting done — paste ACTUAL OUTPUT in build report
npx tsc --noEmit       # zero type errors — paste output
cat supabase/migrations/001_knowledge_entries.sql  # file exists
cat supabase/migrations/002_generation_provenance.sql  # file exists
cat lib/knowledge/types.ts  # file exists with all types
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat(knowledge): add knowledge_entries + provenance schema and TypeScript types"
```

## Build Report (5-point handoff — ALL required)
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-001.md`:
1. **What was done** — summary of changes
2. **Where artifacts are** — exact file paths
3. **How to verify** — commands to run
4. **Known issues** — anything incomplete
5. **What's next** — "Ready for TASK-002 (KB API routes)"

## Post-Task Reflection
If you received corrections or caught mistakes during this task:
- Append to `corrections.md`: `CONTEXT: | MISS: | FIX: | DATE:`

## Output
- Branch: `feat/knowledge-base-schema`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-001.md`
- Notify: Dr. Strange via sessions_send (1-line: ✅ status + report path)
