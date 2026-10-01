---
name: Baitari
description: Quiet, precise veterinary operations on white and charcoal surfaces.
colors:
  canvas: "var(--background)"
  ink: "var(--foreground)"
  card: "var(--card)"
  frame: "var(--muted)"
  ambient-sage: "#dcece7a6"
  ambient-blue: "#e1e9f2a6"
  ambient-sage-dark: "#21483b66"
  ambient-blue-dark: "#263f5a66"
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
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  daily-value:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.2
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
  signal-frame: "14px"
  signal-body: "10px"
  pill: "999px"
  modal-shell: "24px"
  modal-icon: "19px"
  modal-icon-compact: "17px"
  modal-icon-compact-small: "16px"
spacing:
  frame-inset: "5px"
  signal-body-x: "12px"
  card-gap: "12px"
  card-compact: "16px"
  card-default: "20px"
  footer-band-y: "12px"
components:
  clinical-signal-card:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.ink}"
    rounded: "{rounded.signal-frame}"
    padding: "{spacing.frame-inset}"
  clinical-signal-body:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.signal-body}"
  daily-signal-card:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.ink}"
    rounded: "{rounded.signal-frame}"
    padding: "{spacing.frame-inset}"
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

The approved reference refinement uses gray frames around inset white KPI bodies, with charcoal equivalents in dark mode. Animals and floral illustrations no longer sit behind working surfaces. A restrained sage and blue mesh sits behind the top content; the Protocol glass header retains its independent scroll behavior. The dashboard leads with daily operational signals before detailed analytics.

**Key Characteristics:**

- Four coordinated operational signals in gray frames with inset theme-card bodies.
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
- **Canvas, Card, Frame, Ink, Muted Ink, and Border:** Theme-bound roles that preserve the same hierarchy in light and dark modes. The canvas is clean white in light mode; dark canvas and panels use neutral charcoal.
- **Ambient Sage and Ambient Blue:** Low-opacity mesh colors behind the top content only, with darker theme counterparts. These are atmosphere, never status or KPI fills.

### Named Rules

**The Meaning Before Color Rule.** Never communicate a clinical state with color alone; pair it with a distinct icon and written badge.

**The Active Alert Rule.** Critical and watch colors appear only when the associated numeric signal is active. A zero or inactive condition returns to the quiet treatment.

## Typography

**Display Font:** Inter Variable (with Inter and sans-serif fallbacks)  
**Body Font:** Inter Variable (with Inter and sans-serif fallbacks)

**Character:** Compact and highly legible, with visual emphasis created through weight and numeric scale rather than ornamental type.

### Hierarchy

- **Title:** Medium-weight, compact labels may wrap to two lines without changing card alignment.
- **Signal Value:** Medium-weight tabular numerals with tight tracking form the primary scan target. The recorded size is a fitting ceiling: operational values start at 32px (28px compact), daily dashboard amounts at 34px, then shrink to their measured available width.
- **Amount Fitting:** Keep the full amount and currency together. `FittedAmount` measures the actual text using the active font, responds to container resizing and font readiness, and adjusts the font size; it does not abbreviate or clip monetary values.
- **Status Label:** Small, medium-weight text sits in a compact rounded rectangle beside a state icon.
- **Supporting Text:** Muted context wraps inside the inset body beside the semantic badge.

### Named Rules

**The Stable Numeral Rule.** Operational values use tabular numerals so changing counts do not create visual jitter.

## Layout

Clinical signals use four equal columns with a 12px gap, changing to two columns when their container is at most 900px wide and one column at 400px. The dashboard daily row uses four columns and two when its container is at most 740px. Responsive behavior follows the actual working width inside the sidebar shell.

Each signal has a gray title frame and an inset theme-card body. Supporting copy can wrap and the footer can grow; do not enforce the former fixed card heights or truncate required context. Maintain equal columns, readable values, and the shared frame anatomy.

The non-dashboard page stage uses one compact vertical rhythm: page title, four signals, then the primary work surface. Avoid adding a second large top offset inside page components because the shell already owns the global header spacing.

The sidebar uses a non-scrolling header, an independently scrolling content region, and a shrink-resistant footer at the bottom. The footer retains the same edge-to-edge band and vertical padding in expanded and collapsed states; only its internal presentation changes.

## Elevation & Depth

