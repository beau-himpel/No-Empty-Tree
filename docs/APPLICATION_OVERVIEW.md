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

1. **Landing / sign-in** — An unauthenticated visitor sees the headline "Give a family a
   Christmas to remember.", a short pitch, a three-step "How it works", and the auth
   panel (split layout on desktop, stacked on phones). The panel's segmented control
   switches between **Sign in** and **Create account**; both offer "Continue with Google".
   Errors appear inline and in a message above the form (e.g. wrong password, unconfirmed
   email with a "send it again" action). On page load a brief splash shows until the
   stored session is restored, so signed-in users never see the sign-in screen flash.
2. **Sign-up (first-time users)** — Collects name (labeled as shown next to adopted
   gifts), email, password (min 6 chars). Name is stored in Supabase user metadata / a
   `profiles` table and displayed as "Adopted by {name}". When email confirmation is on,
   a "Confirm your email" screen names the address and can resend the link; the link
   returns to this site's root, where the session is picked up.
   **Forgot password** sends a reset email; its link signs the user in with a recovery
   session and `AuthService` routes them to `/reset-password` to choose a new one.
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
8. **Shopping list** (`/my-adoptions/shopping-list`, linked from My Adoptions) — Every gift
   the user adopted as a checklist: families A–Z, then each person with their gifts.
   Ticks ("bought") are saved to the donor's account in `gift_purchases`, so they follow
   them across devices, and mirrored in localStorage so ticking is instant. Ticks made
   offline are queued on the device and sent when the connection returns (a note says so);
   ticks the server refuses (gift no longer adopted) are dropped. **Clear ticks** has Undo.
   **Print** gives a plain, ink-friendly page (no app chrome; links print as site names).

## Secondary workflow: nomination (behind a feature flag)

The `nomination_settings` row (`id = 1`, `nominations_enabled`) is the single switch: when
true, the "Nominate" tab/nav link appears; when false, `/nominate-family` still loads but
shows "Nominations are closed". No code change is needed to open or close nominations.

The flow (`/nominate-family`) is a three-step wizard with a step progress bar:

1. **Family** — last name and address (required), phone (masked, 10 digits) and email
   (optional). Inline errors appear on Continue and focus moves to the first problem.
2. **Members** — a list of household members; incomplete ones say what they still need
   ("Needs age and a wish list item") and block review. Tapping a member opens a full
   editor: first name, age (0 allowed for babies), Adult/Child (suggested from age until
   chosen), gender (labels follow: Boy/Girl, Man/Woman), optional ethnicity (free text,
   noted as not shown to adopters), and the wish list with an inline
   "add a gift" form (category chips, description, size, color, link, notes). A complete
   gift that wasn't added yet is added on save; a half-filled one blocks leaving rather
   than being dropped. Removing a member or gift shows an Undo toast; a member opened via
   "Add" and left blank is discarded.
3. **Review** — family details and every member's gifts, each section editable, then
   **Submit**. Success shows a confirmation with links to Adopt Families or to nominate
   another family. If saving members fails, the half-created family row is deleted and
   the draft is kept.

