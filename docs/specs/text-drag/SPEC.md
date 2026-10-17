# Text box drag attachment repair

Status: reviewed; implementation not started.

## Outcome

Dragging a text box in the studio should feel continuous: the box remains under the pointer at the same relative grab point from pointer-down through release, including when the page stack is scaled or the workspace scrolls.

## Evidence and existing contract

- Owner report: dragging a text box “doesn't work right” and it “teleports around” instead of staying attached to the mouse.
- `docs/desktop-scrapbook-spec.md` already requires a continuously attached drag proxy with its original grab offset, coordinate conversion for zoom/scroll, edge scrolling, and whole-object placement on release.
- `src/page-composition.js` owns shared page-object drag start, preview, scrolling, and release for text, photos, ink, and groups. `src/main.js` binds text object movement through `composition.bindObject`.
- `start()` currently mixes Interact's `x0/y0` page coordinates with `root.getBoundingClientRect()` client coordinates. `updatePreview()` compares client coordinates to that same client rect, so a nonzero document scroll introduces a constant erroneous drag delta. Interact exposes `clientX0/clientY0` for the pointer-down position; the start offset must use those client coordinates (with a client-coordinate fallback), not `x0/y0`.
- The current `tests/desktop-pages.mjs` drag assertions use a centered grab and scroll only the inner `#work` workspace. They do not create document/window scroll, assert the untouched pointer-down frame, or test a real text-box border drag, so they can miss the coordinate-space bug and delayed drag-start offset errors.

## Scope

- Find and fix the shared coordinate/gesture cause of the reported text-box jump.
- Keep the existing interaction contract: text interiors remain for editing/selection; the external text-box border or drag affordance moves the box. Preserve pointer-to-box offset, scaling, scrolling, selection/groups, page transfer, cancellation, undo, and authored coordinates.
- Add or extend focused browser coverage in `tests/desktop-pages.mjs` that fails before the repair. Exercise an off-center text-box border grab after scrolling the document/window, assert the rendered box has not shifted before pointer movement, then assert the same grabbed point tracks the pointer through movement. The case must reach the text drag interaction (a boundary/drag affordance rather than `.ProseMirror` content), use a non-unit stage scale, and include internal workspace/edge scrolling if needed to cover both scroll paths. Compare client-space positions with a small screen-pixel tolerance; do not infer continuity from only the final saved coordinates.
- Preserve Interact's original pointer-down client position through its drag threshold. Keep pointercancel/lost capture/Escape/hide/dispose cancellation restoring the complete snapshot with no undo; cover pointer cancellation directly if the focused suite can dispatch it reliably.
- Exercise a grouped drag and page transfer through the shared gesture path (or retain existing targeted checks and add only the missing coverage): the union must keep its relative offsets, page-local selection must remain coherent, transfer must commit once, and cancellation must not leave a candidate page or changed authored coordinates.
- Keep adjacent text behavior intact: clicks/drags inside `.ProseMirror` continue editing/selecting text, while the external border/drag affordance moves the box. Include a concise browser assertion for both if the harness can exercise the editor; otherwise document exactly which path the test fixture represents.
- Change shared behavior once so photos, retained ink, and grouped objects do not regress. Keep stable IDs, canonical page coordinates, and existing persistence semantics.

## Out of scope

No new drag modes, movement affordances, snapping behavior, page rules, storage format changes, dependencies, or visual redesign.

## Acceptance and evidence

1. On pointer-down and during Interact's drag threshold, the text box does not move before pointer movement; when movement begins, the original pointer-down offset is preserved.
2. During a drag, the same point on the box remains under the pointer within normal browser-pixel tolerance across document scroll, workspace scroll/edge scroll, and non-unit stage scale.
3. Release commits the expected canonical coordinates as one undoable operation; Escape/pointer cancellation restores the original document and creates no undo entry.
4. Page transfer and grouped movement preserve relative offsets and selection; text interiors still edit/select, and external text borders move. Shared photo/ink behavior remains intact.
5. Run `npm test`, build the affected editor (`npm run build`), and run `tests/desktop-pages.mjs` through the local Vite setup. Report actual results. A browser simulation does not establish physical touch/pen behavior.

## Risks and assumptions

- Assumption: the user means the existing supported move gesture on the text box's outer border/drag affordance, not dragging from inside editable text. This matches the confirmed editor interaction contract.
- The report gives no reproduction sequence or browser details. The new regression should cover plausible grab offsets and scale/scroll, while implementation should be guided by the actual shared-coordinate path rather than a text-only workaround.
- The concrete page/client mismatch is supported by the current implementation and Interact event fields; no browser, OS, or hardware reproduction details were supplied. Keep the repair shared and avoid claiming physical touch/pen verification.
- Current desktop-pages output claims general attachment/edge-scroll/cancellation, but existing coverage is mostly photos in the drag path and uses internal scrolling. Strengthen it to detect this actual cause instead of duplicating the centered case.

## Execution and integration plan

This is a small shared-gesture bug, so splitting implementation across parallel writers would create overlap without useful independence.

- **Coordinator / implementation owner:** recheck the working tree and existing `docs/specs/text-drag/` files; trace all callers of the shared drag functions in `src/page-composition.js`; implement the smallest shared coordinate fix; own edits to `src/page-composition.js` and `tests/desktop-pages.mjs`; run the checks above; inspect the final diff and relevant scoped guidance.
- **Independent review:** review this spec against `docs/desktop-scrapbook-spec.md`, the drag implementation, and the regression coverage. Challenge the suspected gap, test edge cases, and revise this spec and handoff only. Do not edit runtime code.
- **Integration:** keep one implementation owner for the shared source and browser fixture. Splitting runtime/test work into independent writing lanes would create avoidable coordination around one pointer-event path and one fixture; integrate the source fix and regression together, then run checks sequentially. Preserve unrelated work; do not create a worktree or deploy for this local repair.

Definition of done: the focused browser regression fails on the old behavior and passes after the shared fix; required project checks have recorded outcomes; text remains attached through relevant scale/scroll cases; and no user data or published content is changed. See `IMPLEMENT_PROMPT.md` for the fresh-chat execution handoff.
