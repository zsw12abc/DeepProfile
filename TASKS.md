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
