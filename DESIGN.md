---
name: Baitari
description: Calm, precise clinical signals and anchored sidebar identity for veterinary workflows.
colors:
  canvas: "var(--background)"
  ink: "var(--foreground)"
  card: "var(--card)"
  muted: "var(--muted)"
  muted-ink: "var(--muted-foreground)"
  border: "var(--border)"
  sidebar: "var(--sidebar)"
  sidebar-ink: "var(--sidebar-foreground)"
  sidebar-hover: "var(--sidebar-accent)"
  signal-critical: "#f43f5e"
  signal-watch: "#f59e0b"
  signal-positive: "#10b981"
  signal-quiet: "#a1a1aa"
typography:
  title:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2308
  signal-value:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "clamp(1.75rem, 2.1vw, 2.1rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  label:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
  supporting:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4545
rounded:
  icon: "10px"
  dock: "14px"
  panel: "16px"
  pill: "999px"
spacing:
  card-gap: "12px"
  card-compact: "16px"
  card-default: "20px"
  footer-band-y: "12px"
components:
  clinical-signal-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.card-default}"
  clinical-signal-card-compact:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.card-compact}"
  sidebar-identity-dock:
    backgroundColor: "transparent"
    textColor: "{colors.sidebar-ink}"
    rounded: "{rounded.dock}"
    height: "48px"
---

# Design System: Baitari

## Overview

**Creative North Star: "Calm Clinical Signals"**

Baitari presents operational clinical information with quiet precision. Neutral surfaces and compact typography carry the interface; color appears sparingly when a signal changes the user's attention or next action.

On frequently used non-dashboard pages, the interface behaves like a clinical instrument: concise page names replace motivational headlines, the task surface follows the signal row immediately, and sensitive actions use named in-app confirmations with explicit outcomes.

This document covers the reusable clinical signal-card pattern and sidebar identity dock established by the current implementation. Dashboard composition is explicitly outside this component scope.

**Key Characteristics:**

- Four-card clinical signal rows that read as an aligned set, not as a decorative analytics dashboard.
- Semantic state communicated by icon, text, and color together.
- A sidebar footer band that stays visually anchored while navigation content scrolls independently.
- Fine separators, restrained hover states, and theme-aware neutral surfaces.
- Concise operational page titles without emoji or promotional name gradients outside the dashboard.

## Colors

Neutral canvas, card, border, text, and sidebar roles come from the live theme variables. Clinical signal colors are reserved for meaning.

### Primary

- **Clinical Positive:** Used only for clearly favorable states such as completed work, collected funds, or an active team.

### Secondary

- **Clinical Watch:** Marks active items that require monitoring without implying critical urgency.

### Tertiary

- **Clinical Critical:** Marks active urgency, shortage, follow-up, alert, or access-review conditions.

### Neutral

- **Quiet Signal:** The default for informational or inactive states.
- **Canvas, Card, Ink, Muted Ink, and Border:** Theme-bound roles that preserve the same hierarchy in light and dark modes.

### Named Rules

**The Meaning Before Color Rule.** Never communicate a clinical state with color alone; pair it with a distinct icon and written badge.

**The Active Alert Rule.** Critical and watch colors appear only when the associated numeric signal is active. A zero or inactive condition returns to the quiet treatment.

## Typography

**Display Font:** Inter Variable (with Inter and sans-serif fallbacks)  
**Body Font:** Inter Variable (with Inter and sans-serif fallbacks)

**Character:** Compact and highly legible, with visual emphasis created through weight and numeric scale rather than ornamental type.

### Hierarchy

- **Title:** Medium-weight, compact labels may wrap to two lines without changing card alignment.
- **Signal Value:** Semibold tabular numerals with tight tracking form the primary scan target.
- **Status Label:** Small, medium-weight text is contained in a pill and paired with a state icon.
- **Supporting Text:** Muted two-line context sits beneath a hairline divider.

### Named Rules

**The Stable Numeral Rule.** Operational values use tabular numerals so changing counts do not create visual jitter.

## Layout

Clinical signals form one equal four-column row at extra-large widths, two columns at small and medium widths, and one column on narrow screens. The gap remains compact and consistent. Each default card has a minimum height of 164px; compact cards use 148px.

Inside every card, a three-row structure keeps the title row, value row, and supporting band aligned across the set. The supporting band has a 38px minimum rather than a clipping height, so longer operational copy remains visible while sibling cards still align through the shared grid row.

The non-dashboard page stage uses one compact vertical rhythm: page title, four signals, then the primary work surface. Avoid adding a second large top offset inside page components because the shell already owns the global header spacing.

The sidebar uses a non-scrolling header, an independently scrolling content region, and a shrink-resistant footer at the bottom. The footer retains the same edge-to-edge band and vertical padding in expanded and collapsed states; only its internal presentation changes.