These components are flat by default. Signal cards use gray outer framing, inset card bodies, and fine borders rather than lift. The clinical footer carries only a faint contact shadow; dashboard daily cards strengthen the border on hover. The identity dropdown is the exception: it uses a concentrated ambient shadow to separate a transient menu from the sidebar without making the persistent dock appear elevated.

### Named Rules

**The Flat Signal Rule.** Signal cards derive hierarchy from the gray frame and inset body. Do not add decorative lift, charts, gradients, or animated embellishment to these KPI surfaces.

## Shapes

Clinical and daily KPI frames use gently rounded 14px corners and inset 10px bodies. Clinical state badges use compact rounded rectangles; dropdown panels retain 16px corners. The identity trigger retains 14px corners and avatars remain circular. Borders and one-pixel hairlines carry structural separation.

## Components

### Dashboard, Medical Tables, and Modal Extension

**Scope and intent:** The dashboard is a clinical operating surface: expressive charts make real work easier to inspect and act on. Neutral cards, inset gray plotting areas, colorful icon tiles, and pastel rectangular status labels extend the incumbent system. This is an extension of the existing editable responsive grid, not a replacement visual identity. Preserve the Protocol sticky header, continuous scroll opacity, blur utilities, and hairline separator specified in AGENTS.md.

- **Default composition and alignment:** Lead with four daily signal cards: consultations, today's collections, patient population, and outstanding income. Follow with receipts and receivables, then the activity chart and today's schedule, with clinical vigilance and patient distribution below. The first row uses four equal columns on desktop and two on narrow screens. Keep full amounts and currency together, allow supporting text to wrap, and retain editing and layout persistence.
- **Activity combo chart:** Plot actual consultation counts and collected revenue on separately labeled axes. The 7-day, 6-week, and 12-week controls recalculate the displayed totals and averages. Keep counts and currency distinct, expose values through chart inspection, and route the detail action to financial analytics. No fabricated growth percentages or decorative metrics.
- **Progress rings:** Place three white, theme-aware summary chips above large concentric pink appointment, lime action, and blue payment rings. Keep the center blank and omit duplicate legends below. Chips show completed / total counts, identify the corresponding ring on hover or keyboard focus, and open Agenda, Tasks, or Finances. The 7/30-day selector defaults to 30 days and ends at the dashboard reference date; the July 10, 2026 Activity reference supplies composition, not a hardcoded clinical date.
- **Ring definitions and empty states:** Appointments count completed visits over all non-cancelled visits in the period. Actions count done tasks over tasks whose due date falls in the period, falling back to creation date when no deadline exists. Payments count paid income transactions over all income transactions in the period; this is a transaction count, not a monetary ratio. Zero totals render a faint track with no progress arc, retain the truthful 0 / 0 chip, and expose an explicit no-items explanation. Never substitute a synthetic target or full ring for absent data.
- **Contributions:** The annual heatmap draws from 365 real daily records in `metrics.activityYear` and stays on a twelve-month view. Five levels represent 0, 1–2, 3–4, 5–7, and 8 or more consultations with a filled lavender neutral followed by turquoise, blue, violet, and pink. Four summary tiles report active days, peak activity, consecutive-day streak, and collected revenue. Month labels sit below the grid. Cells expose daily consultation counts and collected amounts through click or keyboard selection with visible focus. The 8-column card and 1–2px grid gaps enlarge the cells slightly while the grid compresses on narrow screens without an internal scrollbar. The detail action opens analytics. Patient, schedule, vigilance, and cashflow cards continue to lead to the relevant operational records or screens.
- **Medical tables:** Use quiet sentence-case headers, readable rows, and compact rectangular pastel labels with 5px corners. Green denotes healthy/completed, blue treatment/scheduled/in-progress, amber hospitalized/waiting/no-show, cyan arrived, violet confirmed, rose cancelled, and gray deceased. Written status remains essential; color is supplementary. Dark mode adapts fill and ink. Retain sorting, filtering, pagination, row actions, visible keyboard focus, and selected-row contrast. Patient table cells use a 72px row rhythm; do not impose this height on every table.
- **Modal backdrop and motion:** Preserve the lighter pearl-frosted surroundings and opaque scrolling body described under Workflow Modals. The shared dialog overlay fades over 180ms and content over 220ms with the app's ease-out curve; avoid added zoom or bounce. Reduced-motion styling shortens motion and removes displacement. Keep reduced-transparency and unsupported-blur fallbacks. Header artwork and glass belong to the modal composition and must not alter the Protocol application header.

