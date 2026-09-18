# Visual system

Natal Atlas. Empty wheel until a chart is cast. Not a purple new-age template.

## Point of view

A high-end planetarium watch movement. Ink, gold, ember, bone. The natal wheel is the product, not a widget beside a blog.

Cast is a ritual: full-field plate, engraved readouts, then the ring lights. One signature moment per region.

## Type

Fontshare, already installed at `/fonts/fontshare/`.

- Display: Clash Display 600/700
- Body / UI: Satoshi 400/500/700
- Mono for degrees: ui-monospace, tabular-nums

Do not use Inter, Roboto, system-ui as the designed face.

Fluid type: display `clamp(2.4rem, 1.1rem + 5vw, 5.2rem)` (max/min under 2.5). Body 1.05-1.125rem, leading 1.55, measure ~58ch on essays.

## Color (OKLCH tokens, 5 values)

```css
:root {
  --ink: oklch(0.16 0.01 70);
  --bone: oklch(0.93 0.02 85);
  --gold: oklch(0.78 0.12 80);
  --ember: oklch(0.68 0.18 45);
  --steel: oklch(0.72 0.03 240);
}
```

Fire signs read gold/ember. Earth reads steel. Water (Pluto) a deep wine sampled from ember, not a sixth brand color. No purple. No rainbow.

## Surfaces

Dark field. Film grain overlay at 0.04-0.06 opacity, one fixed layer. Glass only on nav, Cast plate, inspector, vault. Specular 1px on the wheel bezel and Cast primary. Mesh/aurora is a single low amber wash, not full-page blobs.

## Motion

CSS tokens from premium-ui-motion. GPU only (transform/opacity/filter). Waiting wheel: gold tick at due east. After cast, glyphs fade in (vis tween). View transition from Cast to wheel when the browser supports it. Reduced motion: snap, no drift, no pulse.

## Layout

- Empty until Cast. Chapter nav and dock stay hidden while waiting.
- Full-viewport hero: wheel centered, type in gutters.
- After a chart: magazine chapters (cluster only if a stellium exists).
- Inspector dock (right on desktop, sheet on mobile).
- Keyboard: tab through planets, arrows around the wheel, Esc clears, 1-4 solo patterns.

## Stack

Static files in `public/`. No React, no bundler. Vanilla HTML + CSS + JS modules. Canvas 2D for the wheel. Atmosphere still at `public/assets/hero-atmosphere.jpg` under an ink scrim. Charts are computed in the browser from Cast. Do not load a personal default nativity. Vault is opt-in and never auto-opens.

## A11y

Skip link. Landmarks. Focus ring gold on ink. 44px targets. `aria-live="polite"` on the inspector. Canvas `role="img"` with a text alternative. Contrast on glass via scrim. `prefers-reduced-transparency` solids.

## Chronograph

Chapter 06 is a watch movement attached to the hero wheel. Hour / Day / Month / Year / Decade scales. Engraved ticks at 1 / 5 / 10 / 30. Jewel marks: gold soft, ember hard, steel stations. Outer transit glyphs and progressed glyphs tween; they do not teleport. Rings are mutually exclusive: off, transits, progressed, or vault. Glass is allowed on the chronograph strip.

## Anti-tells

No neon card strokes. No 12 identical planet tiles. No Inter. No spinning rainbow borders. No stock zodiac clipart. No copying commercial guidebook paragraphs. No operator birth data on `public/`.
