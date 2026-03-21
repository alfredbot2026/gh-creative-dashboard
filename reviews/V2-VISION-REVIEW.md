# Red Team Review — CONTENT-ENGINE-V2-VISION

- **Reviewer:** Tony (Security/Red Team)
- **Date:** 2026-03-21
- **Document Reviewed:** `active/gh-creative-dashboard/specs/CONTENT-ENGINE-V2-VISION.md`
- **Related references read:** `LESSONS-LEARNED.md`, `BEST-PRACTICES.md`

## Verdict

**CONDITIONAL PASS (with blockers)**

The vision is strategically strong and sequencing is mostly correct, but there are critical pre-implementation guardrails missing. Proceed only after blocker mitigations are codified in Phase 3.5 scope/spec.

---

## Blockers (Must Resolve Before Implementation Lock)

## 1) YouTube quota exhaustion risk (P1)

### Risk
The plan combines historical ingest + ongoing polling + top-creator discovery/tracking. If discovery relies heavily on `search.list`, quota burn can be severe under default daily quota budgets.

### Why this matters
- YouTube Data API default quota is finite; high-cost methods can starve core ingest.
- Discovery and tracking jobs can interfere with Grace’s own data pipeline unless quota is isolated by job class.

### Mitigations (required)
1. **Quota budget architecture by job class**
   - Separate budgets for:
     - Core tenant ingest (highest priority)
     - Competitive discovery (lowest priority)
     - Competitive tracking (medium priority)
2. **Cost-aware endpoint strategy**
   - Minimize high-cost discovery calls; prefer low-cost incremental tracking once creator set exists.
3. **Circuit breakers + graceful degradation**
   - On budget pressure: pause discovery first, then reduce competitive refresh frequency, never block tenant ingest.
4. **Quota telemetry**
   - Daily dashboard/alerts for consumed units, projected depletion, and per-job spend.
5. **Backfill pacing**
   - Staged historical pulls with resumable checkpoints, not single-burst full history drains.

---

## 2) Competitive intelligence TOS/privacy guardrails missing (P1)

### Risk
Using public creator data is generally viable, but the current vision does not define platform-policy-safe handling boundaries (retention, display, aggregation, redistribution limits).

### Why this matters
- Compliance risk increases when storing and surfacing large volumes of third-party data.
- Derived insights are safer than raw mirrored datasets.

### Mitigations (required)
1. **Data minimization policy**
   - Store only fields necessary for trend extraction and benchmark calculations.
2. **Derived-signal-first product behavior**
   - Surface aggregated trend signals (e.g., hook/format/topic shifts), avoid “raw competitor intelligence dashboard” semantics.
3. **Retention + purge policy**
   - Define retention windows for third-party payloads and enforce automated deletion.
4. **Compliance checklist gate**
   - Add a pre-launch gate for API terms, attribution/display requirements, and allowed caching/storage patterns.
5. **Legal/product sign-off**
   - Competitive intelligence should remain behind a feature flag until compliance checklist is signed.

---

## 3) Classification quality framework absent (P0)

### Risk
The performance profile depends on AI classification labels. If labeling is noisy, profile recommendations become misleading and can degrade output quality over time.

### Why this matters
- “Learning pipeline” credibility is only as strong as label quality.
- Incorrect classifications poison downstream weighting and topic intelligence.

### Mitigations (required)
1. **Gold set + annotation protocol**
   - Build a stratified manually labeled set across platform, format, language mix, and era.
2. **Field-level quality thresholds**
   - Define minimum precision/recall/F1 per critical field before enabling influence on profile.
3. **Confidence gating**
   - Low-confidence labels excluded from core weighting or assigned lower influence.
4. **Human correction loop**
   - Add correction UX and use corrections as supervised feedback for periodic model tuning.
5. **Drift monitoring**
   - Weekly drift detection on label distribution and confidence decay; trigger recalibration on thresholds.
6. **Versioned lineage**
   - Record classifier version + prompt schema + timestamp per analyzed item.

---

## 4) Token + data security architecture underspecified (P0)

### Risk
The system will store third-party OAuth tokens and ingest sensitive performance data. Current vision lacks concrete controls for secret lifecycle, tenancy boundaries, and revocation/deletion behavior.

