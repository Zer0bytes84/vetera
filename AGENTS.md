## Summary
- App to reproduce Protocol's sticky header with scroll-based blur/transparency effect, and layered hover effects on first-row widget cards.

## Header Glass (Protocol-faithful)
- **Continuous opacity via framer-motion** — `useScroll({ container: sidebarScrollRef })` + `useTransform(scrollY, [0, 72], ...)` drives two CSS vars: `--bg-opacity-light` (0.5→0.9) and `--bg-opacity-dark` (0.2→0.8). No discrete `isHeaderScrolled` state, no scroll listener.
- **Tailwind classes** on `<motion.header>`: `bg-white/[var(--bg-opacity-light)] dark:bg-zinc-900/[var(--bg-opacity-dark)] backdrop-blur-xs dark:backdrop-blur-sm`. **No** `backdrop-saturate`, **no** shadow, **no** gradient refraction overlay.
- **Hairline border** at `top-full`: absolute `<div>` with `bg-zinc-900/7.5 dark:bg-white/7.5` (replaces `border-b`), exactly like Protocol's `Header.tsx`.
- **CSS** `.app-shell-header` rule removed entirely — the glass is now 100% Tailwind utilities + framer-motion.
- **SidebarInset height constraint** kept: `max-h-dvh` (normal) / `max-h-[calc(100dvh-20px)]` (Tauri) so the scroll container is bounded and `sticky` activates.

## Separator Visibility Fixes
- **Vertical header separator**: Changed from `bg-border` (too dark in dark mode) to `bg-foreground/15` with `h-5` for consistent visibility in both themes
- **Sidebar footer borders**: Increased from 50% opacity to 80-100% for better visibility in both modes
- **Sidebar footer `<SidebarSeparator>`**: Removed `opacity-60` so it renders at full opacity

## Widget Hover
- Protocol-style layered hover effect on first-row KPI cards (`section-cards.tsx`):
  - Grid pattern layer (SVG, `skew-y-[-18deg]`, `opacity-0 group-hover:opacity-50`)
  - Gradient overlay (`from-[#D7EDEA] to-[#F4FBDF]`, radial-gradient mask, `opacity-0 group-hover:opacity-100`)
  - Mix-blend grid overlay (`mix-blend-overlay`, `opacity-0 group-hover:opacity-100`)
  - Inset ring layer (`ring-zinc-900/7.5` → `ring-zinc-900/10`)
  - All wrapped in `pointer-events-none absolute inset-0 z-[-1]` container, `group` on Card, `transition-opacity duration-300`