Implementation references: `src/modules/dashboard/v2/`, `src/components/ui/table.tsx`, the patient medical table in `Patients.tsx`, and the expressive dashboard/table/modal rules in `src/index.css`.

### Clinical Signal Cards

- **Structure:** Coordinated operational signals use the responsive row defined in Layout.
- **Frame:** Muted gray surface, 14px corners, quiet border, and a 5px inset. The title band has a 44px minimum height with a compact label and a subdued 18px line icon.
- **Body:** White in light mode and theme-card charcoal in dark mode, with 10px corners and 12px horizontal padding. The value, explicit context, supporting detail, and status share one flexing inset body. Bodies stretch to the same row height.
- **Value:** Use automatic full-string fitting with tabular numerals. Compact mode lowers the fitting ceiling to 28px rather than changing the frame anatomy.
- **Supporting Band:** Context uses 11px copy; detail uses 12px copy with a 32px minimum band. A compact 10px semantic badge sits below the detail. Optional whole-card navigation has a separated footer action. Two-item rows use two columns; four-item rows use four columns, then two, then one on narrow containers.
- **State:** Critical and watch use an alert triangle in the badge; positive and directional quiet states use trend arrows; neutral states use a minus. Color belongs to the written badge rather than the entire card.
- **Rappels:** The page title and description precede the indicators, with the personal/team scope selector alongside the heading. Three shared cards summarize open items due today or overdue, future/undated items, and completed items in the selected scope. Each card selects the corresponding list view; creation and search remain directly below.

### Daily Dashboard Signals

- **Anatomy:** Four clickable gray-framed cards share the 5px inset, 14px outer corners, and 10px theme-card body. Each has a 13px heading and subdued 18px icon, fitted value, explicit period context directly below the value, 12px detail, compact rectangular semantic status, and a readable 11px footer action above which a hairline separates navigation from data.
- **Scope:** Consultations and collected income use the dashboard reference day. Registered patients are the complete patient count; pending income spans all dates and explicitly says so.
- **Real Context:** Consultations name the first visit to follow with its time and patient, or explicitly state no visit remains. Receipts compare real collected income with yesterday, showing a percentage only when yesterday has a nonzero base. Patient context names the two largest actual species groups. Pending income states the count of waiting entries.
- **Status:** Watch identifies remaining visits or waiting payments; positive identifies receipts at least matching a nonzero yesterday baseline or an empty pending ledger. Other states use quiet treatment. Pair the tone with explicit written status, keeping neutral card surfaces.
- **Navigation:** The cards open Agenda, Finances, Patients, and Finances respectively. Whole-card buttons expose keyboard activation and visible focus. Hover changes border contrast over 160ms.

### Neutral Workspace and Protocol Header

- **Working Surfaces:** Clean white and neutral gray in light mode, charcoal in dark mode. Animals and floral artwork do not appear behind dashboard, section, authentication, or modal working content.
- **Atmosphere:** Use Radiant's `GradientBackground` palette: 115-degree linear gradient with #fff1be at 28%, #ee87cb at 70%, and #b060ff at the end. The adapted 528×224px rounded field rotates -10 degrees, blurs 64px, and sits 160px above the canvas. Shift it toward the center with a 160px right inset on medium screens and 192px on large screens; anchor to the right on small screens. Clip it within a 224px pointer-transparent top-content layer; reduce opacity to 35% in dark mode. Keep this layer separate from the application header.
- **Navigation Surface:** Light-mode sidebar uses neutral #f3f4f5, with #e6e8eb hover fill and #e1e3e6 border. The minimal variant uses the same sidebar surface instead of the white content background. The outer shell and exposed titlebar gutter share that sidebar color in both themes, while the inset working canvas stays white in light mode.
- **Header:** Preserve `useScroll({ container: sidebarScrollRef })` and continuous `useTransform` opacity over 0–72px: light 0.5–0.9 and dark 0.2–0.8. Keep the white/zinc utility backgrounds, light extra-small blur, dark small blur, and one-pixel absolute hairline below the header. No header shadow, saturation filter, or gradient refraction overlay.
- **Scroll Bounds:** Preserve the shell's `max-h-dvh` normal bound and `max-h-[calc(100dvh-20px)]` Tauri bound so the sticky header follows its bounded scroll container.
- **Inventory Priorities:** Two equal full-width neutral cards lead the stock workspace, stacking on narrow screens. Amber reorder and violet expiry icon tiles convey their respective operational meaning; the whole card filters the inventory and shows keyboard focus.

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

