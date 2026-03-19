INSERT INTO brand_style_guide (
  voice_rubric,
  caption_rules,
  creator_description
) VALUES (
  '{
    "tone_descriptors": ["warm", "empowering", "knowledgeable", "approachable"],
    "taglish_ratio": {"target": 0.4, "min": 0.2, "max": 0.6},
    "formality_levels": {"instagram": "casual", "youtube": "semi-formal", "ads": "direct"},
    "vocabulary_whitelist": ["mommy", "kumita", "puhunan", "negosyo", "diskarte"],
    "vocabulary_blacklist": ["utilize", "leverage", "synergy"],
    "banned_ai_words": ["delve", "tapestry", "landscape", "in conclusion", "it is important to note", "realm", "multifaceted"],
    "example_phrases": ["Kalma lang, Mommy", "Step-by-step lang"],
    "scoring_weights": {"tone": 0.3, "vocabulary": 0.2, "taglish": 0.2, "formality": 0.15, "banned_words": 0.15}
  }'::jsonb,
  '{
    "instagram": {"max_length": 2200, "hashtag_count": 15, "emoji_usage": "moderate", "cta_required": true},
    "tiktok": {"max_length": 4000, "hashtag_count": 5, "emoji_usage": "minimal", "cta_required": false},
    "youtube": {"max_length": 5000, "hashtag_count": 3, "emoji_usage": "minimal", "cta_required": true}
  }'::jsonb,
  'Grace is a Filipina entrepreneur and content creator focused on Facebook ads and e-commerce.'
);
