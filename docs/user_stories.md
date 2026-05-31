# Meal Planning & Ingredient Prep App — User Stories

**Platform:** Mobile-first web app
**Document owner:** Product
**Last updated:** 2026-05-31
**Status:** Draft for review

---

## 1. Product Summary

A mobile web app for individual home cooks to manage recipes, plan meals on a
calendar, track ingredient stock, and generate "what do I need to buy" prep
lists. When a planned meal is cooked, the app deducts the ingredients it used
from the user's stock.

### Goals
- Let a user capture recipes once and reuse them in meal plans.
- Plan multiple meals per day and scale ingredient needs to any serving size.
- Know, before shopping, exactly how much of each ingredient is needed vs. on hand.
- Keep an always-current view of ingredient stock, updated as meals are cooked.

### Non-goals (this version)
- Sharing/collaboration between users (all data is private per user).
- Recipe discovery, search marketplace, or social features.
- Nutrition tracking / calorie counting.
- Cost/price tracking or budgeting.
- Self-service signup or PIN recovery.

---

## 2. Key Product Decisions (confirmed)

| Area | Decision |
|------|----------|
| **Data scope** | Per-user private. Each user has their own recipes, ingredients, meal plans, and stock. Nothing is shared. |
| **Accounts** | Created/updated by **manual DB insert** (no admin UI in v1). Users log in with username + an 8-digit numeric PIN. Users **cannot** change their own PIN. No self-signup, no recovery, no lockout. |
| **Units** | Fixed list of common Indonesian household units, with automatic conversion between compatible units when aggregating. |
| **Ingredients** | Each user has an ingredient catalog. When building a recipe, the user picks an existing ingredient or types a new one (which creates it). Stock is keyed by `ingredient_id`. |
| **Meal plan structure** | A date can hold multiple meals, each tagged by meal type (breakfast / lunch / dinner / snack). |
| **Serving scaling** | A planned meal can override the recipe's serving size; ingredient quantities auto-scale proportionally. |
| **Cooking & stock** | Marking a meal "Cooked" subtracts its ingredients from stock. Stock floors at zero (never negative); shortfall is simply lost. Cooking is **one-way** (no revert) and requires a confirmation. |
| **Meal statuses** | `Planned` → `Cooked` (one-way). A `Planned` meal whose date is in the past and was never cooked automatically becomes `NotCooked` (missed); it does **not** deduct stock. |
| **Prep page output** | For selected meal plans: needed quantity per ingredient, an adjustable current-stock field, and the resulting shortfall. |
| **Recipe deletion** | Soft delete — recipe is flagged **trashed** and hidden from the recipe list. It is retained while still referenced by meal plans; once no meal plan references it, it is purged. |
| **Stock storage** | A single qty+unit per ingredient. Compatible-unit **conversion is offered on read and on write** so the user can view/enter in any unit within the family. |
| **Prep stock save** | Explicit save action (no auto-save per edit). |

---

## 3. Personas

- **Home Cook (primary user):** Plans and cooks meals for their household. Wants
  a fast way to know what to buy and to keep stock honest as they cook.
- **Admin:** Provisions user accounts and sets/resets PINs. (May be the same
  person operating out of band; minimal tooling assumed for v1.)

---

## 4. Domain Model (for reference)

- **User** — `id`, `username`, `pin` (hashed), created by admin.
- **Ingredient** — `id`, `user_id`, `name`, `default_unit` (optional). Free-text
  created or reused.
- **Stock** — `ingredient_id`, `qty`, `unit`. One stock record per ingredient
  per user.
- **Recipe** — `id`, `user_id`, `title`, `serving_size`, `steps` (body), and a
  list of **RecipeIngredients**.
- **RecipeIngredient** — `recipe_id`, `ingredient_id`, `qty`, `unit`.
- **MealPlan** — `id`, `user_id`, `date`, `meal_type`, `recipe_id`,
  `serving_size_override` (nullable), `status` (Planned / Cooked / NotCooked).
- **Recipe** also carries `trashed` (boolean, soft-delete flag).
- **Unit** — belongs to a conversion family (mass, volume, count). Conversion
  factors defined within a family.

---

## 5. Units & Conversion

**Unit families and members (initial set — to confirm with user):**

