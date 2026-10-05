---
name: Baitari
description: Quiet, precise veterinary operations on white and charcoal surfaces.
colors:
  canvas: "#fafafa"
  canvas-dark: "#161616"
  frame: "#f3f3f5"
  frame-dark: "#171717"
  surface: "#ffffff"
  surface-dark: "#1b1d20"
  surface-raised: "#ffffff"
  surface-raised-dark: "#222222"
  ink: "#202124"
  ink-dark: "#f9fbff"
  ink-muted: "#63656a"
  ink-muted-dark: "#a4a4a4"
  ink-faint: "#696b71"
  ink-faint-dark: "#989898"
  hairline: "#e3e3e6"
  hairline-dark: "#303030"
  primary: "#4124fb"
  primary-dark: "#4124fb"
  primary-foreground: "#ffffff"
  primary-foreground-dark: "#f9fbff"
  secondary: "#ffffff"
  secondary-dark: "#1e1e1e"
  secondary-foreground: "#202124"
  secondary-foreground-dark: "#f9fbff"
  atmosphere-pearl: "#fff1be"
  atmosphere-rose: "#ee87cb"
  atmosphere-violet: "#b060ff"
  card: "var(--surface)"
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
  sidebar-hover-light: "#eeeeef"
  sidebar-hover-dark: "#2a2a2a"
  signal-critical: "#f43f5e"
  signal-critical-dark: "#fb7185"
  signal-watch: "#f59e0b"
  signal-watch-dark: "#fcd34d"
  signal-positive: "#10b981"
  signal-positive-dark: "#34d399"
  signal-quiet: "#696b71"
  signal-quiet-dark: "#63656a"
typography:
  landing-ui:
    fontFamily: "Manrope, Arial, sans-serif"
    fontWeight: 400
    scope: "Baitari marketing landing and teaser captions only; application UI and body default to Geist through the appearance configuration"
  landing-display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontWeight: 400
    scope: "Marketing headings, roman and italic; matches the user-approved Aurora direction"
  display:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  heading:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5385
  ui:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  title:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2308
  signal-value:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  daily-value:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  label:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
  supporting:
    fontFamily: "Geist Variable, Inter Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4545
  insight-heading:
    fontFamily: "var(--app-font-heading)"
    fontWeight: 500
    letterSpacing: "-0.015em"
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
  shell: "24px"
  body: "12px"
  control: "10px"
  mode-segment: "7px"
  input: "20px"
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
  unit: "4px"
  panel-inset: "4px"
  control-gap: "8px"
  row-gap: "12px"
  panel-body: "20px"
  section-gap: "24px"
  page-inline: "16px"
  page-block: "32px"
  frame-inset: "5px"
  signal-body-x: "12px"
  card-gap: "12px"
  card-compact: "16px"
  card-default: "20px"
  footer-band-y: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-foreground-dark}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  button-quiet:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "4px 10px"
    height: "32px"
  app-panel:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
  app-panel-body:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.body}"
    padding: "{spacing.panel-body}"
  dashboard-mode:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "{spacing.unit}"
    height: "40px"
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

The approved application system uses an off-white canvas, gray frames, inset white surfaces, and charcoal equivalents in dark mode. Geist Variable is the default across application UI, body, headings, and tabular KPI values through the configurable application font. The CRM-inspired trial uses illuminated violet primary controls on neutral working surfaces. The chosen Opaline atmosphere remains behind the top content, alongside the dashboard's greeting and selected avatars. The Protocol glass header retains its independent scroll behavior. Animals and floral illustrations do not sit behind working surfaces.

The dashboard preserves familiar work: Vue classique is first and is the default, while Journée clinique is an optional clinical operating view. Both use the same patient and financial data. This application extension preserves the separate Manrope and Instrument Serif typography of the approved marketing landing and teaser direction.

**Key Characteristics:**

- Four coordinated operational signals in gray frames with inset theme-card bodies.
- Semantic state communicated by icon, text, and color together.
- A sidebar footer band that stays visually anchored while navigation content scrolls independently.
- Fine separators, restrained hover states, and theme-aware neutral surfaces.
- Concise operational page titles without emoji or promotional name gradients outside the dashboard.
- Familiar classic reporting with an optional patient-first Clinical Bento hierarchy.
- Independent widget loading, local recovery, and discreet confirmation of saved work.

