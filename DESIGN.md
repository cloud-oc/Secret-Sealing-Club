# Design

## Direction
A nocturnal lunar observatory for Secret Sealing Club music and booklet stories. Listeners browse original record jackets in a quiet room at night; a silver-lilac moon and fine celestial orbits suggest the boundary between science and fantasy.

## Visual language
- Original album artwork leads; a locally rendered SVG moon supports it.
- Delicate orbital geometry, restrained mint accents, opaque midnight surfaces.
- Square record jackets, circular playback controls, thin separators.
- Interactive lunar opening with native modal focus, a single entry prompt, MIT footer, and replay from About; no autoplay or rotating navigation.

## Color
- Background `#0a0e19`; listening deck `#0d1320`; panels `#141c2b`.
- Ink `#edece8`; secondary text `#a7afc0`.
- Mint `#a8d9ce` for selection and playback; pale green `#c2dcd3` for the primary action.
- Moon uses desaturated violet and silver; album artwork retains its own colors.

## Typography
- Songti / Hiragino Mincho / Yu Mincho for Chinese and Japanese display and booklet text.
- Existing Avenir Next / Hiragino Sans GB / Yu Gothic stack for controls and metadata.
- Booklet body 16–17px with generous line height; calm, balanced display titles.

## Layout
- Desktop: two-column observatory, nine-record shelf, fixed listening deck.
- Tablet: five-column shelf. Mobile: single-column observatory and three-column shelf.
- Selected records update the feature without interrupting playback; opening a booklet selects its album.
- Reading page: cover and metadata beside the text; compact album header on mobile.
- Explicit previous/next story and play-current-track actions.

## Accessibility and motion
- Semantic links and buttons, visible keyboard focus, labeled controls, selected-record and current-track states.
- Skip link; modal focus containment and inert background; Escape closes overlays.
- Slow lunar drift, orbital light, and record-disc rotation; playback halo reflects playing state.
- Respect reduced motion; a persistent motion toggle pauses ambient effects. Pause CSS motion and starfield work in hidden tabs.
- Music stays user initiated; unavailable audio produces an inline status with an external listening alternative.

## Assets
`assets/visuals/moon.svg` is a local procedural lunar illustration. Covers and audio retain the project's existing external sources.

## Cursor
Independently implemented white dot, trailing ring, hover expansion, and click ripple matching the AstralCursor visual reference at https://github.com/sunay04/sunay04.github.io. The overlay follows native dialogs into the top layer. Touch, reduced-motion, and paused-motion modes use the system cursor.


## September 2026 refinement
- Local Lucide 1.48.0 SVG sprite for all interface icons; the custom club insignia remains the brand mark. License retained in licenses/lucide.txt.
- The lunar entrance expands a single soft radiance over 1050ms, then dissolves. Reduced-motion and paused-motion modes enter directly.
- English rights notice distinguishes MIT software from third-party works and links the official Japanese guidelines. RIGHTS.md records the scope and outstanding permissions.
- The page and gate render before story requests. Selected content has priority; two background workers warm remaining albums. Requests are deduplicated, bounded by an 8-second timeout and independently recoverable.
- Audio uses explicit loading, buffering, playing, paused and error states. A 15-second stalled-playback deadline offers manual retry and an external source link. Old play promises cannot change a newer request's state.
- Position persistence is throttled to two seconds, and unavailable browser storage cannot stop rendering. The starfield is capped at 30fps and 1.5 device pixel ratio.

Validation: `node --test tests/resilience.test.mjs`; browser checks for entry, mobile layout, playback, rapid track selection and retry recovery.