- **Mass:** gram (g), kilogram (kg) — `1 kg = 1000 g`
- **Volume:** mililiter (ml), liter (l) — `1 l = 1000 ml`; plus spoon/cup
  volumes: sendok teh (sdt ≈ 5 ml), sendok makan (sdm ≈ 15 ml), gelas (≈ 240 ml)
- **Count:** buah/pcs, butir (egg), siung (clove), lembar (sheet), potong,
  bungkus, kaleng, sachet, ikat (bunch) — counted as-is, no cross-conversion

**Rules:**
- Aggregation across recipes converts within the same family to a canonical unit,
  then presents in a sensible display unit.
- Units in **different families cannot be converted**; they aggregate as separate
  lines for the same ingredient (and the app should flag the mismatch).
- A "to taste" / non-quantifiable unit (e.g. *secukupnya*) is supported as a
  display-only ingredient with no quantity and is excluded from aggregation.

> **Confirmed:** The unit list and conversion factors above are accepted, and
> spoon/cup → ml conversions are good enough for prep math.

---

## 6. Epics

1. Authentication
2. Recipe Management
3. Ingredient Catalog & Stock
4. Meal Planning
5. Ingredient Prep
6. Cooking & Stock Deduction

---

## 7. User Stories

### Epic 1 — Authentication

**US-1.1 — Log in with username and PIN**
> As a home cook, I want to log in with my username and PIN so that I can access
> my private data.

Acceptance criteria:
- Login screen accepts a username and a numeric, 8-digit PIN.
- On success, the user lands on their home/dashboard.
- On failure, a generic "invalid username or PIN" message is shown (no field-level disclosure).
- No lockout — unlimited login attempts (v1).
- Session persists on the device until logout or expiry; the app is usable on mobile without re-login each visit.
- PIN is never stored or transmitted in plaintext (hashed at rest).

**US-1.2 — Log out**
> As a home cook, I want to log out so that others using my phone can't see my data.

Acceptance criteria:
- A logout action is available from the app menu.
- After logout, protected pages are inaccessible without logging in again.

**US-1.3 — Admin provisions accounts via database (v1)**
> As an admin, I want to create user accounts with a username and PIN so that
> users can log in.

Acceptance criteria:
- Accounts are created/updated by **manual insert/update in the database** (no admin UI in v1).
- A user record has a unique username and an 8-digit numeric PIN (stored hashed).
- Users cannot self-register and cannot change their own PIN.
- PIN reset, if needed, is a manual DB update by the admin.

---

### Epic 2 — Recipe Management

**US-2.1 — Create a recipe**
> As a home cook, I want to create a recipe with a title, serving size,
> ingredients, and step-by-step instructions so that I can reuse it later.

Acceptance criteria:
- Required fields: title, serving size (positive number), at least one ingredient, instruction body.
- Instruction body supports multi-step / multi-line text.
- Recipe is saved to the user's private collection.

**US-2.2 — Add ingredients to a recipe**
> As a home cook, I want each recipe ingredient to have a name, quantity, and unit
> so that I can scale and aggregate them later.

Acceptance criteria:
- For each ingredient line: name, quantity, unit.
- Name field offers existing ingredients from the user's catalog (autocomplete) and allows typing a new name.
- Typing a new name creates a new ingredient in the catalog on save.
- Unit is selected from the fixed unit list.
- Multiple ingredient lines can be added/removed.

**US-2.3 — View a recipe**
> As a home cook, I want to view a recipe's full details so that I can cook from it.

Acceptance criteria:
- Shows title, serving size, ingredient list (name/qty/unit), and steps.
- Mobile-readable layout.

**US-2.4 — Edit a recipe**
> As a home cook, I want to edit a recipe so that I can fix or improve it.

Acceptance criteria:
- All fields (title, serving size, ingredients, steps) are editable.
- *Planned* meals that reference the recipe sync to the edited recipe (live).
- *Cooked* meals are frozen and unaffected by later edits.

**US-2.5 — Delete (trash) a recipe**
> As a home cook, I want to delete a recipe I no longer use, without breaking
> meal plans that still reference it.

Acceptance criteria:
- Deletion is a **soft delete**: the recipe is flagged `trashed` and hidden from the recipe list and from new meal-plan selection.
- Deletion asks for confirmation.
- A trashed recipe is retained while any meal plan still references it (so calendar/history stays intact).
- Once no meal plan references the trashed recipe, it is purged.