## Colors

The frontmatter records the exact light-theme roles and their `-dark` counterparts from `src/design-system/tokens.css`; `.dark` swaps the live CSS variables. `background`, `card`, `popover`, `muted`, `foreground`, and `border` remain aliases of canvas, surface, raised surface, frame, ink, and hairline. The sidebar uses the same frame, ink, raised-surface hover, and hairline roles through `src/index.css`. Clinical signal colors are reserved for meaning.

### Primary

- **CRM Violet Action:** Primary actions use the same saturated violet in both themes, paired with light action ink. The violet appearance is the default; later accent choices remain configurable.
- **Clinical Positive:** Marks clearly favorable states such as completed work, collected funds, or an active team.

### Secondary

- **Neutral Secondary:** Secondary actions use a neutral surface, border, and theme ink. Informational charts and clinical states retain their separately scoped semantic colors.

### Tertiary

- **Clinical Critical:** Marks active urgency, shortage, follow-up, alert, or access-review conditions.
- **Clinical Watch:** Marks active items that require monitoring without implying critical urgency.

### Neutral

- **Quiet Signal:** The default for informational or inactive states.
- **Canvas, Frame, Surface, and Raised Surface:** The canvas supports the workspace; the frame groups inset content; the surface carries readable data; raised surfaces separate transient or selected controls. Dark mode preserves these distinctions in neutral charcoal.
- **Ink, Muted Ink, Faint Ink, and Hairline:** Primary reading, supporting context, quiet details, and structural separation retain distinct theme-bound roles.
- **Opaline Pearl, Rose, and Violet:** The active top-content atmosphere follows the implemented Radiant gradient. These colors are atmosphere, never status or KPI fills.
- **Ambient Sage and Ambient Blue:** Low-opacity mesh colors behind the top content only, with darker theme counterparts. These are atmosphere, never status or KPI fills.

### Named Rules

**The Meaning Before Color Rule.** Never communicate a clinical state with color alone; pair it with a distinct icon and written badge.

**The Active Alert Rule.** Critical and watch colors appear only when the associated numeric signal is active. A zero or inactive condition returns to the quiet treatment.

## Typography

**Application Display and Heading Font:** Geist Variable (with Inter Variable and sans-serif fallbacks)

**Application UI and Body Font:** Geist Variable by default (with Inter Variable and sans-serif fallbacks); the appearance setting controls the application sans family.

**Marketing Fonts:** Manrope for landing UI and teaser captions; Instrument Serif for approved roman and italic marketing headings.

**Character:** Compact and highly legible, with Geist carrying the default interface as well as the heading and numeric hierarchy. Application screens do not use a serif. Marketing retains its own approved pairing.

### Hierarchy

- **Display:** The current patient in the clinical Now board uses the Geist display role (28px, medium, tight tracking).
- **Heading:** Clinical module headings use Geist (16px, medium, 24px line height); smaller supporting headings use the same display family.
- **Title:** The configured application font supplies medium-weight, compact signal labels that may wrap to two lines without changing card alignment.
- **Signal Value:** Geist tabular numerals with tight tracking form the primary scan target. The recorded size is a fitting ceiling: operational values use the signal-value role, daily dashboard amounts the daily-value role, and compact clinical stats use 28px. Values shrink to their measured available width.
- **Body and UI:** The configured application font uses readable 13px text with a 20px line height in patient context; controls use medium weight, with 12px supporting labels and 11px local context where space is compact.
- **Amount Fitting:** Keep the full amount and currency together. `FittedAmount` measures the actual text using the active font, responds to container resizing and font readiness, and adjusts the font size; it does not abbreviate or clip monetary values.
- **Status Label:** Small, medium-weight text sits in a compact rounded rectangle beside a state icon.
- **Supporting Text:** Muted context wraps inside the inset body beside the semantic badge.

### Named Rules

**The Stable Numeral Rule.** Operational values use tabular numerals so changing counts do not create visual jitter.

