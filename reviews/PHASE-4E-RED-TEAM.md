# Red-Team Review — Phase 4e Ad Intelligence + Creative Factory

**Spec reviewed:** `specs/phase-4e-ad-intelligence-creative-factory.md`  
**Prereq reviewed:** `specs/phase-4d-ad-feedback-loop.md`  
**Context reviewed:** `references/AD-FRAMEWORKS.md`, `ROADMAP.md`  
**Reviewer:** Tony (Red Team)  
**Date:** 2026-03-26

---

## Executive Verdict

## **BLOCK (P0 present)**

The concept is strong and strategically differentiated, but the current spec is not safe to implement as-is for a SaaS context. The biggest risks are tenant isolation drift, token handling ambiguity, and model-confidence overreach from thin data.

---

## P0 Blockers (fix before build)

| # | Severity | Area | Issue | Why this blocks | Required fix |
|---|---|---|---|---|---|
| 1 | P0 | Multi-tenant security | **Tenant model inconsistency (`user_id` in 4e vs `tenant_id` in 4d)** | Existing analytics schema is tenant-scoped. 4e proposes `ad_creatives.user_id` and `UNIQUE(user_id, meta_ad_id)` with no explicit tenant/account scoping. This can cause cross-workspace leakage and incorrect joins in multi-seat orgs. | Standardize on `tenant_id` across all ad intelligence/factory tables. Keep `created_by_user_id` optional for audit, not for ownership. |
| 2 | P0 | RLS / data exposure | **No explicit RLS policies defined for new 4e tables/endpoints** | Spec says “RLS enforced” but does not define policies, service-role boundaries, or cross-table join protections. In practice this is where leaks happen. | Add concrete SQL policies for each new table (`ad_creatives`, recommendations, batches, generated assets, mappings). Include policy tests for tenant-escape attempts. |
| 3 | P0 | Credentials / API token handling | **Meta token lifecycle and storage not specified for 4e sync jobs** | `/api/ads/creatives/sync` is a privileged ingestion path. Without explicit encryption-at-rest, rotation/refresh, access boundaries, and logging hygiene, token compromise risk is high. | Reuse hardened token model from 3.5: encrypted token storage, scoped decrypt in server-only path, redacted logs, rotation/expiry handling, revocation flow, and per-tenant key separation. |
| 4 | P0 | Unsafe decisioning | **Recommendations presented as high-confidence strategy from only 12–15 ads** | Small-sample inference can drive bad spend decisions. System currently outputs decisive recommendations without confidence gating. This is product-risk severe enough to block “autonomous strategy” claims. | Add confidence model + minimum sample thresholds. No “high priority recommendation” without minimum spend/impressions/sample criteria; otherwise label as hypothesis. |

---

## Security Review (Meta API, RLS, exposure)

### 1) Meta API token handling

**Findings**
- 4e introduces additional token-using surfaces (`/api/ads/creatives/sync`, daily cron) but does not restate security controls inherited from 3.5.
- Creative payloads may include sensitive account metadata (campaign naming conventions, audience hints in adset names).
- No explicit mention of log redaction (request/response bodies can accidentally expose tokens, ad IDs, account IDs, URLs).

**Recommendations**
- Explicit “Token Security” section in 4e spec:
  - encrypted token blob at rest
  - decryption only in server context
  - never return raw token to client
  - automatic refresh + revoke/disconnect
  - redacted observability (`access_token`, auth headers, raw OAuth payloads)
- Add endpoint-level authz check: only tenant owner/admin can trigger full sync manually.
- Add sync idempotency key + lock (avoid concurrent sync races that can expose partial data states).

### 2) RLS and data isolation

**Findings**
- 4d correctly uses `tenant_id` + RLS policy, but 4e table draft uses `user_id` ownership semantics.
- No policy examples for:
  - generated creative variants
  - weekly plans/batches
  - recommendations artifacts
  - ad-account map cache tables

**Recommendations**
- Every table: `tenant_id NOT NULL` + RLS `USING (tenant_id = current_tenant_id())`.
- If service role writes aggregated data, ensure reads are still tenant-filtered and no global cache is reused across tenants.
- Require policy unit tests for: same-user-different-tenant, same-tenant-different-user role cases.

### 3) Data exposure risks

**Findings**
- Raw URLs (`image_url`, `video_thumbnail_url`) stored as plaintext. If these are ephemeral signed links or include account-specific identifiers, exposure risk rises.
- UI promises “Grace-friendly abstraction,” but backend still stores raw ad metadata that may include internal campaign strategy naming.

**Recommendations**
- Store normalized asset references where possible (hash + media proxy), not long-lived raw URLs.
- Add field-level data classification (`public`, `internal`, `sensitive`) and scrub sensitive fields from non-admin views.

---

## Architecture Review (data model, indexes, scaling)

## Overall
Core direction is good (map → recommendation → factory → feedback). Biggest architecture issue is **identity model drift** (tenant vs user) and **missing confidence primitives**.

### Data model gaps

1. **Missing `meta_account_id` dimension**  
   Current uniqueness `UNIQUE(user_id, meta_ad_id)` is brittle if one tenant connects multiple ad accounts over time.
   - Add `meta_account_id` and unique key `(tenant_id, meta_account_id, meta_ad_id)`.

2. **No historical classification versioning**  
   Classifications can change with prompt/model updates.
   - Add: `classification_version`, `classifier_model`, `classified_at`, `classification_confidence`.

3. **Performance denormalization risk**  
   `ad_creatives` stores aggregate performance fields copied from `ad_performance`.
   - Define source of truth. Prefer derived/materialized view for aggregates to avoid stale writes.

