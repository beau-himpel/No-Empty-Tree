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
3. **After sign-in** — The user is redirected to **My Adoptions**. The app shell appears:
   sticky white header with the gradient brand title, nav tabs ("Adopt Families",
   "My Adoptions", conditionally "Nominate Family"), and a red "Logout" item.
4. **Adopt Families page** (`/adopt-family`) — A responsive grid of **family cards**. Each
   card shows the family's last name and three gradient count pills: Adults
   (indigo→purple), Boys (blue→cyan), Girls (pink→rose). Clicking a card toggles an
   inline **family details panel** below the grid (on mobile it auto-scrolls to the
   panel).
5. **Family details panel** — Shows "The {LastName} Family" with adult/child counts and a
   prominent red **"Adopt all items for this family"** button (becomes "Adopt all
   remaining items" if some are taken; becomes a red "All items have been adopted!"
   banner when everything is claimed — note: the current template has a typo, "neen").
   Below, one **member card** per family member (sorted oldest→youngest) with name, age,
   and a colored role badge (Man/Woman/Boy/Girl), plus a collapsible **wish list**.
6. **Wish list items** — Each item shows category, description, and optional color, size,
   free-text details, and an external "View Item" product link. Unadopted items have a
   red "Adopt" (heart icon) button. Adopted items show "Adopted by {full name}", and —
   only for the adopter themself — an "Unadopt" button with a confirmation dialog.
   "Adopt all" also goes through a confirmation dialog (PrimeNG `p-dialog`).
7. **My Adoptions page** (`/my-adoptions`) — The signed-in user's commitments, grouped by
   family, reusing the same member-card/wish-list components but filtered to only the
   items they adopted. Items can be unadopted here too. Empty state offers a red
   "Browse families" button.

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
  PrimeNG 20 + PrimeIcons (buttons, dialogs, spinners, mobile popup menu), Tailwind CSS
  utilities in templates, plus per-component SCSS files for bespoke styling. Deployed on
  Vercel (`noemptytree.com`); backend is Supabase (project URL/keys in
  `src/environments/`).
- **Routing** (`src/app/app.routes.ts`): everything nests under `HomeComponent` at `/`,
  which renders either the landing/sign-in screen (logged out) or the header + routed
  page (logged in). Routes: `/adopt-family`, `/my-adoptions` (both auth-guarded);
  unknown paths redirect to `/my-adoptions`.
- **Key files**:
  - `src/app/components/home/` — app shell + landing page split
  - `src/app/components/sign-in/`, `sign-up/`, `auth-callback/` — auth UI
  - `src/app/components/header/` — sticky nav; hamburger + PrimeNG popup menu on mobile
  - `src/app/components/adopt-family/` — family card grid page
  - `src/app/components/family-details/` — inline details panel + adopt-all dialogs
  - `src/app/components/nominate-family/member-details/` — member card with collapsible
    wish list (reused by both adopt-family and my-adoptions pages)
  - `src/app/components/wish-item/` + `item-info/` — single wish-list item row + its info
  - `src/app/components/my-adoptions/` — user's adopted items page
  - `src/app/components/nominate-family/` (+ `member-info/`, `item-form/`,
    `confirm-delete-modal/`) — dormant nomination wizard
  - `src/app/supabase.service.ts` — all data access; `auth.service.ts` — session state
    (signals); `breakpoint.service.ts` — `isMobile` signal (breakpoint < 768px)
- **State**: no global store; Angular signals inside services/components. Data is
  refetched per page load; adopt/unadopt also mutate local objects for instant feedback.

## Current visual language

- **Brand**: indigo→purple gradient (`from-indigo-500 to-purple-600`) for the title and
  primary accents; slate grays for text; light gray page background (`bg-gray-100`);
  white cards with rounded-xl borders.
- **Action color**: red (`bg-red-500`) with a heart icon for all adopt/unadopt actions —
  reads as "holiday giving".
- **Badges**: gradient pills for counts and colored role badges (blue for boys/men, pink
  for girls/women) defined in component SCSS.
- **Buttons**: mostly hand-styled Tailwind `<button>` elements; PrimeNG components are
  used for dialogs, spinners, and the mobile menu, so two visual systems coexist.

## Known UI debt / quirks (useful targets for refinement)

- Typo: "All items have **neen** adopted!" in `family-details.component.html`.
- `text-10xl` in the landing hero is not a standard Tailwind class (may silently not
  apply).
- Mixed styling approaches: Tailwind utility classes, per-component SCSS classes
  (`cancel-btn`, `confirm-btn`, `member-card`, badge classes), and PrimeNG theming all
  coexist; visual consistency between them is fragile (e.g., dialog footer buttons vs.
  in-page buttons).
- The empty state on Adopt Families offers "Nominate a family" and navigates to the
  disabled `/nominate-family` route (falls through to the wildcard redirect).
- `@for` loops track members by `first_name` in `family-details` (duplicate first names
  in a family would collide); other loops track by `id`.
- My Adoptions loads **all** families and filters client-side (a dedicated
  `getWishlistItemsByUser` query exists in `supabase.service.ts` but is unused there).
- No user-facing display of family address/contact info anywhere — adopters currently
  have no in-app guidance on gift drop-off/delivery logistics.
- The header brand title is `h1` on every page; page titles are `h2`s inside cards.
- No favicon/meta/social tags customization beyond Angular defaults (check `index.html`).
- Auth redirect after sign-in always lands on `/my-adoptions`, even for a first-time
  user whose natural next step is browsing families to adopt.

## Constraints for UI work

- Keep `SupabaseService` method signatures and data flow intact unless intentionally
  refactoring data access; RLS policies on the Supabase side assume the current tables.
- Preserve the auth gate: nothing except the landing screen should be visible logged out.
- Preserve mobile behavior: `isMobile` signal drives the hamburger menu, button
  placement in member cards, and scroll-into-view on family selection.
- The nomination wizard should keep working when its feature flag is re-enabled.
- Deployment is a static Vercel build; environment values are baked in at build time
  from `src/environments/environment.prod.ts`.
