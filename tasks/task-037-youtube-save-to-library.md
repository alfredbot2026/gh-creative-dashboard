# TASK-037: YouTube Save to Library

## Reference Files to Read
- `app/actions/create.ts` — Existing save-to-library pattern (copy this approach)
- `app/create/youtube/page.tsx` — Current YouTube UI (add save button)
- `app/api/create/youtube-script/route.ts` — Script generation API
- `LESSONS-LEARNED.md` — Read before starting
- `BEST-PRACTICES.md` — Read before starting

## Overview
Add "Save to Library" button to the YouTube script result page. When clicked, saves the full script + metadata to `content_items` table. Same pattern used for social posts and ad saves.

## Wave 1: Server Action

### 1a. Add YouTube save action
- **File:** `app/actions/create.ts` (Modify)
- Add `saveYouTubeScript()` server action
- Insert into `content_items` with:
  - `content_type`: `'youtube'`
  - `title`: selected title from `title_options`
  - `script_data`: full JSON result (sections, description, tags, thumbnail_concept)
  - `platform`: `'youtube'`
  - `content_purpose`: from generation params
  - `product_id`: from generation params (if any)
  - `status`: `'draft'`
- Follow the exact same insert pattern as the existing social post save

### Verify Wave 1:
```bash
npx tsc --noEmit
```

## Wave 2: UI Integration

### 2a. Add Save button to YouTube result
- **File:** `app/create/youtube/page.tsx` (Modify)
- Add "Save to Library" button below the script result (next to the existing copy buttons)
- On click: call `saveYouTubeScript()` with the result data
- Show loading state while saving
- Show success toast/message when saved
- Disable button after successful save (prevent double-save)
- Add a title selector: let user pick which of the 3 `title_options` to use as the saved title

### Verify Wave 2:
```bash
npm run build
```

## Final Verification
```bash
npm run build
npm run dev
# Test: generate a YouTube script, then click Save to Library
# Verify: check content_items table has the new row
```

## Success Criteria
- Save button visible on YouTube script result
- Clicking save creates a row in content_items with full script data
- Selected title used as the content_items title
- No duplicate saves (button disabled after first save)
- Build passes, no type errors
