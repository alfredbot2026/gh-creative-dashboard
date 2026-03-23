import { ContentStructure, TechniqueEntry } from './types'

// ============================================================
// CONTENT STRUCTURES — Full script structures with block timing
// ============================================================

export const CONTENT_STRUCTURES: ContentStructure[] = [
  // ── REELS / SHORT-FORM ──────────────────────────────────────
  {
    name: 'Show Then Tell',
    slug: 'show-then-tell',
    description: 'Show the end result first, then explain how you got there. Fast-paced, proof-driven.',
    source_creator: 'Personal Brand Launch KB',
    content_type: 'reel',
    purpose: ['educate', 'sell'],
    difficulty: 'beginner',
    blocks: [
      { id: 'result', label: 'Show Result', timing: '0-1s', duration_hint: '1s', instruction: 'Show a visual of the end result — finished product, improved metrics, or transformation.', example: 'Close-up of beautifully bound journal on a styled desk', rules: ['Visual must be compelling enough to stop the scroll', 'No text needed yet — let the visual speak'] },
      { id: 'payoff', label: 'One-Line Payoff', timing: '1-2s', duration_hint: '1s', instruction: 'Deliver a single line that explains what this result means.', example: '"This one machine changed my entire business"', rules: ['One sentence only', 'Connect result to viewer benefit'] },
      { id: 'proof', label: 'Fast Proof', timing: '2-3s', duration_hint: '1s', instruction: 'Show on-screen stat, testimonial fragment, or social proof.', example: 'Text overlay: "₱50K/month from journal making"', rules: ['On-screen text or stat', 'Must be specific, not vague'] },
      { id: 'process', label: '3-Step Process', timing: '3-15s', duration_hint: '12s', instruction: 'Explain the process in exactly 3 steps. No fluff. Each step gets ~4 seconds.', example: 'Step 1: Cut pages to size. Step 2: Punch holes with binding machine. Step 3: Thread spiral coil.', rules: ['Exactly 3 steps', 'New visual/angle per step', 'Action-oriented language'] },
      { id: 'cta', label: 'CTA', timing: '15-30s', duration_hint: '5s', instruction: 'Call to action with a SPECIFIC reason to act.', example: '"Save this for your next journal project 📌"', rules: ['Give a reason, not just "follow me"', 'Match CTA to content purpose'] }
    ],
    ideal_length_min: 15,
    ideal_length_max: 30,
    is_cutting_edge: true,
    sort_order: 1
  },
  {
    name: 'Myth, Truth, Move',
    slug: 'myth-truth-move',
    description: 'Challenge a common belief, reveal the truth, give an actionable next step.',
    source_creator: 'Personal Brand Launch KB',
    content_type: 'reel',
    purpose: ['educate'],
    difficulty: 'beginner',
    blocks: [
      { id: 'myth', label: 'State the Myth', timing: '0-2s', duration_hint: '2s', instruction: 'State a myth or common belief your audience holds. Make it feel like something they\'ve heard 100 times.', example: '"Most people think you need expensive equipment to start a printing business"', rules: ['Use "Most people think..." or "Everyone says..."', 'Must be a real belief in your niche'] },
      { id: 'truth', label: 'Reveal the Truth', timing: '2-3s', duration_hint: '1s', instruction: 'Reveal the actual truth in ONE line. Make it punchy and contrarian.', example: '"Actually, you can start with just ₱3,000 worth of tools"', rules: ['Single sentence', 'Must genuinely surprise', 'Transition/cut on this line'] },
      { id: 'explain', label: 'Explain with Example', timing: '3-25s', duration_hint: '22s', instruction: 'Explain the truth using ONE clear, specific example. Show don\'t tell.', example: 'Show each affordable tool: "This cutter is ₱500, this stapler is ₱800, this paper trimmer is ₱1,200..."', rules: ['One example only — don\'t dilute', 'Specific numbers/details', 'Visual demonstration preferred'] },
      { id: 'action', label: 'First Action Step', timing: '25-45s', duration_hint: '10s', instruction: 'Give the viewer their FIRST actionable next step. Not the whole journey — just step one.', example: '"Start with the stapler and 20 sheets of paper. Make your first journal tonight."', rules: ['Actionable TODAY', 'Low barrier to entry', 'Specific, not vague'] }
    ],
    ideal_length_min: 30,
    ideal_length_max: 45,
    is_cutting_edge: true,
    sort_order: 2
  },
  {
    name: 'Hook-Hold-Reward',
    slug: 'hook-hold-reward',
    description: 'Three-act structure: grab attention, deliver value, end with a payoff that drives action.',
    source_creator: 'Viral Video Anatomy KB',
    content_type: 'reel',
    purpose: ['educate', 'inspire', 'sell'],
    difficulty: 'beginner',
    blocks: [
      { id: 'hook', label: 'Hook', timing: '0-3s', duration_hint: '3s', instruction: 'Establish immediate value, tension, or intrigue to stop the scroll.', example: '"I made ₱10,000 in one weekend with this..."', rules: ['3-6 word text overlay', '3-6 cuts/shots in first 3 seconds', 'Transition on second 3', 'Zero dead space at start'] },
      { id: 'hold', label: 'Hold', timing: '3-25s', duration_hint: '22s', instruction: 'Deliver on the promise of the hook with engaging, fast-paced content.', example: 'Show the step-by-step process of making journals for a weekend market', rules: ['New angle/shot every 2 seconds', 'Re-hook every 7-10 seconds', 'No filler — every second adds value'] },
      { id: 'reward', label: 'Reward', timing: '25-30s', duration_hint: '5s', instruction: 'Provide a payoff that naturally encourages viewers to like, follow, or share.', example: '"The best part? I did it all from my kitchen table. Follow for more home business ideas 🏠"', rules: ['Must feel earned, not forced', 'Natural transition to CTA', 'Emotional payoff preferred'] }
    ],
    ideal_length_min: 15,
    ideal_length_max: 60,
    is_cutting_edge: false,
    sort_order: 3
  },
  {
    name: 'Micro-Story Arc',
    slug: 'micro-story-arc',
    description: 'Open a curiosity loop with an unexplained visual, walk through the journey, close with a reveal.',
    source_creator: 'Viral Video Anatomy KB',
    content_type: 'reel',
    purpose: ['story', 'inspire'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'loop', label: 'Open Loop', timing: '0-3s', duration_hint: '3s', instruction: 'Start with an unexplained visual or question that creates a curiosity loop.', example: 'Show a messy pile of paper and tools on a desk with text: "3 hours later, this became..."', rules: ['Visual must raise a question', 'Don\'t reveal the answer yet', 'Zeigarnik Effect — brain MUST know the resolution'] },
      { id: 'journey', label: 'Journey', timing: '3-25s', duration_hint: '22s', instruction: 'Walk the viewer through the process or story. Build toward the reveal.', example: 'Time-lapse of cutting, folding, binding — each step building toward something', rules: ['Show progression/transformation', 'Each shot should move the story forward', 'Add re-hooks: "But wait, it gets better..."'] },
      { id: 'reveal', label: 'Resolution / Reveal', timing: '25-35s', duration_hint: '10s', instruction: 'Close the loop with the final reveal. This is the payoff they stayed for.', example: 'Beautiful finished journal with "From chaos to this 📚" text overlay', rules: ['Must be satisfying enough to warrant the wait', 'Consider adding a CTA tied to the reveal'] }
    ],
    ideal_length_min: 20,
    ideal_length_max: 45,
    is_cutting_edge: false,
    sort_order: 4
  },
  {
    name: 'Full Reel Anatomy',
    slug: 'full-reel-anatomy',
    description: 'Chris Chung\'s complete 8-part Reel structure: hook → super hook → context → dance → re-hooks → value → re-loop → CTA.',
    source_creator: 'Chris Chung',
    content_type: 'reel',
    purpose: ['educate', 'sell', 'story'],
    difficulty: 'advanced',
    blocks: [
      { id: 'hook', label: 'Hook', timing: '0-1s', duration_hint: '1s', instruction: 'Pain + Benefit + Curiosity in one line. Text hook on screen simultaneously.', example: '"Stop wasting money on expensive binding machines"', rules: ['Written + verbal + visual hook (Triple Hook)', 'Transition on second 3', '3-6 word text overlay'] },
      { id: 'superhook', label: 'Super Hook', timing: '1-3s', duration_hint: '2s', instruction: 'Establish WHY they should listen to YOU. One line of credibility.', example: '"After 5 years and 10,000 journals sold..."', rules: ['Social proof or authority', 'Specific numbers if possible', 'Must answer: why should I listen to you?'] },
      { id: 'context', label: 'Context', timing: '3-7s', duration_hint: '4s', instruction: 'Set the scene. 1-2 sentences of background with specific details.', example: '"When I started my journal business in 2020, I bought the most expensive machine I could find. Big mistake."', rules: ['Time, place, situation', 'Specific details (not vague)', 'Sets up the problem'] },
      { id: 'dance', label: 'The Dance', timing: '7-20s', duration_hint: '13s', instruction: 'Loop between context and conflict. Build tension. This is where you develop the story or argument.', example: 'Show the expensive machine breaking down, the cheap alternative working perfectly, side-by-side comparison', rules: ['Alternate between tension and insight', 'Open new curiosity loops before closing old ones', 'New visual every 2 seconds'] },
      { id: 'rehook', label: 'Re-hooks', timing: 'every 7-10s', duration_hint: '1s each', instruction: 'Reset attention with a new hook mid-video.', example: '"But here\'s the part nobody talks about..."', rules: ['Place every 7-10 seconds', '"But...", "Here\'s the thing...", "The crazy part is..."'] },
      { id: 'value', label: 'Value / Climax', timing: '20-35s', duration_hint: '15s', instruction: 'Deliver the promised insight. Must be non-obvious and highly tactical.', example: '"The ₱3,000 machine actually produces BETTER bindings because..."', rules: ['Actionable — they can use this today', 'Non-obvious insight (not generic advice)', 'This is what they stayed for'] },
      { id: 'reloop', label: 'Re-loop', timing: '35-40s', duration_hint: '5s', instruction: 'Add a "But..." near the end to loop retention. Opens one more curiosity gap.', example: '"But there\'s one more tool you need that nobody talks about..."', rules: ['Creates reason to rewatch or follow', 'Don\'t fully close — leave them wanting more'] },
      { id: 'cta', label: 'CTA', timing: '40-45s', duration_hint: '5s', instruction: 'Natural next step. Not a hard pitch.', example: '"Comment TOOLS and I\'ll send you my complete list 📋"', rules: ['Keyword comment CTAs work best for reach', 'Tie CTA to the value you just delivered', 'Natural, not salesy'] }
    ],
    ideal_length_min: 30,
    ideal_length_max: 60,
    is_cutting_edge: true,
    sort_order: 5
  },
  {
    name: 'Iceberg Effect',
    slug: 'iceberg-effect',
    description: 'Focus on a tiny detail everyone ignores, then reveal it has massive consequences.',
    source_creator: 'Chris Chung',
    content_type: 'reel',
    purpose: ['educate'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'tiny', label: 'Tiny Detail', timing: '0-3s', duration_hint: '3s', instruction: 'Focus on a small, seemingly insignificant detail in your niche.', example: '"The way you fold your paper before binding actually matters more than the machine you use"', rules: ['Must seem trivial at first', 'Hooks through curiosity — "wait, really?"'] },
      { id: 'consequence', label: 'Massive Consequence', timing: '3-7s', duration_hint: '4s', instruction: 'Reveal the life-changing result hidden underneath that tiny detail.', example: '"It\'s the difference between journals that fall apart in a week and journals that last 10 years"', rules: ['High stakes reveal', 'Specific outcome, not vague'] },
      { id: 'explain', label: 'Deep Dive', timing: '7-30s', duration_hint: '23s', instruction: 'Explain WHY this tiny detail matters so much. Show the mechanism.', example: 'Demonstrate: paper folded with grain vs against grain, show how binding holds differently', rules: ['Visual demonstration preferred', 'Science/mechanism explanation', 'New angle every 2 seconds'] },
      { id: 'takeaway', label: 'Actionable Takeaway', timing: '30-40s', duration_hint: '10s', instruction: 'Give them the specific thing to do differently.', example: '"Next time you cut paper, check the grain direction first. Fold it — if it folds smoothly, that\'s the grain."', rules: ['One specific action', 'Easy to implement immediately'] }
    ],
    ideal_length_min: 30,
    ideal_length_max: 45,
    is_cutting_edge: true,
    sort_order: 6
  },
  {
    name: 'Comparison',
    slug: 'comparison',
    description: 'Pit two things against each other to drive curiosity and help the viewer decide.',
    source_creator: 'Personal Brand Launch KB',
    content_type: 'reel',
    purpose: ['educate', 'sell'],
    difficulty: 'beginner',
    blocks: [
      { id: 'setup', label: 'Comparison Setup', timing: '0-3s', duration_hint: '3s', instruction: 'Show both items/options side by side or announce the comparison.', example: '"₱3,000 binding machine vs ₱15,000 binding machine — which one wins?"', rules: ['Zeigarnik Effect — viewer must stay to see the winner', 'Text overlay with both options'] },
      { id: 'option_a', label: 'Option A', timing: '3-12s', duration_hint: '9s', instruction: 'Test/demonstrate the first option. Show strengths and weaknesses honestly.', example: 'Demo the cheap machine: binding 20 pages, check alignment, test durability', rules: ['Be fair — show real results', 'Specific observations, not opinions'] },
      { id: 'option_b', label: 'Option B', timing: '12-22s', duration_hint: '10s', instruction: 'Test/demonstrate the second option with the same criteria.', example: 'Demo the expensive machine: same 20 pages, same checks', rules: ['Same criteria as Option A', 'Build tension toward the verdict'] },
      { id: 'verdict', label: 'Verdict + Why', timing: '22-30s', duration_hint: '8s', instruction: 'Declare the winner and explain WHY. Add nuance — "it depends" is OK if you explain when each wins.', example: '"The ₱3,000 wins for journals under 50 pages. But if you\'re binding planners over 100 pages, you need the ₱15,000."', rules: ['Nuanced answer > absolute answer', 'Explain the WHY', 'End with a recommendation'] }
    ],
    ideal_length_min: 20,
    ideal_length_max: 40,
    is_cutting_edge: false,
    sort_order: 7
  },

  // ── YOUTUBE / LONG-FORM ─────────────────────────────────────
  {
    name: 'HEIT Framework',
    slug: 'heit-framework',
    description: 'Hook → Explain → Illustrate → Teach. The standard YouTube educational structure.',
    source_creator: 'YouTube Best Practices KB',
    content_type: 'youtube',
    purpose: ['educate'],
    difficulty: 'beginner',
    blocks: [
      { id: 'hook', label: 'Hook', timing: '0-15s', duration_hint: '15s', instruction: 'Set up the video\'s promise. Clear enough for new viewers to understand what they\'ll learn.', rules: ['Must be clear for someone who\'s never seen your channel', 'Promise specific value', 'Avoid long channel intros'] },
      { id: 'explain', label: 'Explain', timing: '15s-3min', duration_hint: '2-3min', instruction: 'State the problem or question this video answers. Why should they care?', rules: ['Connect to viewer\'s pain point', 'Establish stakes — what happens if they don\'t learn this?'] },
      { id: 'illustrate', label: 'Illustrate', timing: '3-8min', duration_hint: '5min', instruction: 'Use a story, analogy, or real example to make the concept tangible.', example: '"When I first started journal making, I thought more pages = better. Here\'s what happened..."', rules: ['Story > abstract explanation', 'Specific details make it real', 'This is where personality shines'] },
      { id: 'teach', label: 'Teach', timing: '8-15min', duration_hint: '7min', instruction: 'Deliver the actionable lesson. Step-by-step they can use today.', rules: ['Actionable steps, not theory', 'Number the steps', 'Each step gets its own visual/demo'] }
    ],
    ideal_length_min: 600,
    ideal_length_max: 1200,
    is_cutting_edge: false,
    sort_order: 10
  },
  {
    name: '4 C\'s YouTube Intro',
    slug: 'four-cs-youtube-intro',
    description: 'Caleb Ralston\'s framework: Call out → Credibility → Compass → Core Learning — all in the first 60 seconds.',
    source_creator: 'Caleb Ralston',
    content_type: 'youtube',
    purpose: ['educate'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'callout', label: 'Call Out', timing: '0-10s', duration_hint: '10s', instruction: 'Address exactly WHO this video is for. Call out your specific audience.', example: '"If you\'re a homeschool mom who wants to earn money from crafting..."', rules: ['Specific audience callout', 'Can be handled by title/thumbnail if obvious'] },
      { id: 'credibility', label: 'Credibility', timing: '10-20s', duration_hint: '10s', instruction: 'Explain why YOU are the right person to teach this. Quick proof.', example: '"I\'ve been running a journal-making business for 5 years and shipped over 10,000 orders"', rules: ['Specific numbers', 'Results-based, not ego-based', 'Brief — don\'t dwell'] },
      { id: 'compass', label: 'Compass', timing: '20-35s', duration_hint: '15s', instruction: 'Provide a roadmap. Tell them exactly how you\'ll guide them from problem to solution.', example: '"In the next 15 minutes, I\'ll show you the exact 5 steps I use to make journals that sell for ₱500+ each"', rules: ['Specific promise of what they\'ll learn', 'Mention video length to set expectations', 'Creates a mental roadmap'] },
      { id: 'corelearning', label: 'Core Learning', timing: '35-60s', duration_hint: '25s', instruction: 'Deliver a valuable, useful nugget of information IMMEDIATELY. Front-load the value.', example: '"Here\'s the #1 thing most people get wrong: they use printer paper. Switch to 120gsm ivory paper and your perceived value doubles instantly."', rules: ['Must be genuinely useful on its own', 'Viewer assumes rest of video is equally dense', 'This is the value front-loading technique'] },
      { id: 'body', label: 'Main Content', timing: '1-15min', duration_hint: '14min', instruction: 'ONE concept, FIVE stories/examples. Each story illustrates a different facet of the concept.', rules: ['Don\'t cram 5 concepts — go deep on ONE', 'Each story: principle → tactic → example', 'Sprinkle value throughout, don\'t dump it all upfront'] },
      { id: 'outro', label: 'Outro + Next Video Link', timing: '15-20min', duration_hint: '2min', instruction: 'Summarize key takeaway, link to related video, end card.', rules: ['Brief recap of the #1 action item', 'Natural link to another video', 'Don\'t say "like and subscribe" — add value instead'] }
    ],
    ideal_length_min: 900,
    ideal_length_max: 1800,
    is_cutting_edge: true,
    sort_order: 11
  },
  {
    name: 'One Concept, Five Stories',
    slug: 'one-concept-five-stories',
    description: 'Teach ONE concept supported by FIVE different stories/examples. Deep, not wide.',
    source_creator: 'Caleb Ralston',
    content_type: 'youtube',
    purpose: ['educate'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'intro', label: 'Intro + Context', timing: '0-2min', duration_hint: '2min', instruction: 'Introduce the single concept. Why it matters. Quick credibility.', rules: ['Value front-load: deliver first nugget within 60 seconds'] },
      { id: 'story1', label: 'Story 1 + Tactic', timing: '2-5min', duration_hint: '3min', instruction: 'First story illustrating the concept. End with an actionable tactic.', rules: ['Principle → Story → Tactic → Example', 'Specific details make it believable'] },
      { id: 'story2', label: 'Story 2 + Tactic', timing: '5-9min', duration_hint: '4min', instruction: 'Second story — different angle on the same concept.', rules: ['Different context than Story 1', 'Builds on previous insight'] },
      { id: 'story3', label: 'Story 3 + Tactic', timing: '9-13min', duration_hint: '4min', instruction: 'Third story — show the concept in a surprising context.', rules: ['This is the "I never thought of it that way" story', 'Re-hook before starting this story'] },
      { id: 'story4', label: 'Story 4 + Tactic', timing: '13-18min', duration_hint: '5min', instruction: 'Fourth story — the failure case. Show what happens when you DON\'T apply this concept.', rules: ['Share the Messy Middle', 'Failure stories build trust', 'Lessons learned'] },
      { id: 'story5', label: 'Story 5 + Tactic', timing: '18-23min', duration_hint: '5min', instruction: 'Fifth story — the transformation. Full arc from problem to success using this concept.', rules: ['Most compelling story saved for last', 'End with clear transformation'] },
      { id: 'link', label: 'Summary + Next Video', timing: '23-25min', duration_hint: '2min', instruction: 'Summarize the ONE concept. Link to next video that goes deeper.', rules: ['One sentence summary', 'Natural bridge to related content'] }
    ],
    ideal_length_min: 900,
    ideal_length_max: 1800,
    is_cutting_edge: true,
    sort_order: 12
  },

  // ── STORYTELLING ────────────────────────────────────────────
  {
    name: '6-Step "My Story"',
    slug: 'six-step-my-story',
    description: 'The founder story framework that "almost always goes viral." Problem → inflection → failures → solution → results → CTA.',
    source_creator: 'Personal Brand Launch KB',
    content_type: 'story',
    purpose: ['story', 'inspire', 'sell'],
    difficulty: 'beginner',
    blocks: [
      { id: 'intro', label: 'The Intro / Problem', timing: '0-5s', duration_hint: '5s', instruction: 'State the problem you were feeling. Use "I" and present tense to pull viewer in.', example: '"One year ago, I was a stay-at-home mom with no income and mounting bills"', rules: ['First person', 'Emotional — make them feel it', 'Relatable to your audience'] },
      { id: 'inflection', label: 'Inflection Point', timing: '5-10s', duration_hint: '5s', instruction: 'The exact moment of pain that forced you to act.', example: '"I had to borrow money from my parents to buy school supplies for my kids"', rules: ['Specific moment, not general feeling', 'The more specific, the more powerful'] },
      { id: 'rising', label: 'Rising Action / Failed Solutions', timing: '10-20s', duration_hint: '10s', instruction: 'List the things you tried that DIDN\'T work. Show the struggle.', example: '"I tried online selling, MLM, freelancing on Fiverr — nothing stuck"', rules: ['3-4 failed attempts', 'Brief — 2-3 seconds each', 'Viewer should relate to at least one'] },
      { id: 'climax', label: 'The Climax / Solution Found', timing: '20-30s', duration_hint: '10s', instruction: 'The solution you finally found — YOUR product, service, or method.', example: '"Then I discovered journal making. I made my first sale in 3 days."', rules: ['This is your product/service/offer', 'Make the discovery feel organic, not sales-y'] },
      { id: 'falling', label: 'Results', timing: '30-40s', duration_hint: '10s', instruction: 'State the specific results from the solution.', example: '"In 6 months, I was earning ₱50K/month. In a year, I quit borrowing forever."', rules: ['Specific numbers and timelines', 'Show transformation clearly'] },
      { id: 'resolution', label: 'Resolution + CTA', timing: '40-50s', duration_hint: '10s', instruction: 'State your mission and tell them how to start.', example: '"I made it my mission to teach other moms how to do this. Follow for more, and comment START to get my free guide."', rules: ['Mission-driven, not self-promotional', 'Clear next step'] }
    ],
    ideal_length_min: 30,
    ideal_length_max: 60,
    is_cutting_edge: true,
    sort_order: 20
  },
  {
    name: 'Three-Part Brand Story',
    slug: 'three-part-brand-story',
    description: 'Catalyst → Core Truth → Proof. Skip basic problem-solution and establish brand positioning.',
    source_creator: 'Caleb Ralston',
    content_type: 'story',
    purpose: ['story', 'inspire'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'catalyst', label: 'The Catalyst', timing: '0-10s', duration_hint: '10s', instruction: 'Why does your brand exist? What gap or opportunity did you see that nobody else was addressing?', example: '"I saw moms spending thousands on school supplies when they could make better ones at home for a fraction of the cost"', rules: ['Focus on the GAP you saw', 'Not about you — about the problem in the world'] },
      { id: 'truth', label: 'The Core Truth', timing: '10-25s', duration_hint: '15s', instruction: 'The contrarian conviction that sets you apart. What do you believe that most people in your space don\'t?', example: '"I believe homeschool doesn\'t have to be expensive. Beautiful educational materials should be accessible to every family."', rules: ['Must be contrarian — not just obvious', 'This is your brand philosophy', 'Makes people either love or question you'] },
      { id: 'proof', label: 'The Proof', timing: '25-45s', duration_hint: '20s', instruction: 'Consistent actions and case studies that reinforce your identity. Show, don\'t tell.', example: 'Show: free templates you share, DMs from grateful moms, community you built, affordable products', rules: ['Multiple pieces of evidence', 'Actions > words', 'Social proof from your community'] }
    ],
    ideal_length_min: 30,
    ideal_length_max: 60,
    is_cutting_edge: true,
    sort_order: 21
  },
  {
    name: '4 Founder Videos',
    slug: 'four-founder-videos',
    description: 'Every founder needs these 4 videos: origin story, product creation story, how-it-works, and day-in-the-life.',
    source_creator: 'Personal Brand Launch KB',
    content_type: 'story',
    purpose: ['story', 'sell', 'prove'],
    difficulty: 'beginner',
    blocks: [
      { id: 'type', label: 'Choose Video Type', timing: 'full', duration_hint: 'varies', instruction: 'Pick one of the 4 founder video types to create.', rules: ['1. Founder Story: How you built the business from zero', '2. Product Story: Step-by-step of how you created your product', '3. Product Breakdown: How your product works for a customer', '4. Day in the Life: Documenting your founder day'] },
      { id: 'hook', label: 'Hook', timing: '0-3s', duration_hint: '3s', instruction: 'Hook specific to the video type you chose.', rules: ['Founder Story: "X years ago, I had nothing..."', 'Product Story: "It took me X months to create this..."', 'Product Breakdown: "Here\'s exactly what you get..."', 'Day in the Life: "This is what running a ₱X business looks like"'] },
      { id: 'body', label: 'Story / Walkthrough', timing: '3-45s', duration_hint: '42s', instruction: 'Tell the story or walk through the process. Authentic, not polished.', rules: ['Show real footage, real spaces, real process', 'Imperfection builds trust', 'Include specific numbers and details'] },
      { id: 'cta', label: 'CTA', timing: '45-60s', duration_hint: '15s', instruction: 'What should they do next?', rules: ['Founder Story: "Follow to see the journey"', 'Product Story: "Link in bio to try it"', 'Product Breakdown: "Comment DEMO for a sample"', 'Day in the Life: "Would you want to see more behind the scenes?"'] }
    ],
    ideal_length_min: 30,
    ideal_length_max: 90,
    is_cutting_edge: false,
    sort_order: 22
  },
  {
    name: 'Year-by-Year',
    slug: 'year-by-year',
    description: 'Chronological milestones with one photo per year. Simple, emotional, effective.',
    source_creator: 'Personal Brand Launch KB',
    content_type: 'story',
    purpose: ['story', 'inspire'],
    difficulty: 'beginner',
    blocks: [
      { id: 'script', label: 'Write Timeline', timing: 'prep', duration_hint: 'prep', instruction: 'Write one significant event for each year. Keep each to ONE sentence.', rules: ['One event per year', 'Mix highs and lows', 'End on a high'] },
      { id: 'photos', label: 'Match Photos', timing: 'prep', duration_hint: 'prep', instruction: 'Find at least one photo per time period. Ideally candid, not posed.', rules: ['Real photos > stock photos', 'Show progression visually'] },
      { id: 'edit', label: 'Stitch Together', timing: '30-90s', duration_hint: '60s', instruction: 'Stitch photos with voiceover narrating each year. Add trending audio underneath.', rules: ['2-4 seconds per year', 'Voiceover adds emotional layer', 'Trending audio helps reach'] }
    ],
    ideal_length_min: 30,
    ideal_length_max: 90,
    is_cutting_edge: false,
    sort_order: 23
  },

  // ── ADS / SELLING ───────────────────────────────────────────
  {
    name: 'PAS (Problem-Agitate-Solve)',
    slug: 'pas',
    description: 'The classic direct response framework: introduce pain, twist the knife, present your solution.',
    source_creator: 'CRO KB',
    content_type: 'ad',
    purpose: ['sell'],
    difficulty: 'beginner',
    blocks: [
      { id: 'problem', label: 'Problem', timing: '0-5s', duration_hint: '5s', instruction: 'Introduce a specific pain point your audience struggles with. Be precise.', example: '"Tired of journals that fall apart after a week?"', rules: ['Specific, not vague', 'Use their language, not yours'] },
      { id: 'agitate', label: 'Agitate', timing: '5-15s', duration_hint: '10s', instruction: 'Poke at the pain. Make it emotional. Reiterate what makes it so frustrating.', example: '"You spend hours making them, use expensive materials, and still the pages come loose. Your customers complain. You lose repeat business."', rules: ['Stack frustrations', 'Make them FEEL the pain', 'Paint the worst case scenario'] },
      { id: 'solve', label: 'Solve', timing: '15-25s', duration_hint: '10s', instruction: 'Present your product/service as the clear, calm solution.', example: '"With a spiral binding machine, every journal comes out professional-grade. No loose pages. Ever."', rules: ['Calm confidence after the agitation', 'Product as the hero', 'Show the transformation'] },
      { id: 'cta', label: 'CTA', timing: '25-30s', duration_hint: '5s', instruction: 'Clear, direct call to action.', example: '"Shop now — link in bio. Use code JOURNAL20 for 20% off."', rules: ['One action only', 'Add urgency or incentive if appropriate'] }
    ],
    ideal_length_min: 15,
    ideal_length_max: 30,
    is_cutting_edge: false,
    sort_order: 30
  },
  {
    name: 'Before-After-Bridge',
    slug: 'before-after-bridge',
    description: 'Show the struggle, show the dream, bridge them with your product.',
    source_creator: 'CRO KB',
    content_type: 'ad',
    purpose: ['sell'],
    difficulty: 'beginner',
    blocks: [
      { id: 'before', label: 'Before', timing: '0-8s', duration_hint: '8s', instruction: 'Visualize their current struggle. Make it relatable and vivid.', example: 'Show: messy desk, crumpled paper, broken stapler, frustrated face', rules: ['Visual storytelling preferred', 'Must match viewer\'s current reality'] },
      { id: 'after', label: 'After', timing: '8-16s', duration_hint: '8s', instruction: 'Show the transformation. The dream state they want to reach.', example: 'Show: organized workspace, beautiful bound journals stacked neatly, satisfied smile', rules: ['Aspirational but achievable', 'Same person/setting as "before" for contrast'] },
      { id: 'bridge', label: 'Bridge', timing: '16-25s', duration_hint: '9s', instruction: 'Your product is the bridge between before and after. Show HOW it gets them there.', example: '"All it took was this one machine. [show product in action]"', rules: ['Product as the bridge, not the hero', 'Show it in use, not just a product shot', 'Emotional bridge — how they\'ll FEEL'] },
      { id: 'cta', label: 'CTA', timing: '25-30s', duration_hint: '5s', instruction: 'Direct action step.', rules: ['Simple, one action', 'Tie back to the "after" state'] }
    ],
    ideal_length_min: 15,
    ideal_length_max: 30,
    is_cutting_edge: false,
    sort_order: 31
  },
  {
    name: 'Hook-Story-Offer',
    slug: 'hook-story-offer',
    description: 'Hook with curiosity, tell a compelling story, transition naturally into your offer.',
    source_creator: 'CRO KB',
    content_type: 'ad',
    purpose: ['sell', 'story'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'hook', label: 'Hook', timing: '0-3s', duration_hint: '3s', instruction: 'Grab attention with a curiosity-inducing opening. Make them NEED to hear the story.', example: '"Last month, a customer sent me a message that made me cry"', rules: ['Emotional or curiosity-driven', 'Must make them want the story'] },
      { id: 'story', label: 'Story', timing: '3-25s', duration_hint: '22s', instruction: 'Tell an entertaining, compelling story. Build emotional investment.', example: '"She said her daughter carried my journal to school every day for a year. When it finally wore out, her daughter cried and asked for the exact same one..."', rules: ['Real story > invented story', 'Specific details', 'Build to an emotional peak'] },
      { id: 'offer', label: 'Offer', timing: '25-35s', duration_hint: '10s', instruction: 'Transition the story naturally into your offer. The offer should feel like the logical next step of the story.', example: '"That\'s why I started making journals that last. Each one is spiral-bound and built to survive a school year. [product link]"', rules: ['Transition must feel natural, not jarring', 'Story should PROVE why the offer matters'] }
    ],
    ideal_length_min: 20,
    ideal_length_max: 40,
    is_cutting_edge: false,
    sort_order: 32
  },
  {
    name: 'WHO-WHY-OFFER-ACTION',
    slug: 'who-why-offer-action',
    description: 'Target a specific audience, explain why it matters to them, present the offer, direct to action.',
    source_creator: 'CRO KB',
    content_type: 'ad',
    purpose: ['sell'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'who', label: 'Who (Call Out)', timing: '0-5s', duration_hint: '5s', instruction: 'Identify and call out your specific target audience. Make them feel seen.', example: '"Homeschool moms in the Philippines who want to earn from home..."', rules: ['Specific demographic + desire', 'Must feel like a personal conversation', 'They should think "that\'s me!"'] },
      { id: 'why', label: 'Why It Matters', timing: '5-15s', duration_hint: '10s', instruction: 'Show HOW your product solves their specific problem. Use stories or proof.', example: '"You already make beautiful worksheets for your kids. What if you could sell them too?"', rules: ['Connect to their existing skill/identity', 'Social proof or logical argument'] },
      { id: 'offer', label: 'The Offer', timing: '15-22s', duration_hint: '7s', instruction: 'Introduce your product or deal. Back it with social proof or scarcity.', example: '"My Journal Making Starter Kit comes with everything: machine, paper, templates. Over 500 moms have started with this."', rules: ['Social proof (numbers)', 'Scarcity if appropriate', 'Make it feel irresistible'] },
      { id: 'action', label: 'Call to Action', timing: '22-30s', duration_hint: '8s', instruction: 'Simple, direct, frictionless command on exactly what to do next.', example: '"Tap the link in my bio. You\'ll have your first journal made by tonight."', rules: ['One action only', 'Remove friction ("it only takes 5 minutes")', 'Paint the immediate outcome'] }
    ],
    ideal_length_min: 20,
    ideal_length_max: 30,
    is_cutting_edge: true,
    sort_order: 33
  },
  {
    name: 'Benefit-Caveat',
    slug: 'benefit-caveat',
    description: 'Start positive, make it personal, introduce an obstacle, then promote the action that overcomes it.',
    source_creator: 'CRO KB',
    content_type: 'ad',
    purpose: ['sell', 'educate'],
    difficulty: 'intermediate',
    blocks: [
      { id: 'benefit', label: 'Start Positive', timing: '0-5s', duration_hint: '5s', instruction: 'Discuss a desirable goal that\'s within their reach.', example: '"Making ₱30K/month from home is absolutely possible with journal making"', rules: ['Aspirational but believable', 'Specific number/outcome'] },
      { id: 'personal', label: 'Make It Personal', timing: '5-10s', duration_hint: '5s', instruction: 'Link the positive intro directly to the viewer. Make them see themselves.', example: '"If you have basic craft skills and a small workspace, you\'re already halfway there"', rules: ['Use "you" language', 'Lower the bar to entry'] },
      { id: 'caveat', label: 'Introduce the Caveat', timing: '10-18s', duration_hint: '8s', instruction: 'Point out the ONE obstacle preventing them from reaching that outcome.', example: '"But most people quit in the first month because they don\'t know which tools actually matter"', rules: ['One obstacle, not five', 'Must be solvable by your offer'] },
      { id: 'action', label: 'Promote Action', timing: '18-25s', duration_hint: '7s', instruction: 'Show how your product/service overcomes the obstacle.', example: '"That\'s exactly why I created the Starter Kit — it has everything you need, nothing you don\'t. Link in bio."', rules: ['Product solves the caveat', 'Clear action step'] }
    ],
    ideal_length_min: 15,
    ideal_length_max: 30,
    is_cutting_edge: true,
    sort_order: 34
  },
  {
    name: 'PASTOR',
    slug: 'pastor',
    description: 'Problem → Solution → CTA. The simplest ad framework — state the roadblock, fix it, direct them.',
    source_creator: 'CRO KB',
    content_type: 'ad',
    purpose: ['sell'],
    difficulty: 'beginner',
    blocks: [
      { id: 'problem', label: 'Problem / Roadblock', timing: '0-8s', duration_hint: '8s', instruction: 'State the specific roadblock the viewer is facing. Be direct.', example: '"Stuck figuring out which binding machine to buy? There are hundreds and they all look the same."', rules: ['Specific roadblock, not general frustration', 'Show you understand their situation'] },
      { id: 'solution', label: 'Solution', timing: '8-18s', duration_hint: '10s', instruction: 'Explain how your product/expertise solves the specific roadblock.', example: '"I\'ve tested 12 machines over 5 years. Only 2 are worth buying. Here\'s the one I use every day: [show product]"', rules: ['Authority + solution', 'Show the product in action'] },
      { id: 'cta', label: 'CTA', timing: '18-25s', duration_hint: '7s', instruction: 'Direct them to take action immediately.', example: '"Comment MACHINE and I\'ll send you my comparison sheet with prices and links"', rules: ['Low friction', 'Keyword comment CTAs drive reach'] }
    ],
    ideal_length_min: 15,
    ideal_length_max: 25,
    is_cutting_edge: false,
    sort_order: 35
  }
]

