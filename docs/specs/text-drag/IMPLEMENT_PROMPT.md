# Fresh-chat implementation prompt: text drag attachment

Work in the repository at `C:\Users\chase\OneDrive\Documents\ChatGPT\anna-blog`.

Complete the authorized local repair described below autonomously. Do not claim that models, agents, or chat context were switched. The confirmed product contract is `docs/desktop-scrapbook-spec.md`; preserve it and keep the repair narrowly scoped.

## Read in this order

1. `AGENTS.md` and `src/AGENTS.md`.
2. `docs/desktop-scrapbook-spec.md` and `docs/agent-maintenance.md`.
3. `docs/specs/text-drag/SPEC.md`.
4. `src/page-composition.js`, its callers in `src/main.js`, and relevant cases in `tests/desktop-pages.mjs`.
5. `package.json`, plus only the relevant local test setup in `SETUP.md` / `vite.config.js` if needed to run the browser suite.

Before editing, inspect `git status --short --untracked-files=all` and reread the target files. Preserve all unrelated changes, authored posts, and existing files in `docs/specs/text-drag/`. In particular, do not overwrite review/handoff drafts you did not create.

## Confirmed behavior and diagnosis

- Text interiors remain available for editing and selection. Move a text box using its external border/drag affordance; do not add a mode or change the interaction design.
- The original point grabbed on the box stays under the pointer through Interact's drag threshold, pointer movement, page-stack scale, and scrolling. The box must not jump on pointer-down or when dragging begins.
- Shared page composition owns movement for text, photos, retained ink, and groups. Preserve canonical page coordinates, stable IDs, selection, z-order, edge scrolling, page transfer, undo, and cancellation/recovery semantics.
- The reviewed source has a specific coordinate-space mismatch in `start()`: Interact's `x0/y0` are page coordinates, but the code subtracts `root.getBoundingClientRect()` client coordinates. A scrolled document therefore adds a false delta. Interact exposes the pointer-down position as `clientX0/clientY0`; use client-space coordinates consistently, with a safe fallback to the current client position if required by the event contract. Confirm the exact event semantics from the installed dependency/types before editing.
- Existing page tests scroll only the inner workspace, mostly grab the center, and often assert after movement. That does not reproduce the document-scroll mismatch or reliably detect a delayed-start offset error. The new browser regression must fail on the old behavior.

## Exact ownership and implementation

Keep one implementation owner for the shared pointer path and its browser fixture; independent writers would conflict in the same function and test file.

- Runtime owner: `src/page-composition.js` only. Make the smallest shared correction; do not add a text-only workaround, dependency, mode, snapping rule, or document/storage change.
- Regression owner: `tests/desktop-pages.mjs` only. Extend its existing fixture and assertions to exercise a real text drag affordance with an off-center grab, non-unit stage scale, and document/window scroll. Assert the box has not shifted before pointer movement and that the same point remains under the pointer during movement within a small screen-pixel tolerance. Retain internal workspace/edge-scroll coverage where it exercises a distinct path.
- Exercise the shared pointer path for grouped movement and page transfer as practical: preserve relative offsets, page-local selection, one-step commit, and cancellation without candidate/page or authored-coordinate residue. Keep photo/ink handling working through the shared correction.
- Verify that clicking/selecting/editing inside `.ProseMirror` still edits text, while dragging the external border moves the text object. Use the integrated editor fixture if practical; if the page fixture models only the shared gesture contract, state that limitation.
- Verify `pointercancel` (and existing Escape/lost-capture/hide/dispose paths as appropriate) restores the original snapshot and adds no undo entry. Do not weaken current cancellation or pointer handling to make tests pass.
- Follow `docs/agent-maintenance.md`. If this local repair is recorded in `docs/desktop-scrapbook-verification.md`, add only evidence actually observed; do not imply commit or deployment. Do not edit guidance files unless the fix changes a durable contract.

## Integration sequence

1. Recheck the working tree, confirm no conflicting edits to the owned files, and trace all `createPageComposition` / `bindObject` callers before changing the shared function.
2. Add the focused browser regression and confirm it detects the old mismatch (or otherwise demonstrate why it fails on the old implementation).
3. Apply the shared source fix and run the focused browser suite.
4. Run the required project unit suite and editor build; inspect the final diff and documentation maintenance needs.
5. Report each command and its actual outcome, including browser executable/server setup and any checks that could not run.

## Commands and existing browser setup

Use Node >=22.12 as declared in `package.json`. The focused suite defaults to `http://127.0.0.1:5175/` and launches installed Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; set `NOTEBOOK_BROWSER` to another compatible Chromium executable if needed.

In one PowerShell terminal, start the local Vite server:

```powershell
npm run dev -- --host 127.0.0.1 --port 5175
```

In a second terminal from the project root, run:

```powershell
node tests/desktop-pages.mjs http://127.0.0.1:5175/
npm test
npm run build
```

Do not run the full acceptance/deployment workflows just for this repair. If browser startup fails, report the actual limitation and make a reasonable attempt with an installed compatible browser rather than claiming the suite passed.

## Boundaries, assumptions, and completion evidence

- This authorization is for a local code/test/documentation repair. Do not deploy, publish, save, alter, or delete any repository post, draft, trash item, media, announcement state, or owner-authored content. Do not contact anyone, commit, or push.
- No reproduction browser/OS/hardware details were supplied. Treat the supported external-border move gesture as the report's intended action, consistent with the product contract. Do not claim physical touch/pen verification from desktop browser automation.
- The test fixture may not exercise every real browser's transformed pointer or touch behavior. Describe its exact coverage and any remaining hardware limitation.
- Completion requires a regression that demonstrates the prior coordinate mismatch and passes after the shared fix; the three commands above with actual outcomes; preserved text editing/selection, groups, transfer, cancellation and photo/ink behavior to the extent covered by the changed paths; a clean review of the owned-file diff that preserves unrelated work; and a concise final report of changes, evidence, and remaining limitations.
