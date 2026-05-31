# User Problems

**Document owner:** Product
**Last updated:** 2026-05-31
**Source:** Real pain points from the primary user (home cook)

---

## The Problems

These are the original, concrete problems this app exists to solve.

### Problem 1 — Missing ingredients on cook day
> "I plan for a meal, but on the day I'm supposed to cook it, some ingredient is
> missing."

**Pain:** Planning a meal doesn't guarantee I can actually make it. I only
discover the shortage at the moment I want to cook — too late to shop.

### Problem 2 — Forgetting what I can cook
> "I sometimes have difficulty deciding which meal to cook because I forget the
> list of meals I've previously cooked / know how to make."

**Pain:** I can't recall my own repertoire, so planning stalls.

### Problem 3 — Tedious ingredient math across multiple meals
> "When I plan multiple meals, it takes effort to calculate the ingredients I
> need versus what I already have in stock."

**Pain:** Summing quantities by hand across several recipes — and reconciling
them against current stock — is slow and error-prone.

---

## How the App Solves Each Problem

| # | Problem | Solved by | How |
|---|---------|-----------|-----|
| 1 | Missing ingredient on cook day | **Ingredient Prep** (Epic 5) + cooking shortfall notice (Epic 6) | Prep page aggregates needed quantities, compares to stock, and shows the **shortfall** (`max(0, needed − stock)`) *before* shopping. Cooking also surfaces a non-blocking "you were short X" notice. |
| 2 | Forgot what I can cook | **Recipe list** (Epic 2, US-2.6) | The recipe list is the user's living repertoire. A meal stays in the recipe list until they're ready/able to cook it. Browsing the list answers "what can I make." |
| 3 | Multi-meal ingredient math | **Ingredient Prep aggregation** (Epic 5, US-5.1–5.4) | Multi-select planned meals → the app sums per-ingredient quantities (with serving-override scaling and unit conversion), shows needed vs. on-hand, and computes shortfall automatically. |

### Notes on coverage
- **Problem 1** is *pull-based*: the user must open the Prep page to see
  shortfalls; the app does not proactively alert. This is accepted for the MVP.
- **Problem 2** is intentionally solved by the recipe list alone. The user keeps
  recipes around until they can cook them, so the list doubles as their
  "things I can cook" memory. No separate cooking-history view is needed.
- **Problem 3** is fully solved by the Prep aggregation engine, which is the core
  of Epic 5.
