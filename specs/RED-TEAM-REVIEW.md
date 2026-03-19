# RED TEAM REVIEW — Creative Dashboard v2 PROJECT-SPEC

## Executive Summary
Verdict: **PROCEED WITH CHANGES** (no single P0 architecture blocker, but multiple **P1 structural risks** that will cause bad outputs, brittle ops, and false confidence if not addressed before Phase 1 implementation).

The plan is directionally strong, but it currently overestimates reliability in four places: (1) knowledge scoring quality, (2) NotebookLM extraction stability, (3) Gemini visual consistency, and (4) automated learning-loop correctness. If you build exactly as written, you’ll get a polished UI around a noisy decision engine that can self-reinforce mediocre patterns.

Biggest risk concentration:
1. **Learning loop + effectiveness_score automation** (highest systemic risk)
2. **NotebookLM as primary upstream research source** (data quality/supply risk)
3. **Brand consistency promises for generated images** (expectation vs model reality)

---

## 1) Knowledge Base Design

### Finding 1.1 — `effectiveness_score` is underspecified and likely to become a vanity metric
- **Severity:** P1
- **Issue:** Score is defined as 0–100 and “updated by learning loop,” but no formal update formula, confidence bounds, sample-size floor, or recency decay is specified.
- **Impact:** Small-sample wins can dominate ranking; one lucky post can overweight weak patterns; teams will trust score as objective truth when it is noisy.
- **Fix:** Define a scoring contract before coding:
  - Minimum sample threshold before score can influence ranking
  - Bayesian shrinkage (or equivalent) toward prior until enough evidence
  - Recency weighting with bounded decay
  - Confidence interval/uncertainty column, not just point score

### Finding 1.2 — Feedback-loop narrowing is very likely
- **Severity:** P1
- **Issue:** Ranking by high score first + updating from top performers can quickly collapse diversity (“winner-takes-all hooks”).
- **Impact:** Creative stagnation, reduced experimentation, eventual performance decay as audiences fatigue.
- **Fix:** Add explicit exploration controls:
  - 70/20/10 policy (exploit/explore/novel)
  - Diversity constraints (do not reuse same subcategory too frequently)
  - Saturation penalty when a pattern is overused

### Finding 1.3 — Category model is good, but schema is not enough for causal attribution
- **Severity:** P1
- **Issue:** `times_successful` tied to “content performed above median” is too coarse and confounded (timing, topic, platform conditions, paid spend, seasonality).
- **Impact:** Wrong KB entries get credit/blame; bad learning decisions become automated.
- **Fix:** Track contribution metadata per generation:
  - Which entries were primary vs auxiliary context
  - Lane-specific outcome decomposition
  - Controls: posting time bucket, topic cluster, campaign objective

### Finding 1.4 — Missing governance state for knowledge quality
- **Severity:** P2
- **Issue:** No lifecycle fields for `candidate/approved/deprecated/archived`.
- **Impact:** Low-trust entries pollute generation context.
- **Fix:** Add review status + reviewer + review timestamp; only approved entries can be “high influence.”

---

## 2) NotebookLM Dependency

### Finding 2.1 — Mitigation is directionally right but incomplete
- **Severity:** P1
- **Issue:** “Extract then don’t depend at generation time” helps runtime availability, but not **upstream correctness/staleness**.
- **Impact:** Silent drift: stale or malformed extracted knowledge continues influencing outputs for weeks.
- **Fix:** Add hardening layer:
  - Version every extraction run
  - Diff + quality checks (schema validity, duplication, contradiction checks)
  - Rollback to last known-good extraction set
  - “Source freshness” SLA visible in UI

### Finding 2.2 — Single primary research pipeline is operational fragility
- **Severity:** P1
- **Issue:** NotebookLM is still the dominant feed. If format changes, quota limits, or extraction degradation occur, Phase 1+ quality drops.
- **Impact:** Creation engine quality cliff with little warning.
- **Fix:** Define secondary feeds now (manual structured imports, curated docs, YouTube transcript ingestion) and weighted source trust.

### Finding 2.3 — No trust scoring by source type
- **Severity:** P2
- **Issue:** `source` is captured, but no source reliability weighting.
- **Impact:** Unverified competitor hearsay can rank close to performance-backed entries.
- **Fix:** Add `source_confidence` and enforce ranking multipliers (performance_data > curated_manual > extracted_unverified).

---

## 3) Gemini Image Generation + Brand Consistency

### Finding 3.1 — Promise of consistent character identity across generations is overly optimistic
- **Severity:** P1
- **Issue:** Prompt-only control (“Grace description”) is not sufficient for stable identity continuity across many generations.
- **Impact:** Inconsistent face/style outputs; stakeholder frustration; manual rework explodes.
- **Fix:** Reframe requirement from “consistent character” to “brand-coherent style” unless using dedicated reference-image workflows with strict acceptance criteria.

### Finding 3.2 — Missing acceptance tests for visual consistency
- **Severity:** P1
- **Issue:** No objective QA gate for “brand consistent.”
- **Impact:** Subjective approvals, unpredictable quality, regressions unnoticed.
- **Fix:** Define measurable checks:
  - Palette compliance threshold
  - Typography/layout rule checks (when overlays are generated)
  - Human approval checkpoint before calendar commit