**The Application Type Rule.** Default to Geist Variable for the application UI, body, headings, and KPI values. UI and body follow the appearance font setting; headings and KPI values retain Geist. Keep the approved marketing typography scoped to landing and teaser work.

## Layout

The shared application rhythm follows a 4px base: 8px control gaps, 12px row and paired-module gaps, 16px mobile page insets, 20px module bodies, 24px section gaps, and 32px dashboard top/bottom spacing. The new Panel uses a 4px frame inset; the incumbent operational KPI frame retains its 5px exception. The dashboard has 16px horizontal insets, increasing to 24px at the large breakpoint.

The optional Clinical Bento defaults to Now, then day and priority actions, then patient follow-up and cash, then interactive trends open by default. Its Now board separates patient context from the waiting room at 1024px; patient and cash modules become two columns at the same breakpoint. Day/actions become a 1.65-to-1 pair at 1280px, with a 300px minimum for the action column. Smaller widths stack content in reading order. Modules follow their content height; short lists do not stretch to imitate analytics cards. Custom layout editing persists independently for the two dashboard modes.

Clinical signals use four equal columns with a 12px gap, changing to two columns when their container is at most 900px wide and one column at 400px. The dashboard daily row uses four columns and two when its container is at most 740px. Responsive behavior follows the actual working width inside the sidebar shell.

Each signal has a gray title frame and an inset theme-card body. Supporting copy can wrap and the footer can grow; do not enforce the former fixed card heights or truncate required context. Maintain equal columns, readable values, and the shared frame anatomy.

The non-dashboard page stage uses one compact vertical rhythm: page title, four signals, then the primary work surface. Avoid adding a second large top offset inside page components because the shell already owns the global header spacing.

The sidebar uses a non-scrolling header, an independently scrolling content region, and a shrink-resistant footer at the bottom. The footer retains the same edge-to-edge band and vertical padding in expanded and collapsed states; only its internal presentation changes.

## Elevation & Depth

The shared application uses tonal nesting and hairlines for persistent panels. A Panel has a frame, inset body, and hairline ring; Surface uses the light/dark `elev-card` token, while transient raised surfaces can use `elev-float`. The source token shadows and their theme variants are recorded in the sidecar. Signal cards retain their gray outer framing, inset bodies, and fine borders; the clinical footer carries only a faint contact shadow and daily cards strengthen the border on hover. The identity dropdown uses an ambient shadow to separate a transient menu from the sidebar without lifting the persistent dock.

### Named Rules

**The Flat Signal Rule.** Operational signal cards derive hierarchy from the gray frame and inset body. Preserve the separately pinned first-row KPI hover treatment from AGENTS.md; do not generalize its grid and gradient layers to other operational surfaces.

## Shapes

The shared application scale uses 24px shells, 16px panels, 12px inset bodies, and 10px controls. Mode selector segments use 7px corners inside a 10px group. Clinical and daily KPI frames retain their incumbent 14px corners and 10px bodies; their compact status labels retain the local rectangular treatment. The shared Input currently follows its library radius (20px), rather than the new control role. Dropdown panels retain 16px corners, the identity trigger retains 14px corners, and account avatars remain circular. Patient portraits use 10px corners and preserve chosen images. Borders and one-pixel hairlines carry structural separation.

## Components

### Shared Application Primitives