**US-2.6 — List/browse recipes**
> As a home cook, I want to see my recipes in a list so that I can find and pick one.

Acceptance criteria:
- List shows recipe titles (and optionally serving size).
- Trashed recipes are excluded from the list.
- Tapping a recipe opens its detail view.

---

### Epic 3 — Ingredient Catalog & Stock

**US-3.1 — Maintain ingredient catalog implicitly**
> As a home cook, when I create recipe ingredients, I want new ingredient names to
> be remembered so that I can reuse them consistently.

Acceptance criteria:
- New ingredient names typed in recipes are added to the catalog.
- Existing ingredients are offered for reuse to avoid duplicates.

**US-3.2 — View stock page**
> As a home cook, I want a dedicated stock page so that I can see everything I
> currently have.

Acceptance criteria:
- Lists ingredients with current stock qty + unit.
- Ingredients with no stock record show as zero / not stocked.

**US-3.3 — Add or modify stock**
> As a home cook, I want to add or change the stock quantity of an ingredient so
> that my inventory reflects reality.

Acceptance criteria:
- User can set/adjust qty and unit for an ingredient.
- A single qty+unit is stored per ingredient.
- The user may enter the amount in any compatible unit within the family; the app converts to the stored unit on write, and can display in a chosen compatible unit on read.
- Changes save immediately to the user's stock.

**US-3.4 — Delete stock**
> As a home cook, I want to delete a stock entry so that my list stays clean.

Acceptance criteria:
- Deleting stock removes the stock record (the ingredient definition may remain for recipes).
- Confirmation prompt before delete.

> **Confirmed:** Current stock is a single stored qty+unit per ingredient.
> Conversion is offered on read and write so the user isn't locked to one unit.

---

### Epic 4 — Meal Planning

**US-4.1 — Plan a meal**
> As a home cook, I want to plan a meal by choosing a recipe and a date so that I
> know what I'm cooking and when.

Acceptance criteria:
- User selects a recipe, a date, and a meal type (breakfast/lunch/dinner/snack).
- Multiple meals can be planned for the same date.
- Planned meal defaults to status = Planned.

**US-4.2 — Override serving size on a planned meal**
> As a home cook, I want to optionally set a custom serving size for a planned meal
> so that ingredient needs auto-calculate for that amount.

Acceptance criteria:
- Serving override defaults to the recipe's serving size.
- When overridden, the meal's ingredient quantities scale proportionally
  (`scaled_qty = recipe_qty × override / recipe_serving`).
- Scaling is reflected in prep aggregation and cooking deduction.

**US-4.3 — View meal plan calendar**
> As a home cook, I want to see planned meals organized by date and meal type so
> that I can review my plan over a window I choose.

Acceptance criteria:
- The calendar defaults to a **weekly** view.
- The user can freely choose the plan window length (e.g. a few days, two weeks, a month).
- Within the window, meals are grouped by date and meal type.
- Each entry shows recipe title, serving size (and override if any), and status (Planned/Cooked/NotCooked).

**US-4.5 — Past planned meals auto-mark as NotCooked**
> As a home cook, I want a planned meal whose date has passed without being cooked
> to be clearly marked so that I know it was missed.

Acceptance criteria:
- A meal with status `Planned` whose date is in the past automatically becomes `NotCooked`.
- `NotCooked` meals do **not** deduct stock.
- `NotCooked` is visually distinct from `Planned` and `Cooked` in the calendar.

**US-4.4 — Edit or remove a planned meal**
> As a home cook, I want to change or delete a planned meal so that my plan stays accurate.

Acceptance criteria:
- User can change recipe, date, meal type, or serving override while status = Planned.
- User can delete a planned meal.
- Cooking is **one-way**: a Cooked meal cannot be reverted to Planned, and stock is never re-credited.

---

### Epic 5 — Ingredient Prep

**US-5.1 — Select meal plans for prep**
> As a home cook, I want to select multiple meal plans so that the app calculates
> the total ingredients I need.

Acceptance criteria:
- User can multi-select meal plans (e.g. by date range or checklist).
- Selection can span multiple dates and meal types.
- Default scope follows the calendar window (weekly), but the user can freely widen or narrow the selection.

