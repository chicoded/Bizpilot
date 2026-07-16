# Rush POS Engine

High-volume restaurant / fast-food POS for Zaplex (BizPilot).

## Activation

Set business industry to **Restaurant**, **Fast Food**, or **Cafe** in Settings → Business profile.

Rush Mode turns on automatically. Toggle options under **Rush POS Engine** on the same page.

## Cashier flow (target &lt; 5 seconds)

1. Tap menu cards (instant add, no confirm)
2. Optional: service type + quick note chips
3. Tap payment + **Checkout**
4. Kitchen ticket created at `/sales/kitchen`

## Built in Phase 1

- Visual product grid (large touch targets)
- Category chips + Favorites / Combos
- Floating checkout bar
- Instant add + qty +/- with long-press
- Quick notes & service type chips
- Adaptive ranking by daypart (breakfast / lunch / dinner)
- AI co-occurrence suggestions
- Recent order one-tap recreate
- Offline local sales + local kitchen tickets
- Models: `RestaurantSettings`, `MealCombo`, `FavoriteProduct`, `KitchenOrder`

## Phase 2

- Favorites + combo management UI: `/sales/rush-setup`
- Rush insights: `/sales/rush-insights` (peak hours, top items, pairings)
- Split payment (cash + transfer)
- Kitchen multi-device sync via `/api/kitchen/orders`

## Schema

Run on deploy via `scripts/ensure-app-schema.mjs`, or manually:

`database/repair-rush-pos-schema.sql`

## Still on the roadmap

- Voice orders (Nigerian English)
- Faster cashier leaderboards / average order time telemetry
- Dedicated combo pricing overrides vs sum of parts
