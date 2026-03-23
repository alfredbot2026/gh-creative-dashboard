/**
 * Structure-aware prompt builder.
 * When a structure_slug is provided, the generation prompt forces the AI
 * to follow the exact block sequence with timing markers.
 */

interface StructureBlock {
  id: string
  label: string
  timing: string
  duration_hint: string
  instruction: string
  example?: string
  rules?: string[]
}

interface ContentStructure {
  name: string
  slug: string
  description: string
  source_creator: string
  content_type: string
  blocks: StructureBlock[]
  ideal_length_min: number | null
  ideal_length_max: number | null
}

/**
 * Build the structure section of the prompt.
 * Returns a string to inject into the main prompt that overrides
 * the generic framework section.
 */
export function buildStructurePromptSection(structure: ContentStructure): string {
  const blockInstructions = structure.blocks.map((block, i) => {
    let section = `### Block ${i + 1}: ${block.label} [${block.timing}] (${block.duration_hint})\n`
    section += `**Instruction:** ${block.instruction}\n`
    if (block.example) {
      section += `**Example:** ${block.example}\n`
    }
    if (block.rules && block.rules.length > 0) {
      section += `**Rules:**\n${block.rules.map(r => `- ${r}`).join('\n')}\n`
    }
    return section
  }).join('\n')

  const durationNote = structure.ideal_length_min && structure.ideal_length_max
    ? `Target duration: ${structure.ideal_length_min >= 60 
        ? `${Math.round(structure.ideal_length_min / 60)}-${Math.round(structure.ideal_length_max / 60)} minutes`
        : `${structure.ideal_length_min}-${structure.ideal_length_max} seconds`
      }`
    : ''

  return `## REQUIRED STRUCTURE — "${structure.name}" (by ${structure.source_creator})
${structure.description}
${durationNote}

You MUST follow this exact block sequence. Each block in your output MUST map to a block below.
Do NOT skip blocks. Do NOT reorder blocks. Do NOT add blocks that aren't listed.

${blockInstructions}

## Output Format — Structure-Aware
Your output MUST have a "scenes" array where each scene maps to a structure block:
- scene.block_id = the block id (e.g., "hook", "superhook", "context")
- scene.block_label = the block label (e.g., "Hook", "Super Hook", "Context")
- scene.timing = the block timing (e.g., "0-3s")
- scene.script_text = the actual script content for this block
- scene.visual_direction = camera/visual notes for this block
- scene.on_screen_text = text overlay for this block (if applicable)
- scene.production_notes = any production/editing notes`
}

/**
 * Build the JSON schema hint for structure-aware output.
 * Ensures the AI outputs scenes that map 1:1 to structure blocks.
 */
export function buildStructureOutputHint(structure: ContentStructure): string {
  const sceneExamples = structure.blocks.map(block => ({
    block_id: block.id,
    block_label: block.label,
    timing: block.timing,
    script_text: `[${block.label} content here — ${block.instruction.slice(0, 50)}...]`,
    visual_direction: '[camera angle, movement, b-roll notes]',
    on_screen_text: '[text overlay if needed]',
    production_notes: '[editing notes]'
  }))

  return `
The "scenes" array MUST have exactly ${structure.blocks.length} entries, one per block:
${JSON.stringify(sceneExamples.map(s => ({ block_id: s.block_id, block_label: s.block_label, timing: s.timing })), null, 2)}
`
}
