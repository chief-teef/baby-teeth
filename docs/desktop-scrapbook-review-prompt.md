# Prompt for the revising agent

You are revising a proposed desktop scrapbook overhaul for the existing bbyteeth repository. Your task is to improve the specification and parallel implementation plan, not implement features or deploy anything.

Read `AGENTS.md`, relevant scoped guidance, `docs/agent-maintenance.md`, `CONTEXT.md`, and `docs/desktop-scrapbook-spec.md`. Inspect the actual code behind its claims; use the earlier design/editor specs for historical context. Preserve unrelated working-tree changes. The glossary update and new draft are intentional work from the preceding interview.

Owner requirements in section 2 are settled. Preserve multi-page entries, whole-object drag/drop with empty-page removal, title/date only on page 1 with truthful editor furniture, order-derived entry colors, entry/page controls and stable entry links, desktop-first mode-free Docs-like rich-text editing with mixed styling and fixed-box shrinking, free overlap and visible stacking tools, loud Y2K homepage aesthetics, editor-only Otis, repeated animated pixel-tooth stamping, and transparent PNG support for ordinary images end-to-end. Do not quietly simplify away those requirements. User instructions take precedence over older contradictory docs.

Challenge the proposed engineering defaults aggressively. In particular:

- Trace all document, media, font, layout, save/recovery/import/export, Worker, build, book, accessibility, and notification consumers. Find missing callers and assumptions.
- Compare v3 nested pages with the smallest safe alternative. Specify migration, stable IDs, validation/cleaning, mixed-version release sequencing and rollback limits without overwriting recovery or repository content.
- Resolve empty-first-page removal vs header geometry, continuation content origins, drop/rotation/group behavior, one-page navigation in a two-page spread, music placement, draft color parity, and resource limits behind “unlimited pages.”
- Make mixed font/size/spacing representation and fit semantics precise. Validate clipboard normalization and selection preservation. Avoid a font catalog that makes startup or canonical measurement impractical.
- Audit transparent PNG handling from both existing JPEG conversions through upload MIME/bytes/receipts, repo paths, full build decoding, metadata and downloads. Do not accept superficial signature checks or claim undeployed runtime capabilities.
- Improve the loud visual direction into concrete acceptance criteria while keeping canonical paper styling isolated and text controls usable.
- Test the proposed parallel schedule against actual file ownership. At most four agents total: one coordinator and three workers. Freeze shared contracts first; avoid simultaneous writes to `src/main.js`, shared validators/CSS, package files, and test entrypoints. Prefer fewer handoffs and small focused extractions over speculative infrastructure.

Use read-only subagents for independent contract/security, editor/text, and reader/parallelization audits if useful; the user explicitly wants an advisable parallel plan. You own the synthesis and final edits. Verify external technical claims with primary documentation only when needed. No need to browse to restate product decisions.

Revise `docs/desktop-scrapbook-spec.md` in place into a coherent implementation-ready spec. Mark owner requirements separately from chosen engineering defaults, include concrete contract examples, assign one owner per shared file per phase, and give dependency gates, acceptance tests, and a safe rollout/activation sequence. Update the short pointers in `BLOG-SPEC.md` and `BBYTEETH-DESIGN-SPEC.md` only if needed. Keep runtime AGENTS instructions truthful about what is implemented versus planned.

Do not write application code, install packages, reset content, publish fixtures, commit/push, deploy, enable announcements, or contact anyone. Ask a focused owner question only if a material product contradiction cannot be resolved without changing the agreed behavior; continue independent revision work meanwhile.

Finish with the revised spec link, the most important corrections and tradeoffs, any remaining owner decisions, and the first concrete parallel assignments. Distinguish code inspection from tests or live verification. Do not call the spec implementation-ready while leaving foundational contracts unresolved.