A neutral theme-card header identifies the workflow above a quiet, opaque reading surface. This component extension is independent of the dashboard's Protocol header rules.

- **Header:** Use one `ModalBanner` for the prominent glass icon, title, short support text, and close control. An optional companion icon may describe a relationship; show status only when it adds meaningful information.
- **Artwork:** Modal headers now use the opaque theme-card surface. Illustrated pseudo-elements, botanical layers, and decorative marks are hidden; do not restore animals or floral backgrounds behind workflow content.
- **Icons:** Default glass tiles are 62px with 19px corners and 32px symbols. Compact tiles are 54px with 17px corners and 29px symbols. Below 640px width or at 700px height and below, default tiles use compact dimensions; already compact tiles become 50px with 16px corners, retaining 29px symbols.
- **Typography and Copy:** Follow the current user-selected app font through `--app-font-heading` and `--app-font-sans`. Titles use the 28px/560 modal role, reducing to 25px for compact or constrained viewports. Support text is 14px/400 with normal tracking, a 1.5 line height, and a 52ch maximum width. Keep copy brief and avoid repeating the title or adding decorative status.
- **Body and Actions:** `FormDialogContent` has 24px corners and a bounded three-row layout. `FormDialogBody` is an opaque `--card` surface that scrolls independently; the header and footer stay visible outside that scroll region. Financial detail dialogs use the same scrollable body. Keep actions in `FormDialogFooter`.
- **Overlay and Dark Theme:** The light overlay is pearl frosted `rgb(244 241 248 / 0.46)` with 7px blur. Dark mode uses `rgb(9 7 16 / 0.5)` with light title and support ink on the neutral header. Theme state is owned solely by `ThemeProvider`; modal styling follows that state.
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

- **Do** preserve gray outer frames and inset theme-card bodies across operational KPI rows.
- **Do** derive semantic tone from the meaning and active value of the signal.
- **Do** pair semantic color with a recognizable icon and explicit label.
- **Do** keep the identity dock inside the anchored sidebar footer band and retain its hairline boundary.
- **Do** preserve light- and dark-theme contrast for borders, text, status badges, and dropdown elevation.
- **Do** fit complete monetary values to available width and retain their currency.
- **Do** keep the ambient mesh behind top content and preserve the continuous Protocol header glass.
- **Do** keep icon-only actions visible on touch layouts and reveal them on keyboard focus as well as hover.
- **Do** provide Enter/Space behavior and a visible focus treatment for interactive records.

### Don't:

- **Don't** add decorative charts or promotional metrics inside operational KPI cards.
- **Don't** use saturated color for quiet or zero-value states.
- **Don't** clip supporting copy or impose the former fixed KPI heights.
- **Don't** restore animals or floral backgrounds behind working content.
- **Don't** scroll the identity dock away with navigation content.
- **Don't** add persistent elevation to the signal cards or sidebar dock.
- **Don't** use native `alert` or `confirm` for clinical, inventory, financial, or access-management operations.
- **Don't** hide a required action behind hover alone.

### Sidebar Readability Refinement

- Shared account footer across sidebar variants: full name wraps naturally without ellipsis, avatar never shrinks, card height expands with content, and a narrow-card container query hides the redundant arrow. Email remains inside the account menu only.
- Navigation labels use 14px type, 20px line height, 450 regular and 550 active weights. Full labels wrap rather than truncate; rows grow from a 44px minimum. Neutral active surfaces retain clear borders and keyboard focus.
- Icon navigation uses centered 44px targets with 26px icons and 8px item gaps, organized beneath the logo rather than floating vertically. Footer controls share 44px targets and 12px corners.

### Classic Dashboard Reporting

