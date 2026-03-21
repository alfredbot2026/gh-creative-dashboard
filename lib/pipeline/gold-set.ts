/**
 * Gold Set — Manually classified content for validation.
 * 
 * These entries represent ground truth for testing AI classification accuracy.
 * Start with synthetic examples based on Grace's known content patterns.
 * Real entries will be added once actual content is ingested.
 */
import type { GoldSetEntry } from './classification-types'

export const GOLD_SET: GoldSetEntry[] = [
  {
    platform: 'instagram',
    caption: 'Mommies, which planner spread ang gusto niyo? Left or right? 📒✨ Comment below kung anong style niyo! #PlannerPH #GracefulHomeschooling #PapersToProfits',
    content_type: 'image',
    is_synthetic: true,
    expected: {
      hook_type: 'Comparison Hooks',
      hook_confidence: 0.85,
      structure: 'Other',
      structure_confidence: 0.6,
      topic_category: 'Planner Organization',
      content_purpose: 'educate',
      visual_style: 'product_demo',
      text_overlay_style: 'none',
      production_quality: 'lit_styled',
      cta_type: 'Comment',
      emotional_tone: 'warm_personal',
      taglish_ratio: '60% Tagalog / 40% English',
      key_elements: ['comparison', 'engagement bait', 'product showcase'],
    },
  },
  {
    platform: 'instagram',
    caption: '5 years ago, wala akong alam sa paper crafting. Ngayon? Full-time na akong crafter at homeschool mom. Kung kaya ko, KAYA MO RIN, Ate! 💪🌟 Story time sa next reel. #Mompreneur #TransformationStory',
    content_type: 'reel',
    is_synthetic: true,
    expected: {
      hook_type: '"Time-Lapse" / "Years Ago" Storytelling Hooks',
      hook_confidence: 0.9,
      structure: 'The Fake Case Study Structure',
      structure_confidence: 0.7,
      topic_category: 'Personal Story / Transformation',
      content_purpose: 'inspire',
      visual_style: 'talking_head',
      text_overlay_style: 'bold_sans_center',
      production_quality: 'phone_casual',
      cta_type: 'Follow',
      emotional_tone: 'inspirational',
      taglish_ratio: '70% Tagalog / 30% English',
      key_elements: ['transformation', 'time-lapse', 'personal story', 'encouragement'],
    },
  },
  {
    platform: 'youtube',
    caption: 'How I Organize My Entire Week in 30 Minutes (Planner Setup Tutorial)',
    content_type: 'youtube_video',
    is_synthetic: true,
    expected: {
      hook_type: 'Bridge Hooks',
      hook_confidence: 0.75,
      structure: 'The Step-by-Step Tutorial Structure',
      structure_confidence: 0.95,
      topic_category: 'Planner Organization',
      content_purpose: 'educate',
      visual_style: 'tutorial_screencast',
      text_overlay_style: 'subtitle_bottom',
      production_quality: 'lit_styled',
      cta_type: 'Subscribe',
      emotional_tone: 'warm_personal',
      taglish_ratio: '50% English / 50% Tagalog',
      key_elements: ['how-to', 'time-saving', 'number in title', 'tutorial'],
    },
  },
  {
    platform: 'instagram',
    caption: '🎉 LAST DAY! Papers to Profits Starter Kit is on SALE — ₱1,300 lang until midnight! Link in bio to grab yours. Di mo na kailangan mag-isip ng design from scratch. Ready-made templates na! 🛒💕',
    content_type: 'image',
    is_synthetic: true,
    expected: {
      hook_type: 'The Contrarian Perspective Framework',
      hook_confidence: 0.5,
      structure: 'Product/Service Breakdown Structure',
      structure_confidence: 0.7,
      topic_category: 'Product Launch / Sale',
      content_purpose: 'sell',
      visual_style: 'product_demo',
      text_overlay_style: 'bold_sans_center',
      production_quality: 'lit_styled',
      cta_type: 'Link in Bio',
      emotional_tone: 'urgent',
      taglish_ratio: '60% Tagalog / 40% English',
      key_elements: ['urgency', 'price anchor', 'sale', 'CTA'],
    },
  },
  {
    platform: 'instagram',
    caption: 'Behind the scenes ng isang order day! 📦 50 cake toppers in one morning — posible ba? Watch until the end to find out! 😱 #SmallBusinessPH #PackingOrders',
    content_type: 'reel',
    is_synthetic: true,
    expected: {
      hook_type: 'The Iceberg Effect',
      hook_confidence: 0.8,
      structure: 'Dumb Down Content Structures',
      structure_confidence: 0.6,
      topic_category: 'Behind the Scenes / Day in the Life',
      content_purpose: 'prove',
      visual_style: 'behind_the_scenes',
      text_overlay_style: 'subtitle_bottom',
      production_quality: 'phone_casual',
      cta_type: 'Save',
      emotional_tone: 'excited',
      taglish_ratio: '65% Tagalog / 35% English',
      key_elements: ['behind the scenes', 'number challenge', 'suspense', 'packing'],
    },
  },
]

/**
 * How many gold set entries we need before proceeding to full classification.
 * Minimum 20 for statistical significance.
 * Start with 5 synthetic, add real entries after ingest.
 */
export const GOLD_SET_MIN_ENTRIES = 20
export const GOLD_SET_MIN_AGREEMENT = 0.8  // 80% agreement required
