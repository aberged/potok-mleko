// The trip's cost shared among the orders, in whole dinars that add up to the
// cost exactly: each order gets its part rounded down, and the dinars left go
// to the largest remainders (the earlier order first on a tie).

import type { Split } from './config';

export type Share = { id: number; amount: number };

/**
 * `orders` are the ones that are not empty, each with what it costs. "amount"
 * shares by that cost, and falls back to equal parts when nothing has a price.
 */
export function shareTrip(cost: number, orders: Share[], split: Split): Map<number, number> {
  const parts = new Map<number, number>();
  const total = Math.round(cost);
  if (orders.length === 0 || !(total > 0)) {
    for (const order of orders) parts.set(order.id, 0);
    return parts;
  }

  const byAmount = split === 'amount' && orders.some((o) => o.amount > 0);
  const weights = orders.map((o) => (byAmount ? Math.max(o.amount, 0) : 1));
  const sum = weights.reduce((a, b) => a + b, 0);

  const exact = orders.map((o, i) => ({ id: o.id, value: (total * weights[i]) / sum }));
  const floors = exact.map((e) => ({ id: e.id, part: Math.floor(e.value + 1e-9), rest: e.value - Math.floor(e.value + 1e-9) }));
  let left = total - floors.reduce((a, f) => a + f.part, 0);

  const order = [...floors].sort((a, b) => b.rest - a.rest || a.id - b.id);
  for (const f of order) {
    if (left <= 0) break;
    f.part += 1;
    left -= 1;
  }

  for (const f of floors) parts.set(f.id, f.part);
  return parts;
}
