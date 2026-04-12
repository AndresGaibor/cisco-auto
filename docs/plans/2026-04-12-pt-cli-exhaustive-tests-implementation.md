# PT CLI Exhaustive Test Catalog Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Consolidar y mantener un catálogo maestro de pruebas manuales exhaustivas para `bun run pt`, cubriendo escenarios básicos, avanzados, errores, timeouts, comandos no implementados y troubleshooting de Packet Tracer.

**Architecture:** Un único documento maestro como fuente de verdad, alimentado por lotes de escenarios enviados por el usuario. Cada lote se normaliza a la misma taxonomía de IDs, estados y tiempos, y se agrega como sección nueva o append al bloque existente. Los errores conocidos y limitaciones del runtime/PT se registran en línea, no en un documento paralelo.

**Tech Stack:** Markdown, git, docs/superpowers/specs, docs/plans, existing QA docs.

---

## Context

### Reference
- Spec: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`
- QA baseline: `docs/QA_TEST_CASES.md`
- Related docs: `docs/TESTS.md`, `docs/PT_CONTROL_IMPLEMENTATION.md`, `docs/PT_CONTROL_QUICKSTART.md`

### Working approach
- No code changes.
- The deliverable is documentation only.
- Keep the master spec as the source of truth.
- Append future scenario batches in order, preserving IDs and traceability.
- Capture failures explicitly instead of hiding gaps.

---

## Phase 1: Normalize the master test catalog

### Task 1: Lock the scenario taxonomy
**TDD scenario:** Trivial documentation change — use judgment

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`

**Steps:**
1. Confirm the canonical categories already present in the spec:
   - `pass`
   - `warning`
   - `blocked`
   - `not-implemented`
   - `fail`
2. Keep the time buckets stable:
   - rápido
   - normal
   - lento tolerable
   - timeout / warning
3. Preserve the current ID ranges and only extend forward.
4. Keep each scenario one hypothesis per row.

**Done when:** the taxonomy is stable enough for future scenario batches and future sections do not redefine the same categories.

---

### Task 2: Preserve the master document structure
**TDD scenario:** Trivial documentation change — use judgment

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`

**Steps:**
1. Keep the existing sections 1–15 intact.
2. Add future scenario batches only as new sections or clearly delimited appendices.
3. Keep the “known issues” and “limits” sections in the same file.
4. Avoid duplicating the same scenario in multiple sections unless it is explicitly a variant or regression check.

**Done when:** the spec remains readable as one master catalog rather than a pile of disconnected notes.

---

## Phase 2: Append the next scenario batches

### Task 3: Add the next Packet Tracer practice batch
**TDD scenario:** Trivial documentation change — use judgment

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`

**Steps:**
1. Append the next user-provided scenario batch after the existing Part 2 section.
2. Keep the same per-scenario fields:
   - ID
   - objective
   - topology / setup
   - validation
   - failure variant
   - expected result
3. Preserve the ordering by domain: fundamentals, switching, routing, services, security, wireless, IoT, automation, troubleshooting.
4. Keep each scenario write-up concise but complete.

**Done when:** the next batch is reflected in the master catalog with no formatting drift.

---

### Task 4: Add end-to-end and troubleshooting variants
**TDD scenario:** Trivial documentation change — use judgment

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`

**Steps:**
1. For each new lab family, document the "happy path" and the intentionally broken variant.
2. Record the main failure class:
   - wrong VLAN
   - wrong gateway
   - wrong mask
   - wrong ACL
   - missing NAT inside/outside
   - missing relay
   - bad HSRP state
   - wireless auth failure
   - IoT registration failure
3. Make the troubleshooting intent explicit so the catalog can be used both for practice and for diagnosis.

**Done when:** every major family has at least one positive case and one negative/troubleshooting case.

---

### Task 5: Add coverage for the advanced PT practice map
**TDD scenario:** Trivial documentation change — use judgment

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`

**Steps:**
1. Ensure the catalog explicitly includes the advanced practice families:
   - EtherChannel
   - DHCP by VLAN and relay
   - inter-VLAN routing / L3 switching
   - HSRP
   - ACL and NAT/PAT
   - WLAN
   - NTP / Syslog / SNMP
   - SSH / hardening
   - DHCPv6
   - automation basics
   - IoT
2. Keep the wording aligned with Packet Tracer practice, not with production hardware claims.
3. Mark anything that is academically useful but not 1:1 with hardware as a PT practice scenario, not a production guarantee.

**Done when:** the catalog reflects the full PT practice map and not just the basic CLI surface.

---

## Phase 3: Review and quality control

### Task 6: Run a spec self-review pass
**TDD scenario:** Modifying tested documentation — review existing file first

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`

**Steps:**
1. Search for placeholders, vague wording, and duplicate sections.
2. Check that all scenario categories still map to one of the approved result states.
3. Verify that the time buckets are used consistently.
4. Make sure no advanced scenario contradicts the earlier scope or the known issues list.
5. Remove any duplicated or contradictory lines.

**Verification:**
- `rg -n "TBD|TODO|FIXME|<.*>|\[\]" docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`
- `rg -n "not-implemented|blocked|warning|pass|fail" docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`

**Done when:** the spec reads like one coherent catalog, not a draft with stray notes.

---

### Task 7: Commit the documentation update
**TDD scenario:** Trivial documentation change — use judgment

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`
- Optional follow-up: `docs/plans/2026-04-12-pt-cli-exhaustive-tests-implementation.md`

**Steps:**
1. Review `git status` to confirm only documentation changed.
2. Commit the updated spec when the next batch is ready.
3. Keep commit messages small and conventional.

**Command:**
```bash
git add docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md docs/plans/2026-04-12-pt-cli-exhaustive-tests-implementation.md
git commit -m "docs: extend pt cli exhaustive test catalog"
```

**Done when:** the catalog is saved in git and ready for the next batch.

---

## Execution notes

- Keep the spec as the single source of truth.
- Do not introduce implementation code in this phase.
- If the catalog grows too large, split only by clearly labeled sections, not by rewriting the whole document.
- The next user batches should be appended in order without renumbering prior cases.