### Why this matters
- Token compromise exposes connected social accounts.
- Weak tenancy boundaries risk cross-tenant leaks in performance data.

### Mitigations (required)
1. **Secret management standard**
   - Encrypt tokens at rest with managed keys; no plaintext tokens in DB logs/jobs/errors.
2. **Scope minimization**
   - Request least-privilege OAuth scopes only; separate monetary scopes where optional.
3. **Lifecycle controls**
   - Rotation, refresh failure handling, revocation path, and user-initiated disconnect purge.
4. **Tenant isolation hardening**
   - `tenant_id` mandatory in all new tables + strict RLS policies + server-side tenant checks.
5. **Auditability**
   - Audit log every token create/refresh/revoke and external sync action metadata.
6. **Webhook/poll integrity controls**
   - Signature verification (where supported), replay protection, idempotency keys.

---

## Additional Findings (Non-blocking but Important)

## A) Data architecture fragility risk (P1)

### Findings
- New tables are identified but idempotency, dedupe keys, and late-arriving metric strategy are not explicitly defined.
- No explicit immutable raw layer vs normalized feature layer separation in the vision.

### Recommendations
- Use a **3-layer data model**: raw_ingest (immutable) → normalized facts → derived profile features.
- Enforce deterministic external IDs + upsert semantics.
- Support metric revisions (24h/48h/7d/30d) without overwriting provenance.

## B) Multi-factor correlation overfitting risk (P1)

### Findings
The doc correctly proposes single-factor first then combinations. Risk remains that early multi-factor outputs overfit sparse data.

### Recommendations
- Require minimum sample sizes and confidence intervals before surfacing combination insights.
- Apply shrinkage/regularization for sparse cells.
- Display confidence tier to users (“high/medium/experimental”).

## C) Weighting model is directionally correct but should be robustified (P2)

### Findings
Proposed recency weighting (12m 3x, 1–3y 1x, 3+y trend-only) is sensible.

### Recommendations
- Keep bins for explainability, but layer in:
  - continuous time decay,
  - sample-size normalization,
  - platform-specific decay profiles.

## D) YouTube retention assumptions must be validated in staging (P1)

### Findings
Retention access can vary by account/report context and requested granularity.

### Recommendations
- Add an early “API capability probe” task:
  - OAuth with intended scopes,
  - run target report queries,
  - confirm available retention metrics/dimensions,
  - lock schema only after proof.

## E) Phasing dependency refinement (P1)

### Findings
Current order (3.5 → 4a → 4b → 4c) is mostly right.

### Recommendations
Split Phase 3.5:
- **3.5a:** Integrations, ingestion, observability, lineage, security baseline
- **3.5b:** Classification + correlation + profile generation (behind quality gates)
Then gate 4a consumption on 3.5b quality certification; keep 4c feature-flagged until compliance sign-off.

---

## Required Guardrails to Add to Phase 3.5 Spec

1. **Quota Governance Section**
   - Per-integration budgets, endpoint cost strategy, backoff, and circuit breakers.
2. **Classification QA Section**
   - Gold set design, acceptance thresholds, confidence gating, drift monitoring.
3. **Compliance/TOS Section**
   - Competitive data minimization, retention policy, display constraints, review gate.
4. **Security Architecture Section**
   - Token encryption, scope minimization, lifecycle controls, tenant RLS patterns, audit logs.
5. **Data Lineage + Reproducibility Section**
   - Immutable raw ingest, versioned analysis artifacts, deterministic recompute path.

---

## Suggested Exit Criteria (Before Build Starts)

- [ ] Quota budget simulator run with worst-case assumptions for 500+ backfill + ongoing sync
- [ ] API capability probe completed (Meta + YouTube metrics, retention viability)
- [ ] Classification benchmark hits thresholds on gold set
- [ ] Security design reviewed (tokens, RLS, revocation/purge)
- [ ] Compliance checklist approved for competitive intelligence handling

---

## Final Red-Team Position

This can become a strong moat if implemented with disciplined controls. Without the above guardrails, the highest risk is not just technical failure — it is silent model degradation (bad classifications), quota starvation, and avoidable compliance/security exposure.

**Recommendation:** proceed, but only after blockers are codified as non-optional acceptance criteria in Phase 3.5.