// ============================================================
// TECHNIQUE LIBRARY — Supplementary techniques that enhance structures
// ============================================================

export const TECHNIQUE_LIBRARY: TechniqueEntry[] = [
  // ── HOOK TECHNIQUES ─────────────────────────────────────────
  {
    name: 'Triple Hook',
    slug: 'triple-hook',
    category: 'hook',
    description: 'Layer three hooks simultaneously: written text + spoken words + visual pattern interrupt. Gives the viewer THREE reasons to stay.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Write a 3-6 word text overlay for the screen' },
      { step: 2, text: 'Script a DIFFERENT verbal hook (not the same as the text)' },
      { step: 3, text: 'Plan a visual pattern interrupt (movement, prop, unexpected visual)' }
    ],
    examples: [
      { text: 'Text: "The #1 mistake killing your reach" | Voice: "I analyzed 500 viral videos and found one thing in common" | Visual: Walking and suddenly stopping' }
    ],
    timing_rules: { when: '0-3s of every reel', mandatory: 'yes' },
    is_cutting_edge: true,
    sort_order: 1
  },
  {
    name: 'Super Hook',
    slug: 'super-hook',
    category: 'hook',
    description: 'The second line after your hook that establishes WHY the viewer should listen to YOU. Credibility in one sentence.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Identify your strongest credibility signal (results, experience, numbers)' },
      { step: 2, text: 'Compress it into one sentence that answers "why should I listen to you?"' },
      { step: 3, text: 'Deliver immediately after the hook — no gap' }
    ],
    examples: [
      { text: '"As someone who\'s sold 10,000 journals..."' },
      { text: '"After 5 years of testing every binding machine..."' },
      { text: '"I read 10,000 pages on content, here\'s what I learned in 60 seconds"', context: 'Briar Cochran variation' }
    ],
    timing_rules: { when: '3-5s (immediately after hook)', duration: '1-2 seconds' },
    is_cutting_edge: true,
    sort_order: 2
  },
  {
    name: 'Contrarian Perspective',
    slug: 'contrarian-perspective',
    category: 'hook',
    description: 'Argue AGAINST the most common advice in your niche. Creates cognitive dissonance that stops the scroll.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Identify the most common advice in your niche' },
      { step: 2, text: 'Find your audience\'s HIDDEN frustration with that advice' },
      { step: 3, text: 'Argue the opposite in your hook' }
    ],
    examples: [
      { text: '"Stop posting every day — it\'s actually hurting your reach"' },
      { text: '"You DON\'T need expensive tools to make professional journals"' }
    ],
    timing_rules: { when: '0-3s as hook', works_best_with: 'Myth Truth Move structure' },
    is_cutting_edge: true,
    sort_order: 3
  },
  {
    name: '100-View vs Million-View Hook',
    slug: 'awareness-level-hook',
    category: 'hook',
    description: 'Widen your hook to address UNAWARE audiences for maximum reach. A bad hook makes one person care; a viral hook makes anyone care.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Write your hook for your core audience (problem-aware)' },
      { step: 2, text: 'Rewrite it so someone with ZERO knowledge of your niche would still be curious' },
      { step: 3, text: 'Use the unaware version for viral reach; problem-aware for conversion' }
    ],
    examples: [
      { text: 'Problem-aware: "If you want to start a journal business..."', context: 'Only reaches journal makers' },
      { text: 'Unaware: "This woman makes ₱50K/month from paper and a ₱3K machine"', context: 'Anyone would click on this' }
    ],
    timing_rules: { when: '0-3s as hook', use_when: 'trying to break out of your niche bubble' },
    is_cutting_edge: true,
    sort_order: 4
  },
  {
    name: 'Labeling Hook',
    slug: 'labeling-hook',
    category: 'hook',
    description: 'Call out a specific demographic or trait to make the viewer self-identify.',
    source_creator: 'Sam Gaudet',
    steps: [
      { step: 1, text: 'Identify the specific trait/demographic you want to reach' },
      { step: 2, text: 'Use the formula: "If you want [X] or if you\'re [X], don\'t do [Y]"' }
    ],
    examples: [
      { text: '"If you\'re a homeschool mom who wants to earn from home, stop doing this..."' }
    ],
    timing_rules: { when: '0-3s as hook' },
    is_cutting_edge: false,
    sort_order: 5
  },
  {
    name: 'Framework Hook',
    slug: 'framework-hook',
    category: 'hook',
    description: 'Introduce a proprietary-sounding system to create instant curiosity.',
    source_creator: 'Sam Gaudet',
    steps: [
      { step: 1, text: 'Name your system/method (e.g., "The 3-Step Journal Method")' },
      { step: 2, text: 'Tease it in the hook: "This is the [name] rule..."' }
    ],
    examples: [
      { text: '"This is the 3-2-1 rule that doubled my journal sales"' }
    ],
    timing_rules: { when: '0-3s as hook' },
    is_cutting_edge: false,
    sort_order: 6
  },

  // ── RETENTION TECHNIQUES ────────────────────────────────────
  {
    name: 'Curiosity Stacking',
    slug: 'curiosity-stacking',
    category: 'retention',
    description: 'Open NEW curiosity loops before closing old ones. Viewer always has at least one unanswered question.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Open your first loop in the hook' },
      { step: 2, text: 'Before resolving it, introduce a second loop ("Before I met Mark...")' },
      { step: 3, text: 'Add context and delay the payoff of the first loop' },
      { step: 4, text: 'Close the second loop, then finally close the first at the very end' }
    ],
    examples: [
      { text: 'Hook: "This machine changed everything" → Context: "But before I found it, I made a terrible mistake..." → Resolve mistake story → THEN reveal the machine' }
    ],
    timing_rules: { rule: 'Always have at least one open loop', when: 'Throughout the entire video' },
    is_cutting_edge: true,
    sort_order: 10
  },
  {
    name: 'Re-hooks',
    slug: 're-hooks',
    category: 'retention',
    description: 'Mid-video attention resets. Mini-hooks placed every 7-10 seconds to re-engage viewers who are about to scroll.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Identify natural transition points in your script (every 7-10 seconds)' },
      { step: 2, text: 'Insert a re-hook phrase that opens a new curiosity gap' },
      { step: 3, text: 'Pair with a visual change (new angle, movement, text overlay)' }
    ],
    examples: [
      { text: '"But here\'s where it gets interesting..."' },
      { text: '"The part nobody talks about is..."' },
      { text: '"Wait, it gets better..."' }
    ],
    timing_rules: { frequency: 'Every 7-10 seconds', when: 'At natural transition points in script' },
    is_cutting_edge: true,
    sort_order: 11
  },
  {
    name: 'Zeigarnik Effect Opening',
    slug: 'zeigarnik-effect',
    category: 'retention',
    description: 'Show ALL elements of your video at the beginning so the brain MUST stick around to see the outcome.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'At the start, show/mention everything that will happen in the video' },
      { step: 2, text: 'Create a "which one?" question the viewer needs answered' },
      { step: 3, text: 'Delay the answer until the end' }
    ],
    examples: [
      { text: '"I\'m testing these 5 binding machines and one of them SHOCKED me"' },
      { text: '"3 journals, 3 methods, only 1 survived the drop test"' }
    ],
    timing_rules: { when: '0-5s opening', best_for: 'List content, comparison, testing videos' },
    is_cutting_edge: true,
    sort_order: 12
  },
  {
    name: 'Active Visual Engagement',
    slug: 'active-visual-engagement',
    category: 'retention',
    description: 'DO something physical while talking. Pouring a drink, walking, crafting — keeps viewers visually engaged during educational content.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Choose an activity related to your niche (crafting, organizing, making)' },
      { step: 2, text: 'Film yourself doing the activity while delivering your educational script' },
      { step: 3, text: 'The activity provides visual interest while your voice delivers value' }
    ],
    examples: [
      { text: 'Talk about business tips while making a journal at your desk' },
      { text: 'Explain marketing concepts while packaging orders' }
    ],
    timing_rules: { when: 'Entire video', best_for: 'Educational talking-head content' },
    is_cutting_edge: true,
    sort_order: 13
  },

  // ── ALGORITHM TECHNIQUES ────────────────────────────────────
  {
    name: 'Trial Reels Exploit',
    slug: 'trial-reels-exploit',
    category: 'algorithm',
    description: 'Repost your BEST-PERFORMING reels as Trial Reels (shown only to non-followers). Proven content goes viral again.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Identify your top 5-10 performing reels by views/engagement' },
      { step: 2, text: 'Repost them as Trial Reels (only shown to non-followers)' },
      { step: 3, text: 'Use the "Remix" feature to make this easy' },
      { step: 4, text: 'Proven content will go viral again without annoying existing followers' }
    ],
    examples: [
      { text: 'Your journal-making reel that got 50K views → repost as Trial Reel → reaches entirely new audience' }
    ],
    timing_rules: { frequency: 'Whenever you have proven hits', note: 'Instagram may patch this — monitor' },
    is_cutting_edge: true,
    sort_order: 20
  },
  {
    name: 'Green Screen Clone Hack',
    slug: 'green-screen-clone',
    category: 'algorithm',
    description: 'Bypass IG duplicate detector: record over green screen, swap background 7 times = 7 "new" videos with same proven audio.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Record your value content over a green screen' },
      { step: 2, text: 'Swap the background image/visual 7 different times' },
      { step: 3, text: 'Each version looks "new" to the algorithm but uses the same proven audio/script' },
      { step: 4, text: 'Post all 7 versions as Trial Reels' }
    ],
    examples: [
      { text: 'Same script about journal making → 7 different background images (workshop, store, desk, etc.)' }
    ],
    timing_rules: { when: 'When Trial Reels patched for direct reposting' },
    is_cutting_edge: true,
    sort_order: 21
  },
  {
    name: 'B-Roll Lead Magnet Printing',
    slug: 'b-roll-lead-magnet',
    category: 'algorithm',
    description: 'Record 100 simple B-roll clips + text hooks → post 10-20/day → comment keyword triggers DM funnel. Volume-based lead gen.',
    source_creator: 'Briar Cochran',
    steps: [
      { step: 1, text: 'Record 100 simple B-roll clips (crafting, organizing, walking, outfit checks)' },
      { step: 2, text: 'Add pain-point text hooks to each (e.g., "If you aren\'t doing X, what are you doing?")' },
      { step: 3, text: 'End each with: "Comment [KEYWORD] for my free [resource]"' },
      { step: 4, text: 'Post 10-20 per day — auto-trigger DM funnel on keyword comment' }
    ],
    examples: [
      { text: '8-second clip of binding a journal + text: "This one tool makes everything easier" + CTA: "Comment TOOLS for my free starter guide"' }
    ],
    timing_rules: { video_length: '8 seconds', posting_frequency: '10-20 per day' },
    is_cutting_edge: true,
    sort_order: 22
  },
  {
    name: 'Yap Fun Fact Sentiment Test',
    slug: 'yap-fun-fact-test',
    category: 'algorithm',
    description: 'Use ChatGPT for 20 fun facts → record all → post as Trial Reels → top performers = what your audience actually wants.',
    source_creator: 'Briar Cochran',
    steps: [
      { step: 1, text: 'Ask ChatGPT: "Give me 20 specific fun facts about [your niche]"' },
      { step: 2, text: 'Record yourself saying "Fun fact..." for all 20 (walking, casual)' },
      { step: 3, text: 'Post all as Trial Reels' },
      { step: 4, text: 'Whichever facts get the most views = the topics your audience wants' }
    ],
    examples: [
      { text: '"Fun fact: the paper grain direction determines if your journal lasts 1 month or 10 years" — if this one gets 10x views, make a full video on paper grain' }
    ],
    timing_rules: { when: 'Before investing in full production', purpose: 'Topic validation' },
    is_cutting_edge: true,
    sort_order: 23
  },
  {
    name: 'Comment Farming',
    slug: 'comment-farming',
    category: 'algorithm',
    description: 'Plant passive visual anomalies that compel people to comment. NOT rage-bait — subtle visual triggers.',
    source_creator: 'Briar Cochran',
    steps: [
      { step: 1, text: 'Include a small visual "mistake" or anomaly in your video' },
      { step: 2, text: 'Viewers will comment to point it out (driving comment volume)' },
      { step: 3, text: 'Reply to EVERY comment with a QUESTION — this doubles the comment count' }
    ],
    examples: [
      { text: 'Craft supplies slightly out of place in the background' },
      { text: 'Wearing something slightly unusual while doing a tutorial' }
    ],
    timing_rules: { when: 'Any video', note: 'Subtle anomaly, not obvious bait' },
    is_cutting_edge: true,
    sort_order: 24
  },
  {
    name: 'Zero Hashtags, SEO Keywords',
    slug: 'zero-hashtags-seo',
    category: 'algorithm',
    description: 'Hashtags are dead for growth. SAY your keywords out loud (IG AI transcribes) and write them in captions naturally.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Identify 3-5 target keywords for your video' },
      { step: 2, text: 'Say each keyword naturally in your spoken script' },
      { step: 3, text: 'Include keywords naturally in your caption text' },
      { step: 4, text: 'Do NOT use hashtags — they limit distribution' }
    ],
    examples: [
      { text: 'Instead of #journalmaking #homebusiness → say "journal making" and "home business" in your script' }
    ],
    timing_rules: { when: 'Every video', mandatory: 'yes for IG' },
    is_cutting_edge: true,
    sort_order: 25
  },

  // ── PRODUCTION TECHNIQUES ───────────────────────────────────
  {
    name: '1.1x Speed Hack',
    slug: 'speed-hack-1-1x',
    category: 'production',
    description: 'Bump final video to 1.1x speed in CapCut. Instantly snappier without sounding unnatural.',
    source_creator: 'Chris Chung',
    steps: [
      { step: 1, text: 'Edit your video normally' },
      { step: 2, text: 'As the final step, select the entire video in CapCut' },
      { step: 3, text: 'Set speed to 1.1x' },
      { step: 4, text: 'Export' }
    ],
    examples: [],
    timing_rules: { when: 'Final editing step', applies_to: 'All short-form content' },
    is_cutting_edge: true,
    sort_order: 30
  },
  {
    name: 'Audio Sweetening',
    slug: 'audio-sweetening',
    category: 'production',
    description: 'Speed up video 1.05x + slight pitch increase. Subconsciously prevents boredom.',
    source_creator: 'Briar Cochran',
    steps: [
      { step: 1, text: 'Speed video to 1.05x (subtler than Chung\'s 1.1x)' },
      { step: 2, text: 'Slightly increase audio pitch' },
      { step: 3, text: 'Result: viewer doesn\'t notice but stays engaged longer' }
    ],
    examples: [],
    timing_rules: { when: 'Final editing step' },
    is_cutting_edge: true,
    sort_order: 31
  },
  {
    name: 'Functional Word Limit',
    slug: 'functional-word-limit',
    category: 'production',
    description: 'Less than 33% of on-screen text should be functional words (this, I, you, he, in, on, at, and, but). They kill retention.',
    source_creator: 'Briar Cochran',
    steps: [
      { step: 1, text: 'Write your text overlay' },
      { step: 2, text: 'Count functional words (this, I, you, he, in, on, at, and, but, the, a)' },
      { step: 3, text: 'If >33% are functional → rewrite with more content words' }
    ],
    examples: [
      { text: 'Bad: "This is how I make my journals" (5/7 = 71% functional)', context: 'Too many filler words' },
      { text: 'Good: "Journal making process — cut, fold, bind" (1/6 = 17% functional)', context: 'Dense with content words' }
    ],
    timing_rules: { when: 'Every text overlay', mandatory: 'yes' },
    is_cutting_edge: true,
    sort_order: 32
  },

  // ── STRATEGY TECHNIQUES ─────────────────────────────────────
  {
    name: '4-on-4 Validation',
    slug: 'four-on-four-validation',
    category: 'strategy',
    description: 'Before creating, find 4 outlier videos on the same topic with 4x average views within the last 4 months.',
    source_creator: 'Sam Gaudet',
    steps: [
      { step: 1, text: 'Search YouTube/IG for your topic' },
      { step: 2, text: 'Find channels with 50K-500K followers (similar size to yours)' },
      { step: 3, text: 'Look for 4 videos that got 4x the creator\'s average views' },
      { step: 4, text: 'All 4 must be from the last 4 months' },
      { step: 5, text: 'If you can\'t find 4 → don\'t make the content. Topic is cold.' }
    ],
    examples: [
      { text: 'Topic: "journal making for beginners" → find 4 videos from similar-sized creators that each got 4x their usual views → topic validated' }
    ],
    timing_rules: { when: 'Before investing time in any new topic' },
    is_cutting_edge: true,
    sort_order: 40
  },
  {
    name: '70/20/10 Content Split',
    slug: 'seventy-twenty-ten',
    category: 'strategy',
    description: '70% proven formats, 20% variations on proven formats, 10% pure experiments.',
    source_creator: 'Sam Gaudet',
    steps: [
      { step: 1, text: '70% of content: repeat formats that already have >1x multiplier' },
      { step: 2, text: '20% of content: tweak ONE element of a proven format (hook, visual, topic)' },
      { step: 3, text: '10% of content: completely new experiments (expect some to flop)' }
    ],
    examples: [],
    timing_rules: { when: 'Weekly content planning' },
    is_cutting_edge: false,
    sort_order: 41
  },
  {
    name: 'CCN Fit',
    slug: 'ccn-fit',
    category: 'strategy',
    description: 'Check every topic against: Core audience (buyers), Casual audience (watchers), New audience (strangers).',
    source_creator: 'Sam Gaudet',
    steps: [
      { step: 1, text: 'Core: Does this serve your paying customers?' },
      { step: 2, text: 'Casual: Does this engage your regular watchers?' },
      { step: 3, text: 'New: Would a stranger find this interesting?' },
      { step: 4, text: 'Best topics score high on all three. Minimum: score high on two.' }
    ],
    examples: [
      { text: '"How to start a journal business" → Core ✅ (they buy tools), Casual ✅ (they watch crafting), New ✅ (anyone interested in side hustles)' }
    ],
    timing_rules: { when: 'Topic validation before creating' },
    is_cutting_edge: true,
    sort_order: 42
  },
  {
    name: 'Accordion Method',
    slug: 'accordion-method',
    category: 'strategy',
    description: 'Expand (high volume, many topics) → Contract (cut losers, double down on winners) → Repeat.',
    source_creator: 'Sam Gaudet',
    steps: [
      { step: 1, text: 'EXPAND: Post high volume across many formats and topics to gather data' },
      { step: 2, text: 'CONTRACT: After 2-4 weeks, cut everything below 1x multiplier' },
      { step: 3, text: 'Double down on winners with variations (20% from 70/20/10)' },
      { step: 4, text: 'REPEAT: Expand again to find new winners' }
    ],
    examples: [],
    timing_rules: { cycle: '2-4 week expand, then contract' },
    is_cutting_edge: true,
    sort_order: 43
  },
  {
    name: 'ICP Subtext',
    slug: 'icp-subtext',
    category: 'strategy',
    description: 'Put a specific person\'s name and description at the top of every script. Forces you to speak to ONE person.',
    source_creator: 'Sam Gaudet',
    steps: [
      { step: 1, text: 'Create 2-3 Ideal Customer Profiles with names and descriptions' },
      { step: 2, text: 'Before writing any script, paste the ICP at the top' },
      { step: 3, text: 'Write every line as if you\'re talking to that one person' }
    ],
    examples: [
      { text: '"Grace: Homeschool mom, 35, wants to earn from home, overwhelmed by tech, loves crafting, budget-conscious"' }
    ],
    timing_rules: { when: 'Top of every script' },
    is_cutting_edge: true,
    sort_order: 44
  },
  {
    name: 'Wrapping Paper Library',
    slug: 'wrapping-paper-library',
    category: 'strategy',
    description: 'Constantly screenshot outlier titles/thumbnails from ANY niche. When you have a concept, search this library for the best "wrapper."',
    source_creator: 'Caleb Ralston',
    steps: [
      { step: 1, text: 'Whenever you see an amazing title or thumbnail, screenshot it' },
      { step: 2, text: 'Save to a database/folder organized by type (curiosity, comparison, how-to, etc.)' },
      { step: 3, text: 'Look at ALL niches, not just yours (best wrappers come from unrelated niches)' },
      { step: 4, text: 'When you have a video concept, search your library for packaging inspiration' }
    ],
    examples: [
      { text: 'A cooking channel\'s thumbnail style ("I tested 100 recipes") → adapt for journals ("I tested 100 binding methods")' }
    ],
    timing_rules: { when: 'Ongoing habit + before every video' },
    is_cutting_edge: true,
    sort_order: 45
  },
  {
    name: 'Eye of Sauron',
    slug: 'eye-of-sauron',
    category: 'strategy',
    description: 'Pick 3 platforms but focus ALL innovation energy on ONE at a time. Others on maintenance mode. Rotate when first is dialed in.',
    source_creator: 'Caleb Ralston',
    steps: [
      { step: 1, text: 'Choose your 3 platforms (e.g., YouTube, Instagram, Facebook)' },
      { step: 2, text: 'Pick ONE to be the "Eye of Sauron" — all energy, testing, innovation goes here' },
      { step: 3, text: 'Other platforms get maintenance content only (reposts, clips)' },
      { step: 4, text: 'Once the focused platform is systematized, rotate focus to the next' }
    ],
    examples: [
      { text: 'Month 1-3: Focus on Instagram (test hooks, structures, timing). YouTube/FB get repurposed content. Month 4-6: Rotate focus to YouTube.' }
    ],
    timing_rules: { cycle: '2-3 months per platform', when: 'Platform strategy planning' },
    is_cutting_edge: true,
    sort_order: 46
  }
]