- **Buttons:** The shared primary action uses violet with light ink and inset illuminated depth; secondary actions remain neutral and bordered. The default shared Button is 30px tall with pill corners, 12px horizontal padding, 12px medium text, and 6px icon gaps. Its 32px large variant and 32px square icon variant share the same material. Shared defaults and widget actions retain their compact 30px size; page-header actions in the dashboard, patients, agenda, finances, and stock views explicitly use 40px height and 14px type. No global pointer-based size cap overrides these scoped choices. Icon controls and coarse-pointer target overrides retain their scoped sizes. Hover reduces the primary fill to 90% opacity; focus uses a visible three-pixel ring; press scales to 0.97 except popup triggers. Disabled controls reduce opacity and ignore pointer actions. The premium variant uses the same primary material.
- **Panel and Surface:** Panel groups a 4px gray frame around a 12px inset body, normally with 20px body padding and a hairline ring. Surface is a 16px surface-colored card using the shared card elevation. Widget titles use the Geist heading role and supporting copy uses the configured application font.
- **Signals:** Critical, watch, positive, quiet, and information badges use a low-opacity semantic fill with a written label and optional 1.5px icon. Keep text readable in both themes; the local pastel table and KPI badges retain their established rectangle variants.
- **Inputs:** The shared input is 32px tall, uses quiet border and muted placeholder ink, and shows its focus border and ring. Invalid and disabled states remain explicit. Preserve native input and select keyboard behavior.
- **Icons and portraits:** Hugeicons uses 1.5px strokes; veterinary SVGs extend the free catalog for missing species. Retain the user-selected account and patient avatars and the dashboard's chosen greeting.
- **Motion:** Shared quick states use 150ms, standard transitions 220ms, and the `cubic-bezier(0.2, 0, 0, 1)` ease-out. The theme control crossfades its sun/moon icon with the source's 300ms zero-bounce spring; reduced motion uses a 150ms opacity transition. Existing component-specific timings remain scoped to their components.

### CRM Appearance Trial

The approved reference is the local sales CRM at `/Users/zohir/Desktop/kargul/CRm/sales-crm`. The application adopts its violet actions, Geist interface, illuminated inset button depth, neutral table interaction, and charcoal dark surfaces. Dark hairlines are slightly stronger than the reference for separation. Marketing typography, the continuous Protocol header glass, pinned first-row KPI hover layers, and the classic dashboard default retain their established scope.

A one-time `baitari-crm-geist-trial-v1` appearance migration sets the saved accent to violet and the saved UI font to Geist while retaining other saved settings. Once the migration is recorded, later user accent and font choices persist.

Shared tables use a neutral canvas header, normal-weight 12px muted header labels, 44px header height, and 16px horizontal cell padding. Rows use neutral muted hover, focus-within, expanded, and selected fills with subtle separators; primary violet is reserved for actions rather than row selection.

Shared success, warning, and vibrant badges use pale bordered green, orange, and violet treatments respectively, with darker theme-specific fills and lighter readable ink. Sidebar primary surfaces use the neutral frame, hover/active accents use the recorded neutral light/dark sidebar roles, labels use theme ink, and sidebar focus uses muted ink independently of the selected action accent. ActionButton follows the same compact 30px height and 12px type. The dashboard greeting’s Nouvelle consultation action uses 40px height, 14px type, and 20px inline padding; its customization icon uses a compact 30px target. Violet remains the action material.

The shell header places a compact 30px search icon on the right; its other existing icons retain their 36px targets. Aide et support lives in the account dropdown alongside settings and retains the help route. The Clinical Now board uses the shared 30px Button with 12px type: violet primary and neutral secondary actions.

Command search owns focus at the rounded InputGroup: a two-pixel ring at 15% opacity, half-opacity focus border, and neutral fill change. Only the command input suppresses its own native outline and box shadow; preserve focus treatments on other inputs. Primary button depth uses the refined, lighter contact and inset illumination recorded in the sidecar.

Source verification covers the live token, Button, Badge, Table, theme-store, and scoped header-control implementations. Six browser captures and checks are recorded under `outputs/crm-geist-2026-10-04` with no browser errors. Native Tauri rendering has not been verified for this trial.

### Compact List Controls

Reusable list filters are 30px rounded controls with a muted label, vertical separator, selected value, and compact chevron. Menus expose controlled radio choices, close after selection, and constrain their width to the viewport. The shared rounded 30px search uses an accessible label, search icon, conditional clear action, and a soft two-pixel focus ring.

These controls serve patient species/status, finance invoice and journal filters/date, dashboard source/date, stock category/state, and task/team search. Keep explicit page actions at their documented size; compact filters retain their own density.

### Dashboard Modes and Clinical Bento

