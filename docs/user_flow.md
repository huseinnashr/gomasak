# User Flow

**Document owner:** Product
**Last updated:** 2026-05-31
**Source:** Derived from [user_problem.md](user_problem.md), [user_stories.md](user_stories.md), [mvp_feature_spec.md](mvp_feature_spec.md)

The steps a home cook follows to go from "I want to eat well this week" to a
cooked meal with honest stock — solving all three [user problems](user_problem.md)
along the way. Each step names the screen, the action, the **timing** relative to
cook day, and which problem it addresses.

> **Timing convention:** `H` = cook day (the day the meal is eaten). `H-2` = two
> days before cook day, `H-7` = a week before, and so on. Prep is deliberately
> done at **H-2** so there's enough lead time to **order/buy the missing
> ingredients** before they're needed.

---

## The Happy Path (end to end)

```
Build repertoire → Plan the week → Prep (order) → Cook → Stock stays honest
   (Recipes)         (Calendar)      (Prep page)   (Cook)    (Stock page)
   anytime           ~H-7            H-2           H         H
```

---

## Timeline at a Glance

| When | Step | Screen | Why this timing |
|------|------|--------|-----------------|
| **Anytime** | Capture recipes | Recipes | Build the repertoire whenever inspiration strikes. |
| **~H-7** (start of week) | Plan the week | Calendar | Lay out the meals for the days ahead. |
| **H-2** | Prep + order | Prep page | **Run prep 2 days out so the shortfall list becomes a shopping order with time to arrive** before cook day. |
| **H-2 → H** | Shopping/delivery window | — | Ordered ingredients arrive in time. |
| **H** | Cook | Cook / Calendar | Cook the meal; stock auto-deducts. |
| **H** (after) | Stock stays honest | Stock | Inventory reflects what was cooked. |

> The whole point of running prep at **H-2** instead of on cook day: a shortfall
> you discover at H is too late to fix, but a shortfall you discover at H-2 is
> just a shopping order you place today.

---

## Step 1 — Capture what I can cook (Recipes)
**Screen:** `/#/recipes` → `/#/recipes/new`
**When:** Anytime (ongoing — independent of any cook day)
**Solves:** Problem 2 (forgetting what I can cook)

1. Open the **Recipe list**. This is my living menu of everything I know how to make.
2. To add something new, tap **New recipe** and enter:
   - Title, serving size, step-by-step instructions.
   - Ingredient lines: name (autocomplete from my catalog, or type a new one →
     it's remembered), quantity, and unit.
   - For things like salt, use `secukupnya` (to-taste) — no quantity needed.
3. Save. The recipe now lives in my list until I'm ready to cook it.

> Whenever I'm unsure what to make, I browse this list — it's my memory of my
> own repertoire.

---

## Step 2 — Keep my pantry honest (Stock) — *as needed*
**Screen:** `/#/stock`
**When:** Anytime (and again at H-2, right inside Prep)
**Solves:** feeds Problem 1 & 3 (accurate stock for shortfall math)

1. Open the **Stock page** to see what I currently have.
2. Add or adjust an ingredient's quantity + unit. I can enter in any compatible
   unit (e.g. type `1 kg` even if stored in `g`) — the app converts for me.

> I don't have to do this constantly — I can also correct stock right inside the
> Prep page (Step 4). But this is where I do a full pantry update.

---

## Step 3 — Plan the week (Calendar)
**Screen:** `/#/calendar`
**When:** ~H-7 (start of the week, before prep)
**Solves:** sets up Problem 1 & 3

1. Open the **Calendar** (defaults to a weekly view; I can widen or narrow the window).
2. **Plan a meal:** pick a recipe + a date + a meal type (breakfast/lunch/dinner/snack).
   I can plan multiple meals on the same day.
3. Optionally **override the serving size** for a meal — quantities auto-scale.
4. Each planned meal shows as `Planned`. (If a planned date passes without cooking,
   it auto-marks as `NotCooked` — no stock is touched.)

---

## Step 4 — Find out what to buy (Prep)
**Screen:** `/#/prep`
**When:** **H-2** — two days before cook day, leaving time to order/buy
**Solves:** Problem 3 (the math) → and Problem 1 (the shortage) *before* it bites

1. At **H-2**, open the **Prep page**. The default scope follows my calendar window.
2. **Select the meals** I want to cook (by date range or checklist). Selection can
   span several days and meal types.
3. The app **aggregates everything automatically:**
   - Sums each ingredient across all selected meals (applying serving overrides).
   - Converts and combines compatible units; flags incompatible ones as separate lines.
   - Lists to-taste ingredients without a number.
4. For each ingredient I see: **needed**, **current stock** (pre-filled, editable),
   and **shortfall**.
5. If reality differs from saved stock, I **edit the current-stock field inline**,
   then hit **Save** to persist it.
6. The shortfall column is now my **shopping order** — exactly what's missing. Because
   it's H-2, I place the order today and it arrives with a day to spare. (This is what
   stops "missing ingredient on cook day.")

---

## Step 5 — Shop, then cook (Cook)
**Screen:** `/#/calendar` (or wherever the meal is shown)
**When:** H-2 → H (ordered items arrive); cook at **H**
**Solves:** closes Problem 1; keeps inventory current

1. Between H-2 and H, the ordered shortfall items arrive; optionally update stock again.
2. When I actually cook a meal, **mark it Cooked** (requires confirmation — it's
   one-way).
3. The app **deducts the meal's ingredients from stock** (after scaling + conversion),
   flooring at zero.
4. If I was still short, I get a **non-blocking notice** ("you were short X of Y") —
   useful for next time's shopping, but it doesn't stop me cooking.

---

## Step 6 — Stock stays current (Stock)
**Screen:** `/#/stock`
**When:** H (right after cooking)
**Solves:** keeps Problem 1 & 3 accurate over time

1. After cooking, the **Stock page** reflects the reduced quantities automatically.
2. Anything that hit zero shows as zero — so my next Prep run is accurate without
   extra bookkeeping.

---

## Optional — Backup / move devices (Settings)
**Screen:** `/#/settings`

- **Export** all my data to a JSON file for backup.
- **Import** a backup file to restore (replaces current data, with confirmation).

---

## Flow ↔ Problem Map

| Problem | Where it's solved in the flow |
|---------|-------------------------------|
| 1 — Missing ingredient on cook day | Step 4 (shortfall = shopping list) + Step 5 (cook-time notice) |
| 2 — Forgot what I can cook | Step 1 (recipe list as repertoire) |
| 3 — Multi-meal ingredient math | Step 4 (automatic aggregation vs. stock) |

> The loop is self-reinforcing: **cooking keeps stock honest (Step 5–6)**, which
> makes the **next Prep's shortfall accurate (Step 4)**, which keeps me from ever
> arriving at cook day short again.
