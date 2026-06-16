# Design

## Theme
Dark, nocturnal fan-site with Japanese flat-design restraint. The page should feel quieter, flatter, and more printed than glassy.

## Visual Language
- Opaque panels over translucent glass
- Thin 1px borders and calm spacing
- Low-radius controls and cards
- Cosmic background only as atmosphere, not decoration overload
- Strong typographic hierarchy with few shapes doing most of the work

## Color
- Background: `#040711`, `#090b12`, `#0f141b`
- Ink: `#ece6d7`
- Muted text: `#a99f91`
- Primary accent: `#56d6bd`
- Secondary accent: `#d7b363`
- Supporting accents come from each album color, but should stay subdued

## Typography
- Font stack: `"Avenir Next", "Hiragino Sans GB", "Yu Gothic", "Noto Sans CJK SC", system-ui, sans-serif`
- Headings should be large but calm
- Body text should stay readable and airy
- Japanese and Chinese copy should share the same tone and line rhythm

## Layout
- Desktop: two-column hero, two-column album page
- Mobile: single-column collapse with preserved reading order
- Use grid and spacing for hierarchy, not nested cards
- Keep the player fixed, but visually quiet

## Components
- Sticky header with brand, GitHub, and language switcher
- Hero with album carousel
- Album page with cover, links, and story reader
- Bottom player with hidden playlist panel
- Dynamic starfield background

## Motion
- Background stars can move
- Carousel and track transitions should stay subtle
- Respect reduced motion and keep transitions light

## Notes
- Favor flatter surfaces and simpler shadows when refining UI
- Preserve the nocturnal secret-sealing mood