- Preserve the four daily KPI frames and the Radiant shell gradient. The dashboard greeting keeps the date and removes the “Cabinet actif” badge.
- Below that row, opaque 14px card surfaces, token hairlines and no decorative glass define reporting. Headings are 15px medium; secondary context is 12px. Blue and turquoise distinguish revenue sources, green distinguishes collected-income activity; status colors retain their semantic meanings.
- The financial section defaults to “Classique”; “Originale” exposes the incumbent financial widget. Both presentations share the existing period/category state, invoice calculations, receivables and pagination. No independent ledger or sample figures are introduced.
- Classic receipts pair fitted volume/collected totals with a source-distribution donut, labeled collection percentage and per-source paid/pending bars. Receivables use a neutral balance summary and four-item paginated invoice list, with an explicit fallback for pending manual entries.
- Activity retains its 14/30/84-day controls and consultation/income measure switch. A fine daily column layer supports the thin curve and subtle area fill; both represent the same actual measure. Planning, paginated priorities and species distribution remain actionable.
- Financial and operational pairs collapse into a single column on smaller screens. Amounts keep their currency inline; charts have keyboard/accessibility layers and no decorative animation.

### Dashboard activity insights
- Preserve the first four KPI cards and the original financial presentation.
- Three equal-width compact analytical panels on desktop: monthly paid cash receipts/expenses with two line/area series, a compact weekday/hour appointment heatmap, and appointment-type distribution. Container queries use two columns below 900px of content width and one below 600px; the two-column layout gives the clinical breakdown a short full-width composition.
- A single heatmap only. Its 12-week/182-day/365-day control also drives the clinical-type breakdown; exclude cancelled/no-show visits, include before 08:00 and after 18:00.
- Financial controls select 3, 6 or 12 months ending with the current month; receipts are the primary amount and expenses a separate secondary row. Heatmap days are rows and hours columns, with a peak-slot summary and clickable detail. Financial series convert repository centimes once, exclude pending/future payments and mark the current month partial.
- Analytical colors follow the supplied widget references: purple for receipts and affluence, amber for expenses, cyan segmented clinical bars. The complete clinical-type inner surface is charcoal, with localized light-text/tooltip/focus tokens; its plot is subtly raised. Cash curves and heatmap tones become lighter in dark mode. Clinical counts and labels remain explicit; full visit types are available through the chart tooltip.
- Analytical cards follow the approved first-row frame: muted outer surface, 5px inset, 16px outer and 12px inner radii, foreground-mixed hairlines and a white/card interior. Compact native selects use an authored chevron and preserve keyboard behavior. Shared 44px heading bands, 90px metric groups, 232px plots and compact contextual footers align the three panels without stretching their bodies. Heatmap cells show the selected slot count in the footer, and the dominant clinical type shares the clinical plot’s period. Internal grid columns use minmax(0,1fr) to prevent overflow. Zero-payment periods render an explicit empty state instead of arbitrary chart-axis ticks.

### Dashboard operational widget finish
- Activity, daily planning, clinical priorities and species distribution share a scoped inset surface and 16px medium headings. Heights follow actual content; grid items align at the top without stretching short lists. Paired layouts collapse below 760px of dashboard content width.
- Planning uses readable time chips and inset appointment rows, retaining patient navigation and explicit cancelled/absent/completed states. Priorities use source icons, semantic tones, a real item range and accessible previous/next controls.
- Species use a semicircular distribution and an explicit count/percentage legend; the central number is the actual patient total, never a synthetic health score. A single species fills the legend width. Activity summaries retain actual averages and active-day counts, with singular/plural labels and a less-than display for nonzero averages below 0.1.
- Plots and charts never animate between filters. Empty datasets get contextual empty states; controls, tooltips, focus, reduced-motion and coarse-pointer behavior remain available in both themes.

### Dashboard interaction polish (Emil design engineering)
- Preserve approved first-row visuals, Radiant background, Protocol glass and existing reporting logic.
- Explicit keyboard focus and disabled states for dashboard controls; mouse-only press feedback uses 120ms transform with cubic-bezier(.23,1,.32,1), gated by hover/fine-pointer. Keyboard actions and reduced-motion preferences have no movement. Coarse-pointer controls use at least 40px targets.
- Improve financial legends and clinical list readability, retain tabular numerals and explicit cancelled/no-show planning labels. Fit the main analytical cash amount with the shared FittedAmount component.
- Analytical controls stay in the heading, date ranges stay in the cash footer, and plot baselines align across all three cards. Heatmap focus remains visible without an unnecessary vertical scrollbar; footer copy stacks naturally at narrow widths.
- UI polish skill was not found under that exact name; the available Impeccable polish guide is the refinement workflow used alongside emil-design-eng.
