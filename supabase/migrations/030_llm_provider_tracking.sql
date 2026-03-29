-- Track which LLM provider generated each piece of content
ALTER TABLE creative_concepts ADD COLUMN IF NOT EXISTS llm_provider TEXT;
ALTER TABLE creative_concepts ADD COLUMN IF NOT EXISTS llm_model TEXT;

ALTER TABLE creative_hooks ADD COLUMN IF NOT EXISTS llm_provider TEXT;
ALTER TABLE creative_hooks ADD COLUMN IF NOT EXISTS llm_model TEXT;

ALTER TABLE creative_executions ADD COLUMN IF NOT EXISTS llm_provider TEXT;
ALTER TABLE creative_executions ADD COLUMN IF NOT EXISTS llm_model TEXT;

-- Also add to content_items for script generation tracking
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS llm_provider TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS llm_model TEXT;