## Elevation & Depth

These components are flat by default. Signal cards use a quiet border and a barely tinted hover surface rather than lift. The identity dropdown is the exception: it uses a concentrated ambient shadow to separate a transient menu from the sidebar without making the persistent dock appear elevated.

### Named Rules

**The Flat Signal Rule.** Clinical signal cards do not use decorative shadows, charts, gradients, or animated embellishment to manufacture importance.

## Shapes

Clinical cards and dropdown panels use gently rounded 16px corners. The identity trigger uses a slightly tighter 14px corner, icon tiles use 10px corners, and status labels use a full pill. Avatars and state dots remain circular. Borders and one-pixel hairlines carry structural separation.

## Components

### Clinical Signal Cards

- **Structure:** Exactly four coordinated cards per established signal set; use the responsive grid behavior defined in Layout.
- **Card:** Theme card surface, 16px radius, quiet border, and either 20px default or 16px compact padding.
- **Title Row:** A 32px semantic icon tile, a compact title, and a 6px state dot aligned on one line.
- **Value Row:** The large tabular value anchors the left; the semantic badge stays right-aligned and may occupy no more than 56% of the row.
- **Supporting Band:** A top hairline and two-line muted description occupy the fixed final row.
- **State:** Critical and watch use an alert triangle in the badge; positive and directional quiet states use trend arrows; neutral states use a minus.
- **Hover:** Border contrast increases slightly and the surface receives only a faint neutral tint.

### Operational Page Header

- **Scope:** Patients, Agenda, Clinique, Produits, Finances, and Équipe. The dashboard retains its warmer greeting.
- **Title:** Use the localized section name as the single H1 at 24–28px.
- **Subtitle:** One concise line that states the job of the page; avoid slogans, emoji, gradients, and repeated user names.
- **Rhythm:** Keep the header and its actions close to the four-signal row, then place the work surface immediately after it.

### Sensitive Actions

- **Confirmation:** Destructive or access-changing operations use named application dialogs, never browser alerts or confirms.
- **Consequence:** Dialog descriptions state what changes and whether the action is irreversible.
- **Feedback:** Success, partial success, and failure are surfaced through the shared toast system. Never leave a failed secondary operation only in the console.
- **Credentials:** Temporary passwords are generated with the platform cryptographic API, shown once in a focused dialog, and copied only through an explicit action.

### Sidebar Identity Dock

- **Placement:** Lives inside the sidebar footer band, after the scrollable navigation region.
- **Expanded:** A 48px trigger shows a 32px avatar, 13px name, 10.5px email, and a subdued right-facing affordance.
- **Collapsed:** The trigger becomes a centered 36px rounded control containing only the avatar; identity text and affordance are hidden.
- **Hover / Open:** A restrained sidebar-accent fill marks interaction; the persistent dock remains flat.

### Identity Dropdown

- **Placement:** Opens to the right on desktop and below on mobile, offset by 4px.
- **Panel:** 256px wide, 16px corners, a quiet theme border, compact 6px padding, and an ambient shadow.
- **Header:** Repeats the identity with a 40px avatar, name, and muted email before a separator.
- **Actions:** Profile, finances, notifications, and settings use 36px rows, 10px corners, and 20px line icons.

### Sidebar Separators and Footer Band

- **Header Hairline:** A one-pixel separator sits immediately below the sidebar header and adapts its inset or full width to the sidebar variant.
- **Footer Hairline:** A theme-aware top border separates the identity dock from navigation at stronger opacity than incidental dividers.
- **Behavior:** Both remain visible in light and dark themes. The minimal sidebar variant replaces the header hairline with its own shell-level separator.

## Do's and Don'ts

### Do:

- **Do** preserve the aligned three-row card structure across all four clinical signals.
- **Do** derive semantic tone from the meaning and active value of the signal.
- **Do** pair semantic color with a recognizable icon and explicit label.
- **Do** keep the identity dock inside the anchored sidebar footer band and retain its hairline boundary.
- **Do** preserve light- and dark-theme contrast for borders, text, icon tiles, pills, and dropdown elevation.
- **Do** keep icon-only actions visible on touch layouts and reveal them on keyboard focus as well as hover.
- **Do** provide Enter/Space behavior and a visible focus treatment for interactive records.

### Don't:

- **Don't** treat these cards as dashboard widgets or add decorative charts and promotional metrics.
- **Don't** use saturated color for quiet or zero-value states.
- **Don't** let variable supporting copy change card height or break row alignment.
- **Don't** scroll the identity dock away with navigation content.
- **Don't** add persistent elevation to the signal cards or sidebar dock.
- **Don't** use native `alert` or `confirm` for clinical, inventory, financial, or access-management operations.
- **Don't** hide a required action behind hover alone.
