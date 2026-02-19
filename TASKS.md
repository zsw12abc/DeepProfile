# DeepProfile Task Checklist

## Goal
Improve reliability, consistency, and maintainability with incremental, verifiable changes.

## Status Legend
- [ ] Todo
- [-] In Progress
- [x] Done

## Tasks
1. [x] P0 - Add and maintain a prioritized task board in repo
- Acceptance:
  - `TASKS.md` exists and is updated after each execution step.

2. [x] P1 - Align documented version with actual package version
- Files:
  - `README.md`
- Acceptance:
  - Version references match `package.json` (`0.9.0`).

3. [x] P1 - Fix options platform type mismatch
- Files:
  - `src/options.tsx`
- Acceptance:
  - `PlatformId` includes all rendered platform tabs (`twitter`, `quora`).
  - No unsafe type cast needed for `setActivePlatform`.

4. [x] P1 - Fix history cleanup persistence bug
- Files:
  - `src/services/HistoryService.ts`
- Acceptance:
  - Expired category cleanup writes back when profile entries are removed, even if user count does not change.

5. [x] P1 - Validation run
- Acceptance:
  - `npm test` passes.
  - `npm run build` passes.

6. [x] P2 - CI hardening proposal (no breaking changes in this pass)
- Deliverable:
  - Add a short proposal in this file for future `typecheck` integration and phased TS debt cleanup.

7. [x] P1 - Implement CI hardening Phase A (informational typecheck)
- Files:
  - `package.json`
  - `.github/workflows/ci.yml`
- Acceptance:
  - `npm run typecheck` script exists.
  - CI runs typecheck with `continue-on-error: true` (non-blocking).

8. [x] P1 - Implement CI hardening Phase B (scoped enforced typecheck)
- Files:
  - `tsconfig.typecheck-core.json`
  - `package.json`
  - `.github/workflows/ci.yml`
  - `src/services/*.ts` (targeted type fixes)
- Acceptance:
  - `npm run typecheck:core` passes locally.
  - CI enforces `typecheck:core` for `src/services/**` + `src/background/**`.

9. [x] P1 - Implement CI hardening Phase C (full enforced typecheck)
- Files:
  - `.github/workflows/ci.yml`
  - `src/**/*` (type debt cleanup)
- Acceptance:
  - `npm run typecheck` passes locally.
  - CI enforces full `npm run typecheck` (no `continue-on-error`).

10. [x] P0 - Chrome Web Store readiness checklist and execution
- Files:
  - `TASKS.md`
- Acceptance:
  - Add a focused, verifiable release checklist for CWS submission.
  - Track completion status item-by-item in this file.

11. [x] P0 - Minimize permissions for CWS review
- Files:
  - `plasmo.config.ts`
  - `package.json`
- Acceptance:
  - Remove `cookies` permission if not used by runtime code.
  - Build output permissions include only necessary entries.

12. [x] P0 - Align privacy policy with implemented behavior
- Files:
  - `PRIVACY_POLICY.md`
- Acceptance:
  - Policy reflects current supported platforms and optional telemetry behavior.
  - Replace placeholder repository contact link with real project URL.

13. [x] P0 - Align store description with actual product scope
- Files:
  - `STORE_DESCRIPTION.md`
- Acceptance:
  - Platform support list matches manifest/runtime behavior.
  - Privacy wording does not conflict with optional observability settings.

14. [x] P0 - Rebuild and verify release artifact consistency
- Acceptance:
  - `npm run build` passes.
  - `build/chrome-mv3-prod/manifest.json` version equals `1.0.0`.
  - Build manifest permissions match source configuration.

## Execution Order
- Start with #2, #3, #4, then #5.
- Keep #6 as a proposal-only item in this pass.

## CI Hardening Proposal (Phased, Non-Breaking)
1. Phase A (informational): add `npm run typecheck` in CI with `continue-on-error: true`.
2. Phase B (scoped gating): enforce typecheck only on `src/services/**` and `src/background/**`.
3. Phase C (full gating): enforce repository-wide typecheck after TS debt burndown reaches agreed threshold.
4. Tracking: maintain a dedicated TS debt issue list (owner, file, ETA) and reduce by module.

## Progress Log
- 2026-02-19: Checklist created.
- 2026-02-19: Completed tasks #2, #3, #4 with code changes.
- 2026-02-19: Completed validation (#5): `npm test` passed, `npm run build` passed.
- 2026-02-19: Added phased CI hardening proposal (#6).
- 2026-02-19: Implemented Phase A (#7): added `typecheck` script and non-blocking CI step.
- 2026-02-19: Local validation for #7:
  - `npm run typecheck` reports existing TS debt (expected in informational phase).
  - `npm run build` passed.
- 2026-02-19: Implemented Phase B (#8):
  - Added scoped config `tsconfig.typecheck-core.json`.
  - Fixed scoped TS errors in services/background boundary.
  - Added enforced CI step `npm run typecheck:core`.
- 2026-02-19: Local validation for #8:
  - `npm run typecheck:core` passed.
  - `npm test` passed.
  - `npm run build` passed.
- 2026-02-19: Implemented Phase C (#9):
  - Cleared remaining full typecheck errors across source and tests.
  - Switched CI full typecheck to enforced mode.
- 2026-02-19: Local validation for #9:
  - `npm run typecheck` passed.
  - `npm test` passed.
  - `npm run build` passed.
- 2026-02-19: Started CWS release-readiness pass (#10-#14), including policy/doc/manifest consistency checks.
- 2026-02-19: Completed #10 by adding explicit CWS release checklist and acceptance criteria.
- 2026-02-19: Completed #11 by removing unused `cookies` permission from `plasmo.config.ts` and `package.json`.
- 2026-02-19: Completed #12 by updating privacy policy effective date, supported platforms, optional telemetry disclosure, and repository contact URL.
- 2026-02-19: Completed #13 by aligning store description platform list and privacy wording with current implementation.
- 2026-02-19: Completed #14 validation:
  - `npm run build` passed.
  - `build/chrome-mv3-prod/manifest.json` now reports `version: 1.0.0`.
  - build permissions now include only `storage`.