**US-5.2 — See aggregated needed ingredients**
> As a home cook, I want the prep page to total how much of each ingredient I need
> so that I know what to gather.

Acceptance criteria:
- Quantities are summed per ingredient across the selected meals, applying any serving overrides.
- Compatible units are converted and combined within a family.
- Incompatible-unit cases for the same ingredient are shown as separate lines with a warning.
- Non-quantifiable ("to taste") ingredients are listed without a number.

**US-5.3 — Review and adjust current stock inline**
> As a home cook, I want each needed ingredient to show my last saved stock as an
> adjustable field so that I can correct it on the spot.

Acceptance criteria:
- Each row shows: ingredient name, quantity needed, current stock (pre-filled from saved stock, editable), and shortfall.
- Shortfall = `max(0, needed − current_stock)` after unit conversion.
- The user can increase or decrease the current-stock value.

**US-5.4 — Persist adjusted stock from prep**
> As a home cook, I want my adjusted current-stock values to be saved so that next
> time prep shows my latest stock.

Acceptance criteria:
- Adjustments are committed only via an **explicit save** action (no auto-save per edit).
- On save, the adjusted values update the saved stock for those ingredients.
- Re-opening prep later reflects the last saved stock.

---

### Epic 6 — Cooking & Stock Deduction

**US-6.1 — Mark a meal as Cooked**
> As a home cook, I want to flag a meal as Cooked so that the ingredients it used
> are deducted from my stock.

Acceptance criteria:
- Marking Cooked requires an explicit **confirmation** (irreversible action).
- On confirm, it subtracts each of the meal's ingredient quantities (after serving scaling and unit conversion) from stock.
- Stock floors at zero — it never goes negative; any shortfall beyond available stock is simply not recorded as debt.
- Meal status changes to Cooked (one-way) and is visually distinct in the calendar.

**US-6.2 — See the effect of cooking on stock**
> As a home cook, I want to see my stock reflect what I just cooked so that my
> inventory stays current.

Acceptance criteria:
- After marking Cooked, the stock page shows the reduced quantities.
- If an ingredient hit zero, it shows zero (not negative).

> **Confirmed:** When stock floors at zero, show a **non-blocking** "you were
> short X of ingredient Y" notice for shopping awareness; it does not prevent
> cooking.

---

## 8. Cross-Cutting Requirements

- **Mobile-first:** All screens are designed for phone-sized viewports first.
- **Privacy:** A user can only ever see/modify their own data.
- **Validation:** Quantities are positive numbers; units must be from the fixed list and family-consistent for an ingredient.
- **Consistency:** Unit conversion is centralized so prep aggregation and cooking deduction use identical math.
- **Localization:** Unit list uses common Indonesian household units; UI language TBD (assumption: Indonesian or bilingual labels).

---

## 9. Resolved Decisions & Remaining Questions

**Resolved:**
1. ✅ Unit list + spoon/cup → ml conversions accepted as-is.
2. ✅ Recipe edits sync to *Planned* meals; *Cooked* meals are frozen.
3. ✅ Recipe deletion is a soft "trash": hidden from list, retained while referenced, purged when no longer referenced.
4. ✅ Single qty+unit per ingredient; conversion offered on read and write.
5. ✅ Cooking is one-way (no revert, no re-credit); irreversible actions require confirmation.
6. ✅ Past-date `Planned` meals auto-become `NotCooked` (no stock deduction).
7. ✅ Calendar defaults to weekly; user can freely set the plan/selection window.
8. ✅ Prep stock saved via explicit action.
9. ✅ Cooking shortfall shows a non-blocking notice.
10. ✅ Admin tooling: none for v1 — users are created/updated by **manual insert/update in the database**.
11. ✅ PIN policy: **numeric-only, exactly 8 digits** (min = max = 8), **unlimited** login attempts (no lockout).
12. ✅ UI language: **English**.

**Still open:** none.

---

## 10. Suggested Build Order (MVP first)

1. Auth (login/logout) + admin-seeded user.
2. Recipe CRUD + ingredient catalog (implicit creation).
3. Stock page CRUD.
4. Meal planning (calendar, meal types, serving override).
5. Ingredient prep (aggregation, adjustable stock, shortfall).
6. Cooking flag + stock deduction (floor at zero).