4. **Missing linkage table for factory output to live Meta ads**  
   Matching by hash/text alone will be noisy.
   - Add explicit mapping table with confidence + manual override path.

### Index recommendations

Minimum indexes for 4e workloads:
- `ad_creatives(tenant_id, meta_account_id, meta_ad_id)` unique
- `ad_creatives(tenant_id, angle, persona)` for matrix queries
- `ad_creatives(tenant_id, framework)`
- `ad_creatives(tenant_id, last_updated_at desc)` for sync delta UI
- `ad_performance(tenant_id, meta_ad_id, date_start)` for joins
- If JSON storage added for structured classifier output: GIN index on JSONB classification field

### Scaling notes

- Current sample size is tiny, so compute cost is low now; design should still avoid recomputing full matrix on every dashboard hit.
- Add precomputed daily snapshot/materialized cache keyed by `(tenant_id, date)`.
- Batch generation should be queue-backed with per-tenant concurrency limits to avoid burst API spend.

---

## Red-Team: AI Classification on Thin Data (12–15 ads)

## Verdict: **Weak signal if untreated**

The matrix (angle × persona) has ~30 cells; 12–15 ads cannot reliably populate this space. Gap analysis will overreport “missing” simply due to sparse sampling, not true strategy gaps.

### Failure modes
- **False gaps:** “Untested” cells may be irrelevant to niche/product.
- **Overfit winners:** One lucky ad can dominate recommendation rankings.
- **Persona hallucination:** Classifier invents fine-grained personas unsupported by copy.
- **Competitor leakage bias:** Competitor-heavy priors can drown first-party truth.

### Required guardrails
1. Confidence score per cell and per recommendation.
2. Minimum evidence thresholds before “high priority.”
3. Bayesian smoothing / shrinkage for ROAS-based ranking at low n.
4. Explicit “exploration mode” label when recommendations are hypothesis-level.
5. Human correction loop must update classifier memory, not just one-off override.

---

## Red-Team: Creative Factory Quality (useful ads vs garbage)

## Risk: **High if no quality gates beyond style**

Current flow can generate plausible-looking but strategically weak creatives.

### Likely garbage patterns
- Surface-level framework labels (claims PAS/AIDA without structural integrity).
- Repetitive hooks across variants (illusion of diversity).
- Brand voice drift under batch mode pressure.
- Policy/compliance copy risk (overpromises, implied income claims, urgency abuse).

### Missing guardrails
1. **Pre-generation constraints**
   - prohibited claims list
   - required disclaimers by offer type
   - persona-specific “do not say” rules
2. **Variant diversity constraints**
   - enforce lexical/semantic distance thresholds across variants
3. **Ad policy compliance checker**
   - platform-policy lint before download/export
4. **Quality scorecard per creative**
   - strategy fit, brand fit, compliance risk, novelty, clarity
5. **Kill-switch controls**
   - block “Generate All” if confidence low + policy risk high

---

## SaaS Readiness Review

### Multi-tenant isolation
- Must be tenant-first across schema, queues, caches, object storage paths, and analytics materializations.
- Never cache map/recommendation artifacts globally without tenant key.

### Onboarding flow
Target “<5 min to first recommendation” is good, but requires:
- explicit account connection state machine
- sync progress + retry UX
- classification confidence message in first-run results (avoid false certainty)

### Pricing implications
- Batch generation can create unbounded image/copy API costs.
- Need hard quotas + metering before launch:
  - per-plan generation caps
  - per-tenant monthly budget guardrails
  - overage policy + throttling

### Operational readiness
- Add audit logs for recommendation generation source inputs (which data snapshot influenced this recommendation).
- Add rollback path when model update degrades recommendation quality.

---

## Additional Risks You Didn’t Explicitly Call Out

1. **Prompt/response injection through ad text ingestion**  
   Ads may contain malicious text patterns. Treat all ingested text as untrusted input before feeding LLM prompts.

2. **Model drift across releases**  
   If Gemini model behavior changes, classifications/recommendations can shift silently. Need version pinning + regression set.

3. **Attribution ambiguity in feedback loop**  
   ROAS shifts can be caused by audience, budget, seasonality—not just creative. Recommendation engine needs confounder-aware notes.

4. **Cold-start for SaaS users without competitor data**  
   Spec says competitor data optional; recommendation quality may collapse without fallback heuristics.

---

## Must-Add Acceptance Criteria (before implementation)

- [ ] All new 4e tables use `tenant_id` + explicit RLS policies + policy tests
- [ ] Token handling section added with encryption, redaction, refresh/revoke, and authz boundaries
- [ ] Recommendation confidence framework implemented (thresholds + labels)
- [ ] `meta_account_id` added to schema and uniqueness constraints
- [ ] Quality/compliance gates for creative generation defined and testable
- [ ] Cost controls: quotas, queue limits, and per-tenant usage metering
- [ ] Regression harness for classifier/recommendation stability across model changes

---

## What’s Strong (keep these)

- The strategic decomposition (Intelligence Brain + Factory) is right.
- UI abstraction away from media-buyer jargon is product-smart.
- Weekly planner aligns with practical testing cadence.
- Closing the performance loop is the real moat if confidence controls are added.

---

## Final Call

**Do not implement Phase 4e yet.**  
Ship a short **4e-security-and-reliability addendum** first (schema normalization, RLS policies, token hardening, confidence model, creative guardrails). After that, this can move to conditional PASS and build can proceed safely.
