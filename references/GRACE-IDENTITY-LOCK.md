# Grace — Identity Lock Profile

> Used by image generation pipeline to maintain character consistency.
> Source: 4 reference photos provided by Rob (2026-03-24)

## Identity Lock Prompt (for Gemini Image Generation)

> Southeast Asian (Filipina) woman, age mid-to-late 40s, soft oval face with full rounded cheeks and a small rounded chin. Dark brown-black almond-shaped eyes with low double eyelid crease, slightly wide-set. Thin natural dark eyebrows with soft low arch. Low-bridge medium-width nose with rounded bulbous tip. Thin-to-medium lips with subtle cupid's bow, natural dusty pink lip color. Warm golden-beige skin tone (NC35-40), small dark beauty mark on left cheek. Long jet-black straight hair loosely pulled back with face-framing strands. Oversized translucent pale pink/champagne square-geometric prescription glasses with rose-gold metal temple accents — dominant facial feature. Warm genuine slightly asymmetric smile with pronounced nasolabial folds. Medium-to-full soft body build. No makeup, natural appearance. Approachable, warm, friendly expression.

## Critical Features (must match every generation)

1. **Glasses** — Oversized translucent pale pink/champagne square-geometric frames with rose-gold accents. NEVER omit.
2. **Hair** — Jet-black, straight, long (past shoulders), loosely pulled back with face-framing strands
3. **Skin** — Warm golden-beige (NC35-40), small dark beauty mark on left cheek
4. **Face** — Soft oval with full rounded cheeks, small rounded chin
5. **Smile** — Warm, genuine, slightly asymmetric (left side lifts higher), pronounced nasolabial folds
6. **Build** — Medium-to-full, soft
7. **Look** — No makeup, natural, approachable

## Reference Photos

- `grace-refs/front-smile.jpg` — Front-facing, big smile, direct camera
- `grace-refs/three-quarter-right.jpg` — 3/4 right, soft smile, desk/monitor background
- `grace-refs/three-quarter-right-2.jpg` — 3/4 right, slight smile, bookshelf background
- `grace-refs/three-quarter-left.jpg` — 3/4 left, warm smile, craft workspace background

## Technical Notes

- Face should occupy 30-50% of frame
- Minimum resolution: 1024×1024
- Lighting: standardized diffused (avoid harsh directional)
- Camera style: portrait lens, f/2.8, shallow depth of field
- Identity lock formula: "Maintain the exact same facial features as the reference images"
- Use multi-turn sessions with anchor chain for consistency
