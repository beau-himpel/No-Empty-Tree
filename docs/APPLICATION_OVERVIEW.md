# No Empty Tree — Application Overview

This document describes the purpose, workflows, and UI structure of the No Empty Tree
application. It is written as context for future work (especially UI refinement), to be
read alongside screenshots of the running app.

## Purpose and use case

No Empty Tree is a small charity web app for **Christmas gift adoption**. Families in
need are entered into the system ("nominated"), each family member has a wish list, and
donors ("adopters") browse the families and commit to buying specific gifts — or entire
family wish lists — so that no family has an empty tree on Christmas.

Key facts that shape the design:

- **Seasonal**: the app is actively used only around November–December each year. It sits
  idle the rest of the year.
- **Small, local audience**: users are community members/donors, generally
  non-technical, and likely to visit on their phones. Mobile usability matters.
- **Trust-based**: any signed-in user can see family details (last name, member first
  names/ages) and adopt items. There is no admin role in the UI; family data entry
  (nomination) is a feature that can be toggled on/off.

## User workflow (happy path)

1. **Landing / sign-in** — An unauthenticated visitor sees a hero landing page: the
   "No Empty Tree" title (indigo→purple gradient text), the tagline *"Helping those in
   need experience the holiday magic"*, and a sign-in card with email/password fields, a
   toggle to a sign-up form, and a "Continue with Google" button.
2. **Sign-up (first-time users)** — Collects name, email, password (min 6 chars). Name is
   stored in Supabase user metadata / a `profiles` table and later displayed as
   "Adopted by {name}" on items. Email signups may require email confirmation
   (redirects back via `/auth/callback`).
3. **After sign-in** — The user lands on **Adopt Families**. The app shell appears: a
   sticky white top bar (tree logo + "No Empty Tree", log out), desktop nav links, and on
   phones a bottom tab bar (Families / My Adoptions, plus Nominate when enabled). Token
   refreshes and page reloads keep the user on their current page.
4. **Adopt Families page** (`/adopt-family`) — A hero number ("N gifts still need a home")
   with overall progress, then a divided list of families: "Need gifts" first, "Fully
   adopted" below. Grouping is decided once per page load so rows never move while
   someone is adopting. Each row shows the family name, a member summary, a mini progress
   bar, and "N left of M gifts". Tapping a row expands its details inline (animated); the
   open row's header sticks under the top bar, and switching families keeps the tapped row
   in place. On mobile the opened row scrolls to the top once it has expanded.
5. **Family details** — An "Adopt all N gifts" / "Adopt remaining N gifts" button that opens
   a confirm sheet (bottom sheet on phones, centered card on desktop), or a completion
   message once everything is claimed. Below, one collapsible **member row** per family
   member (oldest→youngest) with an initial avatar, "Role, age · gift counts", and an
   "Adopted" mark when all of that member's gifts are claimed.
6. **Wish list items** — Description, a "Category · Color · Size" line, optional details and
   a "View item" link. Open items have a compact "Adopt" pill (spinner while saving).
   Adopted items read "Adopted by you" or "Adopted by {name}". The adopter can "Remove" an
   item. Single adopt and remove are instant with an **Undo** toast; only adopt-all asks
   for confirmation.
7. **My Adoptions page** (`/my-adoptions`) — A hero count of the user's adopted gifts, then
   their items grouped by family with member rows open by default. Removing an item
   animates it out (Undo brings it back). Empty state offers "Browse families".

## Secondary workflow: nomination (currently disabled)

A full **Nominate Family** flow exists in the code but is turned off: its route is
commented out in `app.routes.ts`, and the header tab only renders when a
`nomination_settings` table row (`id = 1`, `nominations_enabled`) is true. The flow is a
two-step wizard: family info (name, address, phone with input mask, email) → family
members (add/edit/delete members, each with a wish-list item form), with localStorage
draft persistence and delete-confirmation modals. It writes to the same tables the adopt
flow reads. Treat it as dormant, not dead — a UI refresh should keep it consistent or at
least not break it.

## Domain model (Supabase/Postgres)

- **families** — `last_name`, `address`, `phone`, `email`, `nominated_by` (user id).
  Address/phone/email are collected but **not displayed** in the adopt UI.
- **family_members** — `first_name`, `age`, `sex` ('male' | 'female' | 'other'),
  `is_parent`; belongs to a family. Displayed sorted by age, descending.
- **wishlist_items** — `category`, `description`, optional `color`, `size`, `link`,
  `details`; `is_adopted` + `adopted_by` (user id) track adoption. Adoption is **per
  item**, not per family — "adopt family" is just a bulk item adoption.
- **profiles** — provides `full_name` for the "Adopted by" label (joined via
  `wishlist_items.adopted_by`).
- **nomination_settings** — single row feature flag for the nomination UI.
- **Auth**: Supabase Auth with email/password and Google OAuth. All app routes require
  auth (`authGuard`); unauthenticated users only ever see the landing/sign-in screen.

