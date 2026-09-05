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
  modal-title:
    fontFamily: "var(--app-font-heading)"
    fontSize: "28px"
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: "-0.028em"
  modal-title-compact:
    fontFamily: "var(--app-font-heading)"
    fontSize: "25px"
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: "-0.028em"
  modal-supporting:
    fontFamily: "var(--app-font-sans)"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  icon: "10px"
  dock: "14px"
  panel: "16px"
  pill: "999px"
  modal-shell: "24px"
  modal-icon: "19px"
  modal-icon-compact: "17px"
  modal-icon-compact-small: "16px"
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

This document covers the reusable clinical signal-card pattern and sidebar identity dock established by the current implementation. The dashboard extension below has its own composition and expressive chart vocabulary; the clinical signal-card rules remain scoped to their existing operational surfaces.

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

### Dashboard, Medical Tables, and Modal Extension

**Scope and intent:** The dashboard is a clinical operating surface: expressive charts make real work easier to inspect and act on. Neutral cards, inset gray plotting areas, colorful icon tiles, and pastel rectangular status labels extend the incumbent system. This is an extension of the existing editable responsive grid, not a replacement visual identity. Preserve the Protocol sticky header, continuous scroll opacity, blur utilities, and hairline separator specified in AGENTS.md.

- **Default composition and alignment:** Lead with the newest analysis widgets: activity combo chart (7 columns) alongside progress rings (5), then annual contributions (8) alongside a compact patient population card (4). The third row pairs today's schedule (7) with clinical vigilance (5); cashflow follows at full width. Capacity is omitted because its fixed eight-slot reference does not provide a useful operational measure. The patient species breakdown uses three compact blocks so the paired cards share a useful content density and aligned height without dead space. Rows use consistent 16px gaps. Below the extra-large breakpoint, stack in reading order; controls and content must shrink or wrap without clipping. The layout manager retains editing and persistence.
- **Activity combo chart:** Plot actual consultation counts and collected revenue on separately labeled axes. The 7-day, 6-week, and 12-week controls recalculate the displayed totals and averages. Keep counts and currency distinct, expose values through chart inspection, and route the detail action to financial analytics. No fabricated growth percentages or decorative metrics.
- **Progress rings:** Place three white, theme-aware summary chips above large concentric pink appointment, lime action, and blue payment rings. Keep the center blank and omit duplicate legends below. Chips show completed / total counts, identify the corresponding ring on hover or keyboard focus, and open Agenda, Tasks, or Finances. The 7/30-day selector defaults to 30 days and ends at the dashboard reference date; the July 10, 2026 Activity reference supplies composition, not a hardcoded clinical date.
- **Ring definitions and empty states:** Appointments count completed visits over all non-cancelled visits in the period. Actions count done tasks over tasks whose due date falls in the period, falling back to creation date when no deadline exists. Payments count paid income transactions over all income transactions in the period; this is a transaction count, not a monetary ratio. Zero totals render a faint track with no progress arc, retain the truthful 0 / 0 chip, and expose an explicit no-items explanation. Never substitute a synthetic target or full ring for absent data.
- **Contributions:** The annual heatmap draws from 365 real daily records in `metrics.activityYear` and stays on a twelve-month view. Five levels represent 0, 1–2, 3–4, 5–7, and 8 or more consultations with a filled lavender neutral followed by turquoise, blue, violet, and pink. Four summary tiles report active days, peak activity, consecutive-day streak, and collected revenue. Month labels sit below the grid. Cells expose daily consultation counts and collected amounts through click or keyboard selection with visible focus. The 8-column card and 1–2px grid gaps enlarge the cells slightly while the grid compresses on narrow screens without an internal scrollbar. The detail action opens analytics. Patient, schedule, vigilance, and cashflow cards continue to lead to the relevant operational records or screens.
- **Medical tables:** Use quiet sentence-case headers, readable rows, and compact rectangular pastel labels with 5px corners. Green denotes healthy/completed, blue treatment/scheduled/in-progress, amber hospitalized/waiting/no-show, cyan arrived, violet confirmed, rose cancelled, and gray deceased. Written status remains essential; color is supplementary. Dark mode adapts fill and ink. Retain sorting, filtering, pagination, row actions, visible keyboard focus, and selected-row contrast. Patient table cells use a 72px row rhythm; do not impose this height on every table.
- **Modal backdrop and motion:** Preserve the lighter pearl-frosted surroundings and opaque scrolling body described under Workflow Modals. The shared dialog overlay fades over 180ms and content over 220ms with the app's ease-out curve; avoid added zoom or bounce. Reduced-motion styling shortens motion and removes displacement. Keep reduced-transparency and unsupported-blur fallbacks. Header artwork and glass belong to the modal composition and must not alter the Protocol application header.

Implementation references: `src/modules/dashboard/v2/`, `src/components/ui/table.tsx`, the patient medical table in `Patients.tsx`, and the expressive dashboard/table/modal rules in `src/index.css`.

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

### Workflow Modals

One atmospheric header identifies the workflow above a quiet, opaque reading surface. This component extension is independent of the dashboard's Protocol header rules.

- **Header:** Use one `ModalBanner` for the prominent glass icon, title, short support text, and close control. An optional companion icon may describe a relationship; show status only when it adds meaningful information.
- **Artwork:** Use the generated local airbrush assets `modal-airbrush.webp` and `modal-amber-light.webp`. Stable per-workflow presets select the asset, hue, crop, and horizontal reflection so the composition stays recognizable across openings and themes.
- **Icons:** Default glass tiles are 62px with 19px corners and 32px symbols. Compact tiles are 54px with 17px corners and 29px symbols. Below 640px width or at 700px height and below, default tiles use compact dimensions; already compact tiles become 50px with 16px corners, retaining 29px symbols.
- **Typography and Copy:** Follow the current user-selected app font through `--app-font-heading` and `--app-font-sans`. Titles use the 28px/560 modal role, reducing to 25px for compact or constrained viewports. Support text is 14px/400 with normal tracking, a 1.5 line height, and a 52ch maximum width. Keep copy brief and avoid repeating the title or adding decorative status.
- **Body and Actions:** `FormDialogContent` has 24px corners and a bounded three-row layout. `FormDialogBody` is an opaque `--card` surface that scrolls independently; the header and footer stay visible outside that scroll region. Financial detail dialogs use the same scrollable body. Keep actions in `FormDialogFooter`.
- **Overlay and Dark Theme:** The light overlay is pearl frosted `rgb(244 241 248 / 0.46)` with 7px blur. Dark mode uses `rgb(9 7 16 / 0.5)`, artwork at 0.48 opacity beneath a dark scrim, and light title and support ink. Theme state is owned solely by `ThemeProvider`; modal styling follows that state.
- **Transparency Fallbacks:** Without backdrop-filter support, increase overlay opacity to 0.86 in light mode and 0.76 in dark mode. Reduced transparency uses 0.94/0.9 overlay opacity without blur, solid glass-icon fills, and an opaque theme-card footer.

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
