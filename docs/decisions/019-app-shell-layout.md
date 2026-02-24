# ADR 019: App-Shell Layout with Container Scroll

**Status:** Accepted
**Date:** 2026-02-23

## Context

During Phase 1 Enhancement #6 (fixing interview layout and scroll behavior), we needed to anchor the text input to the bottom of the viewport while allowing the conversation transcript to scroll independently. This required a decision about the overall app layout architecture.

Two approaches were considered:

1. **Viewport scroll (traditional):** Each page scrolls naturally at the browser level, with the interview page as a special case using viewport units (`height: 100svh`) to create its contained layout.

2. **Container scroll (app-shell):** The entire app uses a fixed-height shell with internal scroll containers — the parent `(app)` layout creates a viewport-height container, and the `main` element scrolls internally. The interview layout then cleanly references percentage-based heights from its parent.

## Decision

**Use container scroll (app-shell pattern) for the entire authenticated app.**

The parent layout (`src/app/(app)/layout.module.css`) establishes:
- `.shell` with `height: 100svh` and `overflow: hidden` (locks to viewport height)
- `.main` with `overflow-y: auto` (creates the scroll container)

This makes all pages under `(app)` use container scroll instead of viewport scroll.

## Rationale

### Why Container Scroll is Better for Telltale

1. **Mobile Safari stability**
   - Viewport units (`100vh`/`100svh`) are notoriously buggy on iOS Safari
   - The address bar showing/hiding causes viewport height to jump, creating janky layouts
   - Container scroll within a fixed-height parent is far more stable

2. **App, not document**
   - Telltale is a web application (like Gmail, Slack, Notion), not a content site
   - Users expect app-shell behavior with persistent headers and controlled scroll areas
   - Traditional document scroll is better suited for blogs or documentation sites

3. **Interview layout requirements**
   - The core feature (interview) requires a contained scroll layout with:
     - Sticky header at top
     - Scrollable transcript in middle
     - Fixed input at bottom
   - With container scroll, the interview layout uses clean percentage-based heights
   - Without it, the interview would need viewport units, creating a special case

4. **Consistency over special cases**
   - **One pattern everywhere:** All pages use the same scroll model
   - **Simpler mental model:** Developers don't need to think about which pages scroll where
   - **Easier to extend:** Future features (split-panes, resizable panels, persistent banners) are simpler with container scroll

5. **Future-proofing**
   - Global notification banners (stay above scroll)
   - Persistent action bars at bottom
   - Split-pane layouts
   - Resizable panels
   - Modal dialogs (preventing body scroll is easier)

   All of these are easier to implement with the app-shell pattern.

## Alternative Considered

### Viewport Units in Interview Layout

The interview layout could use `height: 100svh` directly instead of percentage-based heights:

```css
.container {
  margin: -2rem -1.5rem;
  height: 100svh;  /* Instead of min-height: calc(100% + 4rem) */
}
```

This would work without changing the parent layout.

**Why we rejected it:**
- Doesn't solve the mobile Safari viewport unit issues
- Creates a special case (most pages use viewport scroll, interview uses viewport positioning)
- Misses the opportunity to establish a better foundation for the app
- Increases complexity (two different scroll models in the same app)

## Implementation Details

### Parent Layout Changes

**`src/app/(app)/layout.module.css`:**
```css
.shell {
  height: 100svh;       /* Fixed to viewport height */
  overflow: hidden;     /* No overflow allowed */
}

.main {
  flex: 1;
  min-height: 0;        /* Allow flex item to shrink */
  overflow-y: auto;     /* Create scroll container */
  padding: 2rem 1.5rem;
}
```

### Interview Layout

**`src/app/(app)/interview/layout.module.css`:**
```css
.container {
  margin: -2rem -1.5rem;    /* Negate parent padding for full-bleed */
  height: 100%;             /* Fill parent height exactly */
}
```

The interview layout uses negative margins to escape the parent's padding and create a full-bleed effect. The `height: 100%` fills the parent's content box exactly - the negative margins handle the visual positioning without requiring height adjustments.

## Testing

All existing pages were validated with the container-scroll layout:
- ✅ Dashboard page — content fits, scrolls properly
- ✅ Books list page — scrolls correctly with multiple books
- ✅ Book interviews page — multiple sections scroll as expected
- ✅ Interview page — sticky header, scrollable transcript, fixed input (core feature works perfectly)
- ✅ Mobile responsive — tested at 375x667 (iPhone size), layout adapts correctly

All tests pass (236 tests across 38 files).

## Consequences

### Positive

- Consistent scroll behavior across all pages
- Better mobile Safari stability (no viewport unit issues)
- Interview layout works cleanly with percentage-based heights
- Future app-shell features are easier to implement
- One mental model for developers to learn

### Negative

- Scrollbar appears on `.main` instead of browser edge (subtle visual difference)
- Breaks user expectation of "traditional" web scrolling (minor, given this is a web app)
- If we add a public marketing site later, it might use viewport scroll (creates inconsistency between public/app sections)

### Neutral

- All new pages must work within the viewport-height constraint (not a problem for a web app)
- Requires testing pages for scroll behavior (good practice anyway)

## Related

- Enhancement #6 in **docs/plans/active/phase-1-enhancements-part-2.md** — Interview layout improvements
- **docs/architecture/frontend-patterns.md** — Frontend component patterns