### Finding 3.3 — Carousel coherence risk is underestimated
- **Severity:** P2
- **Issue:** Per-slide independent generation often drifts in composition, lighting, and tone.
- **Impact:** Carousel looks assembled from unrelated assets.
- **Fix:** Generate shared “art direction packet” first (global scene/style constraints), then slide prompts inherit immutable core descriptors.

---

## 4) Learning Loop (Top 20% / Bottom 20%)

### Finding 4.1 — Top/bottom quintiles are too simplistic for low-volume lanes
- **Severity:** P1
- **Issue:** YouTube lane at ~1/week means tiny sample sizes; quintiles become statistically weak.
- **Impact:** Volatile score updates and false pattern detection.
- **Fix:** Use lane-specific windows and minimum-N gates before any automatic score mutation.

### Finding 4.2 — Automated de-prioritization can punish experiments unfairly
- **Severity:** P1
- **Issue:** Bottom performers reduce scores without handling novelty penalty or off-cycle effects.
- **Impact:** System becomes conservative and avoids testing new formats.
- **Fix:** Separate “experimental” content from baseline; do not penalize first-run variants as strongly.

### Finding 4.3 — Composite metrics need explicit weight governance
- **Severity:** P2
- **Issue:** Weighted formulas are mentioned but not controlled operationally.
- **Impact:** Teams may tune weights ad hoc to tell preferred stories.
- **Fix:** Version metric formulas; log weight changes with changelog and effective date.

---

## 5) Phasing Review

### Finding 5.1 — Missing “observability + eval harness” before generation scale-up
- **Severity:** P1
- **Issue:** Phase 1 starts generation without a formal offline eval set and prompt/output regression tests.
- **Impact:** You won’t know if changes improve quality or just change style.
- **Fix:** Insert **Phase 0.5** (or 1a prerequisite): eval dataset, scoring rubric, prompt regression snapshots.

### Finding 5.2 — Learning loop should not auto-write high-impact scores initially
- **Severity:** P1
- **Issue:** Phase 4 assumes fully automated updates immediately.
- **Impact:** Early bad analytics can corrupt KB ranking.
- **Fix:** Start with “recommendation mode” (human approve score updates) for first 4–8 weeks.

### Finding 5.3 — Brand system dependency should be explicit for ads + thumbnails
- **Severity:** P2
- **Issue:** Phase 2 depends on 0c informally; should be hard gate in roadmap tracking.
- **Impact:** Image pipeline starts before brand constraints are mature.
- **Fix:** Add explicit dependency checklists in phase entry criteria.

---

## 6) Scope Risk / Overengineering

### Finding 6.1 — Simultaneous multi-lane intelligence is a scope trap
- **Severity:** P1
- **Issue:** Three fully distinct creation engines + cross-lane learning + image generation + analytics in one major wave is high integration risk.
- **Impact:** Long delivery cycle, brittle partial integrations, and delayed value to Grace.
- **Fix:** Narrow first ROI slice: short-form + ad static (no carousel auto-first), postpone cross-lane intelligence until proven per-lane reliability.

### Finding 6.2 — “Generate a week in <10 min” can incentivize low-quality throughput
- **Severity:** P2
- **Issue:** Speed KPI may push system toward shallow scripts.
- **Impact:** Quantity over quality and trust erosion.
- **Fix:** Pair speed KPI with quality KPIs (approval rate without heavy edits, post-publish performance delta).

---

## 7) What’s Missing Entirely (Critical Gaps)

### Finding 7.1 — No explicit human-in-the-loop safety and override policy
- **Severity:** P1
- **Issue:** System updates knowledge and influences future generation, but no mandatory review points are defined.
- **Impact:** Autonomous drift and hard-to-debug degradation.
- **Fix:** Define required manual checkpoints for:
  - New high-impact knowledge entries
  - Score changes beyond threshold
  - Deprecation of formerly high-performing patterns

### Finding 7.2 — Missing auditability and provenance chain
- **Severity:** P1
- **Issue:** Need trace from output → used KB entries → source extraction run/version.
- **Impact:** Impossible to debug “why did it generate this?”
- **Fix:** Add immutable generation provenance records.

### Finding 7.3 — No failure-mode UX for degraded dependencies
- **Severity:** P2
- **Issue:** If NotebookLM extraction fails or Gemini image quality drops, fallback behavior is not defined.
- **Impact:** User confusion and blocked workflow.
- **Fix:** Add graceful degradation paths (text-only generation, cached KB mode, manual prompt fallback).

### Finding 7.4 — Compliance/rights checks for generated and competitor-derived content are absent
- **Severity:** P1
- **Issue:** Competitor intel and generated creatives risk style imitation or improper reuse.
- **Impact:** Legal/reputation risk.
- **Fix:** Add policy checks + review flags for close imitation and restricted assets.

---

## Priority Actions Before Build (Recommended)

1. **Define scoring math + uncertainty + minimum sample gates** (P1)
2. **Add exploration/diversity policy to prevent feedback collapse** (P1)
3. **Implement extraction versioning + rollback + data quality checks** (P1)
4. **Re-scope image consistency claims to realistic, testable targets** (P1)
5. **Insert eval harness phase before large-scale generation rollout** (P1)
6. **Run learning loop in recommendation mode first, not autonomous write mode** (P1)

---

## Bottom Line
This is a strong product direction with clear value, but the current spec is **too optimistic about autonomous learning correctness and visual consistency reliability**. Tighten measurement, governance, and fallback design now, or you’ll ship a sophisticated interface over unstable model behavior.
