# Kalinga UI/UX audit

Audit date: 2026-11-04. Base: `fix/full-stack-audit` (PR #5).
Method: code audit of `src/` (323 files), plus Playwright captures of every routed page. That covered 55 routes across 5 roles (public, patient, responder, logistics, admin), at 1440×900 and 390×844. No page threw a runtime error or overflowed horizontally. The problems below are design, usability and accessibility problems.

Severity: **High** means it blocks or misleads users or fails WCAG A/AA. **Medium** means inconsistency or friction. **Low** means polish.

---

## 1. System-level findings

### 1.1 There is no design system (High)
- `src/index.css` defines only 7 colour tokens. There are no status (critical/warning/success/info), radius, shadow, z-index or font tokens.
- 18 Tailwind colour families are in use:
  - greys from three families: `gray` 2,748 uses, `slate` 851, plus some `neutral`
  - greens from two families: `green` 1,638 and `emerald` 423
- There are 500+ hex literals in JSX and 89 arbitrary colour classes. The brand colours are hard-coded (`#1A4718`, `#004d25`), and there are two near-identical golds (`#f0d003`, `#f2c400`).
- No web font is loaded, even though the CSS names Inter, Montserrat and Poppins, so every OS renders a different system font.
- Type scale:
  - `text-xs` is used about 990 times, `text-[10px]` 67 and `text-[11px]` 52
  - semibold, bold and medium are used almost equally, so there is no clear hierarchy
- About 11,000 lines of legacy hand-written CSS sit in `src/styles/*`, mostly for the responder area. 9 of those files are never imported. `personnel-style.css` alone is 2,766 lines.

### 1.2 There are no shared components (High)
- `src/components/ui/` contains only the toast.
- `Button`, `Card` and `Badge` are redefined in 5–7 feature files. `Allocation.jsx` alone defines a modal plus TabButton, Badge, Card, Button, StatusBadge and CapabilityBadge.
- There are 22 `*Modal` components and about 40 hand-rolled `fixed inset-0` overlays, using three different styling systems.
- There are 32 hand-written tables. 188 inline `style={{}}` uses.
- Two icon libraries are in use: lucide-react in 124 files and react-icons in 9.

### 1.3 Global CSS hacks (High)
- `#root { text-align: center }` centres all text in the app. Every card, KPI and heading has to fight it, which is why the logistics and admin dashboards mix centred and left-aligned blocks.
- `html { font-size: 80% }` below 768px shrinks all text and spacing on phones. The 12px `text-xs` becomes 9.6px.
- The `button` utility has a leftover purple hover glow. The `theme-color` is white, while the brand is green.

### 1.4 Layout and navigation are fragmented (High)
- There are four sidebar implementations: patient, responder, logistics, and a dead legacy one. There are also two top bars and two footers.
- The patient and logistics pages build their own shell inline on each page.
- Each role's navigation looks different:
  - The patient sidebar has icons.
  - The responder and logistics sidebars have no icons, and use solid ▼ triangles for sub-menus.
  - Admin is a different design system altogether.
- The logo appears twice on every page: once in the sidebar and again in the top bar.
- On mobile, the "sidebar" is a floating green button that opens a dropdown. It is not a drawer, there is no bottom navigation, and the search box takes a full row.
- Admin switches sections in local state, so they have no URL. Refresh, back navigation, bookmarks and deep links don't work.
- On the public pages, the "Our Doctors" link points to a removed section (`#doctors`). The quicklink pages use the logged-in navbar.

### 1.5 Dark mode only works in admin (Medium)
- Only the admin layout toggles `.dark`. `ThemeToggle.jsx` exists but is unused.
- 18 files contain `dark:` variants, so the other roles stay light even when the toggle is on.

### 1.6 Feedback and states are inconsistent (High)
- The app uses 140 `alert()`, 15 `confirm()` and 1 `prompt()` calls, even though a toast system is mounted.
- Three loading styles are mixed: spinners (128), skeletons (70) and plain "Loading…" text.
- About 48 differently styled empty states. Empty tables still render their full dark header row (patient dashboard).
- Errors are plain red text, for example "Weather data unavailable." on the patient dashboard. Admin shows raw `NaNm` values when data is missing (Response SLA card).

### 1.7 Accessibility (High; WCAG 2.2 A/AA)
- **Missing labels:** about 48 icon-only buttons have no accessible name. There are 117 clickable `div`/`span`/`tr` elements with no role or keyboard support.
- **Forms:** 268 inputs, but only 25 `htmlFor`. Placeholders are used as labels, there are no required markers, and there are 0 `aria-invalid` or `aria-describedby` attributes.
- **Dialogs:** only 2 of about 40 have `role="dialog"`, and only 2 close on Escape. None trap focus.
- **Focus:** 93 `outline-none` against only 4 `focus-visible` styles, so keyboard focus is invisible in most of the app.
- **Contrast:** there is low-contrast small text, e.g. `text-gray-400` on white, about 130 uses.
- **Motion:** there is no `prefers-reduced-motion` handling anywhere.
  - framer-motion drives about 118 animations.
  - The landing page sections stay invisible until a scroll animation fires, so content is hidden if it doesn't run.

### 1.8 Copy (Medium)
- Casing is mixed: "Logout" (62) / "Log Out" (11) / "Log out" (5), and "Login" / "Sign In" / "Sign in".
- The login page says both "Log In" and "Sign In".
- All-caps headings appear in several places: dates ("NOVEMBER 4, 2026"), "RECOMMENDED VEHICLE" and "RESERVATION SUCCESSFUL".
- Demo artefacts are visible to users:
  - "Demo" badges in admin
  - "Demo Mode:" banners
  - `DEMO_NOTIFICATIONS`
  - "Coming soon – Real-time tracking"
  - the response-mode demo panel

---

## 2. Per-role findings (from screenshots)

### Public and auth
- **Landing:** below the hero, the About, Mission and Contact sections render blank until a scroll-triggered animation fires (High). The navbar link "Our Doctors" is dead.
- **Login:**
  - Content is centred because of the global hack.
  - The wordmark uses a lime-to-green gradient that doesn't match the logo.
  - The page heading says "Log In" but the button says "Sign In".
  - "Create an Account" looks like plain text rather than a button.
- **Footer:** the social icons have no labels. There are two different KALINGA wordmark gradients (gold-to-green and lime-to-green).

### Patient
- **Duplicate emergency entry points:** the sidebar "EMERGENCY SOS" button plus a floating red FAB. That is fine on mobile, but on desktop it is noise.
- The sidebar uses a heavy dark-to-bright green gradient, and its icons and text weights are inconsistent.
- Empty dashboard tables show their full dark header with a single "No … found" row, which wastes space and isn't useful.
- **Mobile:** the search box takes its own row, the menu is a floating button, and there is no bottom navigation.

### Responder
- **Active incident shown twice:** an "Active response" card in the sidebar and a banner across the top.
- The dashboard date is an all-caps headline. The filter selects don't line up, with one narrow and one full width.
- The "Health Responders" chart title collides with its "11 Total" label. Chart colours are raw gold and green with no semantic meaning.
- The sidebar has no icons, and solid triangles mark sub-menus.
- The heavy legacy CSS (`personnel-style.css` and others) makes the responder area look different from every other role.

### Logistics
- **Dashboard:**
  - The KPI cards are all centred and have uneven heights.
  - The page title is a huge centred banner with tabs inside it.
  - Icons sit on their own line above the text they label ("0 Shipments Dispatched").
- The sidebar has no icons. "Resource Overview" uses a 20-colour ring that can't be read.
- `Allocation.jsx` (3,458 lines) and `LogisticsAssignment.jsx` carry their own Button, Card and Modal components and use all-caps labels.

### Admin
- The visual system (shadcn-like) is the most modern in the app, but:
  - every sidebar item has a 2–3 line description, so the navigation is very long and noisy
  - the eyebrow labels ("ADMIN CONSOLE", "CURRENT VIEW", "TIME WINDOW") use wide-tracked 10px caps
  - some headings are centred ("Command Center Dashboard", "System Incidents") and others are left-aligned
  - `NaNm` values appear in the Response SLA card when there is no data
  - the "Incident Signal Trend" bars are grey and carry no meaning

---

## 3. Redesign direction (decided with the product owner)
- **Refine the Kalinga brand:** a single deep-green brand scale with a single gold accent, slate neutrals, and semantic status colours. Inter Variable, self-hosted. Clear type hierarchy, with body text never below 12px.
- **Light and dark themes for every role**, from one token set.
- **One shared component set** (`src/components/ui/`) built on Radix primitives, so dialogs, menus, tabs and tooltips are accessible by default.
- **One app shell for every role:**
  - a sidebar with icons on desktop
  - a drawer plus bottom navigation on mobile
  - URL-addressable admin sections
- **One way to give feedback:** toasts, confirm dialogs, skeletons, empty states and error states, all shared.
- **WCAG 2.2 AA as the target:** checked with axe in both themes.

The implementation follows the phased plan. Results and before/after screenshots will be added to the end of this document.
