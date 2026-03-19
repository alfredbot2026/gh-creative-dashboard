import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const evalData = [
  {
    title: "Income proof hook - P50K",
    content_type: "short-form-script",
    lane: "short-form",
    content: "PAANO AKO KUMITA NG P50K SA NOTEBOOK MAKING kahit sa bahay lang?",
    scores: {
      hook_specificity: 9,
      research_backing: 8,
      brand_voice_match: 9,
      production_readiness: 9,
      taglish_naturalness: 10,
      overall: 9
    },
    source: "past_content",
    notes: "High converting hook pattern"
  },
  {
    title: "Mistake hook - 3 Common",
    content_type: "short-form-script",
    lane: "short-form",
    content: "3 COMMON MISTAKES NA GINAGAWA NG BAGONG PAPER BUSINESS owners na umuubos sa puhunan nila.",
    scores: {
      hook_specificity: 8,
      research_backing: 7,
      brand_voice_match: 9,
      production_readiness: 8,
      taglish_naturalness: 9,
      overall: 8
    },
    source: "past_content",
    notes: "Pain point hook"
  },
  {
    title: "Tutorial hook - Step-by-step",
    content_type: "short-form-script",
    lane: "short-form",
    content: "Step-by-step: How to Make Spring Notebook at Home na pwedeng ibenta.",
    scores: {
      hook_specificity: 7,
      research_backing: 6,
      brand_voice_match: 8,
      production_readiness: 8,
      taglish_naturalness: 7,
      overall: 7
    },
    source: "past_content",
    notes: "Standard educational hook"
  },
  {
    title: "Ad copy - Proof first",
    content_type: "ad-copy",
    lane: "ads",
    content: "738 students na ang nag-enroll at nagsimula ng sarili nilang printing business... ikaw na lang ang kulang! Join the Papers to Profits course today.",
    scores: {
      hook_specificity: 9,
      research_backing: 9,
      brand_voice_match: 10,
      production_readiness: 9,
      taglish_naturalness: 9,
      overall: 9
    },
    source: "past_content",
    notes: "Strong social proof"
  },
  {
    title: "Ad copy - Mistake led",
    content_type: "ad-copy",
    lane: "ads",
    content: "Nagtry ka na ba mag-paper business pero hindi kumita? Baka ito ang dahilan. Most beginners focus on the wrong products. Sa workshop na ito, ituturo ko ang high-margin items.",
    scores: {
      hook_specificity: 8,
      research_backing: 8,
      brand_voice_match: 9,
      production_readiness: 9,
      taglish_naturalness: 9,
      overall: 8
    },
    source: "past_content",
    notes: "Agitation framework"
  },
  {
    title: "Ad copy - Direct CTA",
    content_type: "ad-copy",
    lane: "ads",
    content: "Papers to Profits Course — from 1K puhunan to 6 digits income. Get step-by-step video lessons and supplier lists. Enroll now!",
    scores: {
      hook_specificity: 7,
      research_backing: 7,
      brand_voice_match: 8,
      production_readiness: 9,
      taglish_naturalness: 7,
      overall: 7
    },
    source: "past_content",
    notes: "Bottom of funnel"
  },
  {
    title: "YouTube - Workshop Opening",
    content_type: "youtube-script",
    lane: "youtube",
    content: "Welcome to our free workshop! In the next 10 minutes, ipapakita ko sa inyo ang exact blueprint kung paano ko pinalago ang GH Creative. Hindi ito get-rich-quick, kailangan ng sipag, pero the system works.",
    scores: {
      hook_specificity: 8,
      research_backing: 9,
      brand_voice_match: 10,
      production_readiness: 9,
      taglish_naturalness: 9,
      overall: 9
    },
    source: "past_content",
    notes: "High retention intro"
  },
  {
    title: "YouTube - Tutorial with proof",
    content_type: "youtube-script",
    lane: "youtube",
    content: "Gusto mo bang malaman kung paano kumita ng extra income gamit ang printer mo sa bahay? In this video, gagawa tayo ng notepads na pwede mong ibenta for 100% markup.",
    scores: {
      hook_specificity: 8,
      research_backing: 8,
      brand_voice_match: 9,
      production_readiness: 8,
      taglish_naturalness: 8,
      overall: 8
    },
    source: "past_content",
    notes: "Standard YouTube format"
  },
  {
    title: "Caption - IG Taglish",
    content_type: "caption",
    lane: "short-form",
    content: "Small progress is still progress! 💡 Kapag nag-uumpisa ka pa lang, natural na madaming errors. Ang mahalaga, hindi ka sumusuko. Drop a ❤️ if you agree! #smallbusinessph #negosyo #mompreneur",
    scores: {
      hook_specificity: 6,
      research_backing: 5,
      brand_voice_match: 9,
      production_readiness: 10,
      taglish_naturalness: 10,
      overall: 8
    },
    source: "past_content",
    notes: "Engagement focused"
  },
  {
    title: "Caption - FB CTA",
    content_type: "caption",
    lane: "ads",
    content: "Ready to start your printing journey? 🖨️ Our beginner's kit has everything you need to start making personalized items today. Click the link in our bio to order yours! Limited stocks lang 'to.",
    scores: {
      hook_specificity: 7,
      research_backing: 6,
      brand_voice_match: 8,
      production_readiness: 10,
      taglish_naturalness: 8,
      overall: 8
    },
    source: "past_content",
    notes: "Sales focused"
  }
]

async function seed() {
  console.log('Seeding eval_dataset...')
  
  const { data, error } = await supabase
    .from('eval_dataset')
    .insert(evalData)
    .select()

  if (error) {
    console.error('Error seeding data:', error)
  } else {
    console.log(`Successfully seeded ${data.length} entries!`)
  }
}

seed()