- **Shared visit flow:** Classic and clinical dashboards reuse VisitFlowBoard. Two independent inset frames separate the main Prise en charge widget, with current patient context and appointment-state progression, from the waiting queue and completed/remaining day progress widget. Desktop uses a 1.45-to-1 pair with a 14px gap; working widths at or below 760px stack the widgets. Compact content spacing avoids stretching the patient block or filling spare space with decoration. Both visit widgets match the other operational widget contours: a 5px muted frame, one-pixel outer frame line, 16px outer corners, and a one-pixel inner line around 12px inner corners, without an outer shadow. Neutral recorded allergy descriptions meaning none do not receive a red warning treatment. The patient identity uses the existing species glyph in a neutral bordered icon tile. Identity sits left and the planned time uses 24px type at right with its lateness label. Actual visit type, room, and reason occupy a context band separated by hairlines; progression steps spread across the available width. At working widths at or below 480px, time wraps beneath the identity. Busy state prevents duplicate progression; an empty day explains the absence of visits and offers planning rather than synthetic activity.
- **Clinical planning:** State filters and pagination keep the appointment list compact, while visible status actions preserve arrival/start/completion work. Priority task actions retain busy feedback and undo. Patient follow-up derives its segmented state summary and rows from actual patient and hospitalization records.
- **Clinical cash:** The shared compact period filter offers Jour, Semaine, Mois, 90 jours, and Année for paid movements. Outstanding receivables retain their explicitly labelled all-date scope. Clinical workspace styles use scoped, theme-aware surfaces and state colors while preserving Geist, violet actions, and the Protocol shell.


- **Choice:** The selector lists Vue classique first, then Journée clinique. Classic is the default when no valid setting is present. Selection is immediate and persists through `dashboard.version`; a failed setting write restores the previous selection and offers Réessayer. Keep both options visible and expose their pressed state to assistive technology.
- **Now:** Name the patient, owner, species, reason, timing, and known allergies before the next action. The primary action marks arrival, starts, or resumes the consultation; Dossier opens a patient Sheet while preserving dashboard context. The waiting room shows real patients and explicit timing, with an Agenda action. Empty days offer a real planning action.
- **Day and actions:** The day module provides date navigation and the current appointment list, with explicit status and one-click progression. Priority filters cover all items, stock, vaccines, tasks, and appointments. Completing a task offers Annuler for five seconds; busy rows prevent duplicate writes.
- **Patients and cash:** Patient follow-up distinguishes under-treatment and hospitalized counts and links real records. Cash provides today/month/90-day periods, collected amounts, waiting amounts and actual receivables, with a Finances action. Keep full amounts and currencies visible.
- **Trends:** Start open with accessible expansion controls. Interactive 30/90-day consultation activity and procedure distribution expose real values; absent data gets a contextual empty state. This hierarchy belongs to the optional clinical dashboard, not every application page.
- **Entry:** Clinical dashboard rows enter once per browser session, with 100ms between row groups and a 220ms ease-out fade/4px displacement. Reduced motion removes displacement. Revisiting the view does not replay the entry.

### Widget Loading and Saved Work

- **Independent loading:** Each widget owns the repositories it actually needs. Now and day depend on appointments, patients and owners; actions on tasks, stock, vaccinations, appointments and patients; patient follow-up on patients, hospitalizations and owners; cash on transactions and invoices; trends on appointments. A loading or failed source affects its dependent widget and leaves ready widgets available.
- **Classic coverage:** `ClassicWidgetState` wraps daily KPIs, finance, activity, planning, priorities, patient distribution and each insight panel. Patient counts use patient state, appointment KPIs and planning use schedule state, payment KPIs and cash insights use transaction state, activity uses appointments plus transactions, and appointment heatmap/type insights use appointment state. The classic page has no aggregate loading gate.
- **Skeleton timing:** Reserve the local layout immediately, reveal the skeleton after 150ms, and keep a revealed skeleton visible for at least 300ms. The local shell exposes `aria-busy` or a loading status and avoids briefly showing zero-value data while sources are pending. Skeleton pulse is 1.6s; reduced motion disables it.
- **Recovery:** Show the failed widget's contextual error and Réessayer action in place. Retry refreshes that widget's dependencies; it does not blank the full dashboard. Empty, loading, and failed states have distinct copy and behavior.
- **Warm reads and writes:** Shared repository snapshots remain visible during background revalidation. Native SQLite writes patch the visible row immediately, commit the authoritative row on success, and roll back only the failed optimistic layer while retaining subsequent work. Failures offer an explicit retry. Do not replace the page with a spinner or reread the full table after each write.
- **Confirmation:** The application header reserves a stable 112px save-status slot. It reports Enregistrement…, Enregistré for three seconds after success, or Non enregistré after failure, with an icon and polite live region. Row save flashes use a brief primary tint (1.2s) without moving the list. Patient intent prefetch waits 120ms and cancels when intent leaves.