The draft (including which step you're on) autosaves to localStorage under
`nominateFamilyInfo` and resumes with a "Picking up where you left off · Start over"
notice. Drafts from the earlier wizard format are migrated on load. Product links without
a scheme are saved with `https://`. Ethnicity is sent only when entered, so a blank value
never touches the column.

## Domain model (Supabase/Postgres)

- **families** — `last_name`, `address`, `phone`, `email`, `nominated_by` (user id),
  `season` (the Christmas year it was nominated for; defaults to the current year).
  Address/phone/email are collected but **not displayed** in the adopt UI.
- **family_members** — `first_name`, `age`, `sex` ('male' | 'female' | 'other'),
  `is_parent`, optional `ethnicity` (text, max 100 characters; added by
  `supabase/migrations/20261023030718_add_family_members_ethnicity.sql`, not selected or
  displayed by the adopt UI); belongs to a family. Displayed sorted by age, descending.
- **wishlist_items** — `category`, `description`, optional `color`, `size`, `link`,
  `details`; `is_adopted` + `adopted_by` (user id) track adoption. Adoption is **per
  item**, not per family — "adopt family" is just a bulk item adoption.
- **profiles** — provides `full_name` for the "Adopted by" label (joined via
  `wishlist_items.adopted_by`).
- **nomination_settings** — single row (`id = 1`): `nominations_enabled` (feature flag for
  the nomination UI) and `active_season`. Signed-in users can read it but not change it;
  change it from the Supabase dashboard or SQL editor.
- **gift_purchases** — shopping list ticks: (`user_id`, `wishlist_item_id`, `purchased_at`),
  one row per gift a donor marked bought. Row-level security: donors read and delete only
  their own rows and can only insert for gifts they currently adopt
  (`supabase/migrations/20261023032206_add_gift_purchases.sql` plus the three
  `gift_purchases_*_policy` migrations after it). Rows stay if the gift is
  un-adopted (so Undo keeps the tick) and are deleted with the gift.
- **Auth**: Supabase Auth with email/password and Google OAuth. All app routes require
  auth (`authGuard`); unauthenticated users only ever see the landing/sign-in screen.

## Technical structure

- **Stack**: Angular 20 (standalone components, signals, new `@if`/`@for` control flow),
  Tailwind CSS with a shared component layer in `src/styles.scss`, Angular CDK (confirm
  sheet), `@angular/animations` (expand/collapse), and the Geist variable font
  (self-hosted via `@fontsource-variable/geist`). PrimeIcons for icons; PrimeNG has been
  removed. Deployed
  on Vercel (`noemptytree.com`); backend is Supabase (project URL/keys in
  `src/environments/`).
- **Routing** (`src/app/app.routes.ts`): everything nests under `HomeComponent` at `/`,
  which renders either the landing/sign-in screen (logged out) or the header + routed
  page (logged in). Routes: `/adopt-family`, `/nominate-family`, `/my-adoptions`,
  `/my-adoptions/shopping-list`, `/reset-password` (all auth-guarded; the guard waits for the stored session to
  restore). Unknown paths redirect to `/adopt-family`. Each route sets the tab title
  ("My adoptions · No Empty Tree") via `title.strategy.ts`.
  Route changes cross-fade via the View Transitions API (`withViewTransitions`).
- **Key files**:
  - `src/app/components/home/` — app shell + landing page split; hosts the toast
  - `src/app/components/auth/` — `auth-panel` (sign in, create account, forgot password,
    check-email states) and `reset-password` (new password after a reset link)
  - `src/app/components/header/` — sticky top bar, desktop nav, mobile bottom tab bar
  - `src/app/components/adopt-family/` — hero + family list page
  - `src/app/components/family-details/` — inline details + adopt-all
  - `src/app/components/nominate-family/member-details/` — collapsible member row with
    wish list (reused by both adopt-family and my-adoptions pages)
  - `src/app/components/wish-item/` + `item-info/` — single wish-list item row + its info
    (`item-info` is also used by the nomination wizard)
  - `src/app/components/my-adoptions/` — user's adopted items page; `adopted-by.ts`
    filters families down to the user's gifts (shared with the shopping list)
  - `src/app/components/shopping-list/` — printable checklist of the user's adoptions
  - `src/app/components/nominate-family/` — nomination wizard container (steps, family
    form, member list, review, submit); `member-editor/` — one member's details + wish
    list; `item-form/` — the add-a-gift form; `nomination-draft.service.ts` — draft state,
    autosave and undo; `nomination.model.ts` — draft types, validation rules, link
    normalization, legacy-draft migration
  - `src/app/adoption.service.ts` — every adopt/unadopt goes through here (pending state,
    undo toasts, error handling, `version` signal)
  - `src/app/shared/` — `toast/`, `confirm/` (CDK confirm sheet), `animated-number`,
    `choice-group` (segmented control / chips form control), `phone-mask.directive`,
    `animations.ts`, `motion.ts` (reduced-motion helpers)
  - `public/` — tree favicon (`favicon.svg`/`.ico`), `apple-touch-icon.png`,
    `icon-192/512.png` + `manifest.webmanifest` (Add to Home Screen), and `og-image.png`
    (1200×630 link-preview card referenced by the Open Graph tags in `src/index.html`)
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

- My Adoptions loads **all** families and filters client-side (a dedicated
  `getWishlistItemsByUser` query exists in `supabase.service.ts` but is unused there).
- No user-facing display of family address/contact info anywhere — adopters currently
  have no in-app guidance on gift drop-off/delivery logistics.
- The initial bundle (~574 kB raw, ~141 kB transferred) is above Angular's 500 kB
  warning budget; most of it is the Supabase client and Angular itself.
- Auth redirect URLs (`/` and `/reset-password` on each deployed origin) must be in
  Supabase's allowed Redirect URLs, or Supabase falls back to the Site URL.
- Unadopt isn't guarded server-side to the adopter (the UI only offers it to them).
  Adopt is guarded: it only succeeds while the item is still unadopted.

## Constraints for UI work

- Keep `SupabaseService` method signatures and data flow intact unless intentionally
  refactoring data access; RLS policies on the Supabase side assume the current tables.
- Preserve the auth gate: nothing except the landing screen should be visible logged out.
- Preserve mobile behavior: `isMobile` signal drives the bottom-sheet confirm and
  scroll-into-view on family selection.
- Opening/closing nominations is data-only (`nomination_settings`); keep the route
  registered so the flag stays the single switch.
- **Seasons**: Adopt a Family, My Adoptions and the shopping list only load families whose
  `season` equals `nomination_settings.active_season`, and new nominations are saved with
  it. To start a new year, set `active_season` to that year (and turn nominations on);
  earlier families stay in the database but disappear from the app.
- Deployment is a static Vercel build; environment values are baked in at build time
  from `src/environments/environment.prod.ts`.
