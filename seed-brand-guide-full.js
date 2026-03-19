const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const brandStyleGuide = {
  // ── VISUAL IDENTITY ────────────────────────────────────────────────────────
  color_palette: [
    {
      name: "Cream White",
      hex: "#FAF6F1",
      usage: "Primary background — gives warmth without harsh white; use for page/card backgrounds"
    },
    {
      name: "Rose Gold",
      hex: "#C9956A",
      usage: "Primary brand accent — CTAs, highlights, price tags, key UI elements"
    },
    {
      name: "Soft Blush Pink",
      hex: "#F2D0C8",
      usage: "Secondary accent — section backgrounds, badges, subtle dividers"
    },
    {
      name: "Deep Mauve",
      hex: "#7C4F5A",
      usage: "Typography anchor — headings, bold statements, emphasis text"
    },
    {
      name: "Warm Taupe",
      hex: "#C4A882",
      usage: "Supporting neutral — borders, icon fills, product tags"
    },
    {
      name: "Sage Mist",
      hex: "#B8C5B0",
      usage: "Optional fresh accent — nature/lifestyle imagery overlays; do not overuse"
    },
    {
      name: "Charcoal Ink",
      hex: "#3A3535",
      usage: "Body text, captions, fine print — never pure black"
    }
  ],

  typography: {
    heading_font: "Playfair Display",
    body_font: "DM Sans",
    caption_font: "DM Sans",
    accent_font: "Cormorant Garamond",
    rules: [
      "Headings: Playfair Display, sentence case (never all-caps), Rose Gold or Deep Mauve",
      "Body copy: DM Sans 400, 16–18px, Charcoal Ink #3A3535, 1.6 line height",
      "Accent callouts (pull quotes, testimonial text): Cormorant Garamond italic",
      "Minimum body font size on mobile: 15px",
      "Never use more than 2 fonts in a single graphic",
      "Letter-spacing on headings: 0 to -0.02em (tight, never wide-tracked)",
      "Price/number callouts: DM Sans 700, Rose Gold — make money feel achievable, not hype"
    ]
  },

  photography_style: `Warm, sun-drenched Filipino home aesthetic. Think natural window light, wooden surfaces, rattan/wicker accents, scattered craft supplies (scissors, paper, washi tape). The mood is: productive but peaceful — a mom who has her life together without being Instagram-perfect. Key directives:

- Lighting: golden hour or soft diffused natural light. No harsh studio lighting. No cold tones.
- Backgrounds: cream walls, light wood tables, soft linen textures. Occasionally a cozy kitchen or workroom corner.
- Props: printed journals/planners/stickers (the actual P2P products), Canva-open laptop or iPad, Xendit/GCash receipt screenshots (blurred amounts OK), a cup of coffee or milo.
- Color temperature: warm (5000–6500K). Slight warm grade in post.
- Composition: lifestyle first. Product detail second. Story always.
- Avoid: generic stock photos, cold-lit office setups, Western/non-Filipino environments, clutter without intention.
- Ratio guidance: 1:1 for IG feed, 9:16 for Reels/TikTok, 4:5 for Facebook feed.`,

  product_styling_rules: `Papers to Profits physical products are the hero — show them AS tools, not trophies.

JOURNALS / PLANNERS:
- Show flat-lay: open to a filled-in page (mock student use). No blank pages — they look unfinished.
- Stack 2–3 units at slight angles for volume/variety. Fan the pages.
- Add context props: pen, highlighter, sticky note, coffee cup edge.

STICKERS / LABELS:
- Show on a product (applied to a journal, planner cover, or glass jar).
- Never floating on a white background — always in context.
- Group in clusters of 3–5 for visual richness.

DIGITAL FILES / TEMPLATES (on screen):
- Canva editor open on a laptop or iPad — show the design in progress, not just the finished flat PDF.
- Pair with the printed physical version beside the screen when possible.

PACKAGING / SHIPPING:
- Show the unboxing moment: kraft envelope, printed label, sticker seal. Filipino shipping context (Shopee/TikTok packaging).
- Include a handwritten thank-you note prop if available.

GENERAL RULES:
- Products must be identifiable as Grace's (branded label, GH color palette visible somewhere).
- Never use competitor product photos.
- Always show products in use — in the hands of a mom, on her desk, in her bag.`,

  // ── GRACE'S APPEARANCE (for AI image generation) ──────────────────────────
  creator_description: `Grace is a Filipino woman in her early-to-mid 30s. She has a warm, approachable presence — the "ate" (older sister) energy that Filipino moms trust immediately. Physical baseline for image generation:

- Ethnicity: Filipina, Southeast Asian features
- Complexion: medium-warm morena skin tone
- Hair: dark brown/black, typically worn down in soft waves or a casual low bun; occasional hair clip or headband
- Build: petite to average Filipino frame
- Expression: genuine smile, warm eyes — never forced or overly glamorous
- Age read: early-to-mid 30s, youthful but clearly a mom

IMPORTANT: Grace is NOT a fashion influencer. She should look like a smart, put-together Filipino mom who runs a real business — not a lifestyle blogger. Keep it real.`,

  wardrobe_notes: `Grace's wardrobe is "elevated casual Filipina mom" — never corporate, never streetwear, never Western-trendy.

CORE PALETTE (align with brand colors):
- Cream/off-white blouses and dresses
- Dusty rose or blush pink tops
- Warm beige or tan casual blazers over a white tee
- Mauve or rose gold accessories (simple studs, thin necklace)
- Neutral bottoms (light denim, beige linen trousers)

STYLES THAT WORK:
- Flowy sleeveless blouse (common in PH climate)
- Casual floral print (Filipino everyday wear — not tourist prints)
- Simple barong-inspired textures for formal content
- Linen or cotton fabrics (practical for warm PH weather)

AVOID:
- Heavy makeup or high-fashion looks (alienates her audience)
- Western logos / branded streetwear
- Revealing clothing — her audience is conservative/faith-aligned
- Heavy jewelry or bling
- Any clothing that reads as "rich influencer" rather than "real mom who built this"`,

  // ── BRAND VOICE ────────────────────────────────────────────────────────────
  voice_rubric: {
    tone_descriptors: [
      "warm",
      "empowering",
      "knowledgeable",
      "approachable",
      "sisterly",
      "practical",
      "faith-grounded",
      "never condescending",
      "never hype-y"
    ],
    taglish_ratio: {
      target: 0.45,
      min: 0.25,
      max: 0.65,
      note: "Filipino first, English for technical/business terms. Never pure English — it feels cold. Never pure Tagalog — reduces clarity on how-to content."
    },
    formality_levels: {
      instagram: "casual-warm",
      tiktok: "casual-energetic",
      facebook: "conversational-direct",
      youtube: "semi-formal-teaching",
      ads: "direct-empowering",
      email: "warm-personal"
    },
    vocabulary_whitelist: [
      "mommy", "ate", "kumita", "negosyo", "puhunan", "diskarte",
      "swak", "worth it", "kaya mo 'to", "sariling negosyo",
      "passive income", "side hustle (used sparingly)", "pangarap",
      "tulungan", "laban", "trabaho", "pamilya"
    ],
    vocabulary_blacklist: [
      "utilize", "leverage", "synergy", "paradigm", "robust",
      "seamless", "game-changer", "disruptive", "hustle culture",
      "grind", "boss babe", "girlboss"
    ],
    banned_ai_words: [
      "delve", "tapestry", "landscape", "in conclusion",
      "it is important to note", "realm", "multifaceted",
      "it's worth noting", "moreover", "furthermore",
      "I cannot stress enough", "at the end of the day",
      "having said that", "needless to say",
      "in today's fast-paced world", "unleash your potential"
    ],
    example_phrases: [
      "Kalma lang, Mommy — step by step natin 'to.",
      "Hindi mo kailangan ng malaking puhunan para magsimula.",
      "Yung papel lang sa bahay mo? Kaya maging negosyo yan.",
      "Hindi ito 'yung tipong business na kailangan mong iwan ang bahay.",
      "Kapag nalaman mo 'to, dun ka magsisimulang kumita.",
      "Real talk: ginawa ko ito para sa pamilya ko, at nagbunga."
    ],
    scoring_weights: {
      tone: 0.3,
      vocabulary: 0.2,
      taglish: 0.2,
      formality: 0.15,
      banned_words: 0.15
    },
    cta_style: "Soft invitation, not pressure. 'Subukan mo' > 'Buy now'. 'I-message mo ako' > 'Click the link'."
  },

  // ── CAPTION RULES ──────────────────────────────────────────────────────────
  caption_rules: {
    instagram: {
      max_length: 2200,
      ideal_length: 150,
      hashtag_count: 15,
      hashtag_placement: "end of caption after line break",
      emoji_usage: "moderate — 2–4 per caption, warm/relatable emojis (☕🌸📖✨)",
      cta_required: true,
      cta_examples: ["I-message ako para sa details!", "Save this for later, Mommy ✨", "Tag a mom na gusto mo rin itong malaman."],
      structure: "Hook (1 sentence) → Story/Value (2–4 sentences) → CTA (1 sentence) → Hashtags"
    },
    tiktok: {
      max_length: 4000,
      ideal_length: 80,
      hashtag_count: 5,
      hashtag_placement: "inline or end",
      emoji_usage: "minimal — 1–2 max",
      cta_required: false,
      note: "TikTok captions are secondary to the video hook. Keep it ultra short."
    },
    facebook: {
      max_length: 63206,
      ideal_length: 300,
      hashtag_count: 3,
      hashtag_placement: "end",
      emoji_usage: "moderate — 3–5, used to break up paragraphs",
      cta_required: true,
      cta_examples: ["Comment 'INFO' para ipadala ko sa inyo ang details!", "I-share sa mga mommy friends mo 💕"],
      structure: "Scroll-stopping first line → Problem agitation (2–3 sentences) → Solution reveal → Social proof snippet → CTA"
    },
    youtube: {
      max_length: 5000,
      ideal_length: 500,
      hashtag_count: 3,
      hashtag_placement: "end of description",
      emoji_usage: "minimal — used as bullet points only",
      cta_required: true,
      structure: "What the video covers (2 sentences) → Key timestamps → Related links → Channel CTA → Hashtags"
    },
    ads: {
      max_length: 125,
      ideal_length: 80,
      hashtag_count: 0,
      emoji_usage: "none or 1 max",
      cta_required: true,
      cta_examples: ["I-message si Grace para malaman kung paano.", "Mag-enroll na sa Papers to Profits."],
      note: "Ad copy: lead with the transformation, not the product. 'Kumita ng ₱5,000 sa papel' > 'Enroll in P2P course'"
    }
  },

  // ── AVOID LIST ─────────────────────────────────────────────────────────────
  avoid_list: [
    "Competitors' branding or logos",
    "Any imagery that looks like a Western lifestyle brand",
    "Cold blue/green color grades",
    "Overly polished, unattainable aesthetics",
    "Religious imagery used decoratively (faith is real, not aesthetic)",
    "Political content",
    "Revealing or immodest clothing on Grace or talent",
    "Generic motivational quotes without P2P/paper business context",
    "Fake testimonials or fabricated income claims",
    "Children's faces without explicit parental consent flag"
  ]
};

async function run() {
  console.log('Checking existing brand_style_guide rows...');
  
  const { data: existing, error: checkErr } = await supabase
    .from('brand_style_guide')
    .select('id')
    .limit(1);

  if (checkErr) {
    console.error('❌ Error checking table:', checkErr.message);
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log(`⚠️  Table already has ${existing.length} row(s). Updating the first row instead of inserting.`);
    const { data, error } = await supabase
      .from('brand_style_guide')
      .update(brandStyleGuide)
      .eq('id', existing[0].id)
      .select();
    
    if (error) {
      console.error('❌ Update failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Brand style guide UPDATED. Row ID:', data[0].id);
    return;
  }

  console.log('Inserting brand style guide...');
  const { data, error } = await supabase
    .from('brand_style_guide')
    .insert([brandStyleGuide])
    .select();

  if (error) {
    console.error('❌ Insert failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Brand style guide INSERTED. Row ID:', data[0].id);
  console.log('Fields populated:', Object.keys(brandStyleGuide).join(', '));
}

run();