Implementation sources: `src/design-system/`, `src/modules/dashboard/pages/dashboard-page.tsx`, `src/modules/dashboard/components/clinical/`, `src/modules/dashboard/components/classic-widget-state.tsx`, `src/modules/dashboard/v2/studio-dashboard.tsx`, `src/modules/dashboard/v2/dashboard-insights.tsx`, `src/hooks/useDelayedSkeleton.ts`, `src/hooks/useSQLite.ts`, and `src/hooks/useSaveIndicator.ts`.

Source verification limit: the approved Geist heading/KPI roles are normative, but some inherited classic value classes still rely on the body font rather than explicitly binding the display family. The pinned first-row hover treatment remains a user contract from AGENTS.md; this documentation pass does not claim that its full layer stack is present in the sampled classic source. These inherited differences are not new system rules.

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
- **Pinned first-row KPI exception:** AGENTS.md retains the Protocol layered hover contract: a skewed SVG grid, radial-mask mint-to-cream gradient, overlay-blended grid, and inset ring behind the card, with pointer-transparent layers and 300ms opacity transitions. Keep this exception scoped to the first-row KPI treatment; it is not a general panel style.
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
- **Do** default to Geist across application UI/body, headings, and tabular KPI values while preserving user font choices and the marketing font scope.
- **Do** keep Vue classique first and default, and persist the user's dashboard choice.
- **Do** reserve skeleton space per widget, use the 150ms delay/300ms minimum, and provide a local retry.
- **Do** retain ready data during revalidation and show optimistic write, rollback, and header save feedback.

### Don't:

- **Don't** add decorative charts or promotional metrics inside operational KPI cards.
- **Don't** use saturated color for quiet or zero-value states.
- **Don't** clip supporting copy or impose the former fixed KPI heights.
- **Don't** restore animals or floral backgrounds behind working content.
- **Don't** scroll the identity dock away with navigation content.
- **Don't** add persistent elevation to the signal cards or sidebar dock.
- **Don't** use native `alert` or `confirm` for clinical, inventory, financial, or access-management operations.
- **Don't** hide a required action behind hover alone.
- **Don't** gate the whole dashboard on an unrelated widget dependency or show a loading source as an empty clinical result.
- **Don't** apply the optional clinical hierarchy to every page.

### Sidebar Readability Refinement

- Shared account footer across sidebar variants: full name wraps naturally without ellipsis, avatar never shrinks, card height expands with content, and a narrow-card container query hides the redundant arrow. Email remains inside the account menu only.
- Navigation labels use 14px type, 20px line height, 450 regular and 550 active weights. Full labels wrap rather than truncate; rows grow from a 44px minimum. Neutral active surfaces retain clear borders and keyboard focus.
- Icon navigation uses centered 44px targets with 26px icons and 8px item gaps, organized beneath the logo rather than floating vertically. Footer controls share 44px targets and 12px corners.

### Daily KPI Data Views

The first four dashboard KPI bodies reserve equal 64px visual slots beneath their main values: violet visit bars, a green paid-income line/area in DA, a segmented species distribution, and paid/pending receipt progress. Each card independently offers Jour, Semaine, Mois, Année, and Tout. Consultations and income default to Jour; patients and receivables default to Tout. Patient periods filter creation dates and change the title to Nouveaux patients. Receivable periods filter issue dates; Tout retains older outstanding debts.

À encaisser uses the issued-invoice cache and shared financial overview, including eligible manual entries and actual credited/partial balances. Migrated or projected billing rows do not duplicate the receivable balance. Its invoice loading and error state remain explicit.

Mini-chart context uses seven days for Jour and Semaine, weekly buckets for Mois, and twelve monthly buckets for Année. Tout totals cover all dates while their trend charts explicitly caption the current year. Views use actual application data: zero days remain at baseline and empty progress never invents a target or activity.