## Technical structure

- **Stack**: Angular 20 (standalone components, signals, new `@if`/`@for` control flow),
  Tailwind CSS with a shared component layer in `src/styles.scss`, Angular CDK (confirm
  sheet), `@angular/animations` (expand/collapse), and the Geist variable font
  (self-hosted via `@fontsource-variable/geist`). PrimeNG 20 + PrimeIcons remain: icons
  everywhere, PrimeNG components only in the nomination wizard and auth screens. Deployed
  on Vercel (`noemptytree.com`); backend is Supabase (project URL/keys in
  `src/environments/`).
- **Routing** (`src/app/app.routes.ts`): everything nests under `HomeComponent` at `/`,
  which renders either the landing/sign-in screen (logged out) or the header + routed
  page (logged in). Routes: `/adopt-family`, `/my-adoptions` (both auth-guarded; the guard
  waits for the stored session to restore). Unknown paths redirect to `/adopt-family`.
  Route changes cross-fade via the View Transitions API (`withViewTransitions`).
- **Key files**:
  - `src/app/components/home/` — app shell + landing page split; hosts the toast
  - `src/app/components/sign-in/`, `sign-up/`, `auth-callback/` — auth UI
  - `src/app/components/header/` — sticky top bar, desktop nav, mobile bottom tab bar
  - `src/app/components/adopt-family/` — hero + family list page
  - `src/app/components/family-details/` — inline details + adopt-all
  - `src/app/components/nominate-family/member-details/` — collapsible member row with
    wish list (reused by both adopt-family and my-adoptions pages)
  - `src/app/components/wish-item/` + `item-info/` — single wish-list item row + its info
    (`item-info` is also used by the nomination wizard)
  - `src/app/components/my-adoptions/` — user's adopted items page
  - `src/app/components/nominate-family/` (+ `member-info/`, `item-form/`,
    `confirm-delete-modal/`) — dormant nomination wizard
  - `src/app/adoption.service.ts` — every adopt/unadopt goes through here (pending state,
    undo toasts, error handling, `version` signal)
  - `src/app/shared/` — `toast/`, `confirm/` (CDK confirm sheet), `animated-number`,
    `animations.ts`, `motion.ts` (reduced-motion helpers)
  - `src/app/supabase.service.ts` — all data access; `auth.service.ts` — session state
    (signals); `breakpoint.service.ts` — `isMobile` signal (breakpoint < 768px)
- **State**: no global store; Angular signals inside services/components. Data is
  refetched per page load; adopt/unadopt mutate local objects for instant feedback, so
  anything derived from family data must read `AdoptionService.version()` to recompute.

## Current visual language

Modeled on Robinhood: one flat white surface, structure from type and hairline dividers,
color used sparingly.

- **Type**: Geist. Page titles 32/40px semibold with tight tracking (`type-page-title`);
  a large tabular "hero number" per page (`type-hero-number`); 13px muted section labels.
  Numbers use tabular figures.
- **Color**: pine (evergreen) for brand, progress and success; berry (cranberry) only for
  adopt actions and "Adopted by you"; stone grays for text. Tokens live in
  `tailwind.config.js`.
- **Components**: pill buttons (`btn-adopt`, `btn-primary`, `btn-dark`, `btn-outline`,
  `btn-quiet`, sizes `btn-sm`/`btn-lg`) with press-scale feedback; divided lists rather
  than cards; dark single-line toasts with an optional action; a confirm sheet that is a
  bottom sheet on phones.
- **Motion**: rows expand/collapse with height + fade; hero numbers count to their value;
  lists fade up with a short stagger on load; chevrons rotate; adopt confirmations pop.
  Everything respects `prefers-reduced-motion`.

## Known UI debt / quirks (useful targets for refinement)

- The landing/sign-in screen still uses the old indigo→purple look (phase 3), including
  the non-standard `text-10xl` class.
- My Adoptions loads **all** families and filters client-side (a dedicated
  `getWishlistItemsByUser` query exists in `supabase.service.ts` but is unused there).
- No user-facing display of family address/contact info anywhere — adopters currently
  have no in-app guidance on gift drop-off/delivery logistics.
- The header brand title is `h1` on every page; page titles are `h2`s.
- The favicon is still the Angular default (title, description and theme color are set).
- Unadopt isn't guarded server-side to the adopter (the UI only offers it to them).
  Adopt is guarded: it only succeeds while the item is still unadopted.

## Constraints for UI work

- Keep `SupabaseService` method signatures and data flow intact unless intentionally
  refactoring data access; RLS policies on the Supabase side assume the current tables.
- Preserve the auth gate: nothing except the landing screen should be visible logged out.
- Preserve mobile behavior: `isMobile` signal drives the bottom-sheet confirm and
  scroll-into-view on family selection.
- The nomination wizard should keep working when its feature flag is re-enabled.
- Deployment is a static Vercel build; environment values are baked in at build time
  from `src/environments/environment.prod.ts`.
