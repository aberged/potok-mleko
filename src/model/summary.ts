// Everything a round adds up to: per product for the producer, per order for
// the neighbours (goods, packaging and their part of the trip), and how far
// the handing out has gone.

import type { Product } from './config';
import type { Driver, Handover } from './driver';
import { cents, orderCost, type Order, type OrderCost } from './order';
import { offered, type Round } from './round';
import { shareTrip } from './split';

export type Placed = { id: number; creator_id: number | null; creator_username: string | null; order: Order };

export type Entry = {
  id: number;
  creatorId: number | null;
  name: string;
  order: Order;
  cost: OrderCost;
  /** Their part of the trip, in whole dinars. */
  share: number;
  /** What they owe the driver. */
  due: number;
  handover: Handover;
  /** The driver's own order: they pay nobody for it. */
  driver: boolean;
};

export type ProductTotal = {
  product: Product;
  qty: number;
  /** Of `qty`, what goes into neighbours' own packaging. */
  ownQty: number;
  bottles: number;
  goods: number;
  packaging: number;
};

export type RoundSummary = {
  entries: Entry[];
  products: ProductTotal[];
  goods: number;
  packaging: number;
  /** What the driver pays the producer. */
  producerTotal: number;
  tripCost: number | null;
  /** What the driver takes from the others. */
  fromOthers: number;
  collected: number;
  /** Of the others' orders, how many were taken. */
  handedOut: number;
  paid: number;
  ownPackers: Entry[];
};

const NO_HANDOVER: Handover = { got: false, paid: false };

export function summarize(round: Round, placed: Placed[], driver: { creator_id: number | null; driver: Driver } | null): RoundSummary {
  const costed = placed
    .map((p) => ({ p, cost: orderCost(round, p.order) }))
    .filter(({ cost }) => cost.lines.length > 0)
    .sort((a, b) => a.p.id - b.p.id);

  const trip = driver?.driver.cost ?? null;
  const shares = shareTrip(
    trip ?? 0,
    costed.map(({ p, cost }) => ({ id: p.id, amount: cost.total })),
    round.split,
  );

  const entries: Entry[] = costed.map(({ p, cost }) => {
    const share = shares.get(p.id) ?? 0;
    return {
      id: p.id,
      creatorId: p.creator_id,
      name: p.creator_username ?? '',
      order: p.order,
      cost,
      share,
      due: cents(cost.total + share),
      handover: driver?.driver.handover[String(p.id)] ?? NO_HANDOVER,
      driver: driver !== null && p.creator_id !== null && p.creator_id === driver.creator_id,
    };
  });

  const products: ProductTotal[] = offered(round)
    .map((product) => {
      const lines = entries.flatMap((e) => e.cost.lines.filter((l) => l.product.id === product.id));
      return {
        product,
        qty: Math.round(lines.reduce((s, l) => s + l.line.qty, 0) * 1000) / 1000,
        ownQty: Math.round(lines.filter((l) => l.line.own).reduce((s, l) => s + l.line.qty, 0) * 1000) / 1000,
        bottles: lines.reduce((s, l) => s + l.bottles, 0),
        goods: cents(lines.reduce((s, l) => s + l.goods, 0)),
        packaging: cents(lines.reduce((s, l) => s + l.packaging, 0)),
      };
    })
    .filter((t) => t.qty > 0);

  const goods = cents(products.reduce((s, t) => s + t.goods, 0));
  const packaging = cents(products.reduce((s, t) => s + t.packaging, 0));
  const others = entries.filter((e) => !e.driver);

  return {
    entries,
    products,
    goods,
    packaging,
    producerTotal: cents(goods + packaging),
    tripCost: trip,
    fromOthers: cents(others.reduce((s, e) => s + e.due, 0)),
    collected: cents(others.filter((e) => e.handover.paid).reduce((s, e) => s + e.due, 0)),
    handedOut: others.filter((e) => e.handover.got).length,
    paid: others.filter((e) => e.handover.paid).length,
    ownPackers: entries.filter((e) => e.cost.lines.some((l) => l.line.own)),
  };
}
