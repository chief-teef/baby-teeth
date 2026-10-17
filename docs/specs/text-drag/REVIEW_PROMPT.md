Review and revise the specification at `docs/specs/text-drag/SPEC.md` in the repository `C:\Users\chase\OneDrive\Documents\ChatGPT\anna-blog`.

Read in this order:
1. Root `AGENTS.md` and `src/AGENTS.md`.
2. `docs/desktop-scrapbook-spec.md` and `docs/agent-maintenance.md`.
3. `docs/specs/text-drag/SPEC.md`.
4. `src/page-composition.js`, its callers in `src/main.js`, and the relevant cases in `tests/desktop-pages.mjs`.

Treat the desktop scrapbook spec as the confirmed product contract. The owner reports that dragging a text box in the editor teleports instead of staying under the mouse. Inspect the actual coordinate/event path and challenge whether the spec's proposed regression catches the real cause. Check pointer-down continuity, initial grab offset, transformed/scaled coordinates, scrolling, pointer cancellation, page transfer, groups, and adjacent text editing/selection behavior. Recheck current files and working-tree changes before editing; do not overwrite unrelated work.

Revise `SPEC.md` directly if you find a material omission, contradiction, or infeasible check. Keep this narrowly scoped; do not invent new product behavior. Preserve the single-owner implementation plan and call out if independent implementation lanes would introduce shared-file conflicts. Do not implement runtime code, run tests, deploy, or publish content during review.

Then provide a complete fresh-chat implementation prompt as `docs/specs/text-drag/IMPLEMENT_PROMPT.md`, not just findings or an offer to write one later. It must identify the project root and reading order, concrete behavior, exact implementation/test ownership, integration sequence, commands and how to launch the browser suite from its existing setup, preservation of unrelated changes and authored content, deployment/data permissions, unresolved assumptions, and completion evidence. Ask the implementation chat to perform the complete authorized local repair autonomously and report actual checks and limitations. Do not claim that models or chat context were switched.

Finish with a short summary of material spec changes and any blockers. If no material revision is needed, say so and still provide the implementation prompt.