Pointer inspection reveals the nearest chart bucket with its date and value, a guideline, highlighted point or bar, and DA units for income. Segment inspection reveals the species or receipt state, value, and share. Focus and arrow keys provide equivalent inspection; Escape dismisses it. Card bodies are containers, with navigation owned by the footer button so period controls and charts are not nested inside a clickable card. Preserve the established frames, hover layers, and main-value hierarchy around these approved additions.

### Classic Dashboard Reporting

- Preserve the four daily KPI frames and the Radiant shell gradient. The dashboard greeting keeps the date and removes the “Cabinet actif” badge.
- Below that row, opaque 14px card surfaces, token hairlines and no decorative glass define reporting. Headings are 15px medium; secondary context is 12px. Blue and turquoise distinguish revenue sources, green distinguishes collected-income activity; status colors retain their semantic meanings.
- The financial section defaults to “Classique”; “Originale” exposes the incumbent financial widget. Both presentations share the existing period/category state, invoice calculations, receivables and pagination. No independent ledger or sample figures are introduced.
- Classic receipts pair fitted volume/collected totals with a source-distribution donut, labeled collection percentage and per-source paid/pending bars. Receivables use a neutral balance summary and four-item paginated invoice list, with an explicit fallback for pending manual entries.
- Activity retains its 14/30/84-day controls and consultation/income measure switch. A fine daily column layer supports the thin curve and subtle area fill; both represent the same actual measure. Planning, paginated priorities and species distribution remain actionable.
- Financial and operational pairs collapse into a single column on smaller screens. Amounts keep their currency inline; charts have keyboard/accessibility layers and no decorative animation.

### Dashboard activity insights
- The analytical insight panels receive the scoped refinement informed by the three inspected Kargul projects: token border, light inset illumination, and medium-weight headings with slightly tightened tracking. This refinement retains the pinned first KPI row.
- Preserve the first four KPI cards and the original financial presentation.
- Three equal-width compact analytical panels on desktop: monthly paid cash receipts/expenses with two line/area series, a compact weekday/hour appointment heatmap, and appointment-type distribution. Container queries use two columns below 900px of content width and one below 600px; the two-column layout gives the clinical breakdown a short full-width composition.
- A single heatmap only. Its 12-week/182-day/365-day control also drives the clinical-type breakdown; exclude cancelled/no-show visits, include before 08:00 and after 18:00.
- Financial controls select 3, 6 or 12 months ending with the current month; receipts are the primary amount and expenses a separate secondary row. Heatmap days are rows and hours columns, with a peak-slot summary and clickable detail. Financial series convert repository centimes once, exclude pending/future payments and mark the current month partial.
- Analytical colors follow the supplied widget references: purple for receipts and affluence, amber for expenses, cyan segmented clinical bars. The complete clinical-type inner surface is charcoal, with localized light-text/tooltip/focus tokens; its plot is subtly raised. Cash curves and heatmap tones become lighter in dark mode. Clinical counts and labels remain explicit; full visit types are available through the chart tooltip.
- Analytical cards follow the approved first-row frame: muted outer surface, 5px inset, 16px outer and 12px inner radii, foreground-mixed hairlines and a white/card interior. Compact native selects use an authored chevron and preserve keyboard behavior. Shared 36px heading bands, compact metric groups, 216px plots, and separated footers with a 54px minimum height align the three panels without stretching their bodies. Heatmap cells show the selected slot count in the footer, and the dominant clinical type shares the clinical plot’s period. Internal grid columns use minmax(0,1fr) to prevent overflow. Zero-payment periods render an explicit empty state instead of arbitrary chart-axis ticks.

### Dashboard operational widget finish
- Below the first KPI row, finance totals use 12px vertical padding and the settlement ring is capped at 152px. Receivables and short lists follow content height; do not stretch them to match a taller neighbor.
- Activity uses a 180px chart within its inset plot and compact inline footer metrics. Patient distribution uses a 142px semicircle chart, centered at y=120 with 80px inner and 100px outer radii, alongside a flat, separated count-and-percentage legend.
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
