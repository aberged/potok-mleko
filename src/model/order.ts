// An order: what one neighbour takes in one round, product by product, and
// whether they bring their own packaging. Potok lets each person change only
// their own order, and nobody delete it, so cancelling empties it.

import type { Product } from './config';
import { quantity } from './config';
import type { Round } from './round';

export type Line = { qty: number; own: boolean };

export type Order = {
  round: number;
  lines: Record<string, Line>;
  note: string;
};

/** Money to the para, without the float's tails. */
export const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function fromOrderData(data: unknown): Order | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const round = raw.round;
  if (typeof round !== 'number' || !Number.isInteger(round) || round <= 0) return null;

  const lines: Record<string, Line> = {};
  if (raw.lines && typeof raw.lines === 'object') {
    for (const [id, value] of Object.entries(raw.lines as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const line = value as Record<string, unknown>;
      const qty = quantity(line.qty, 0);
      if (qty > 0) lines[id] = { qty, own: line.own === true };
    }
  }

  return { round, lines, note: typeof raw.note === 'string' ? raw.note.slice(0, 500) : '' };
}

export function toOrderData(order: Order) {
  const lines: Record<string, Line> = {};
  for (const [id, line] of Object.entries(order.lines)) {
    if (line.qty > 0) lines[id] = { qty: line.qty, own: line.own };
  }
  return { v: 1, round: order.round, lines, note: order.note.trim() };
}

/** The producer's bottles a quantity takes: always whole ones. */
export function bottlesFor(product: Product, qty: number): number {
  if (!product.pack || qty <= 0) return 0;
  return Math.ceil(qty / product.pack.size - 1e-9);
}

export type LineCost = {
  product: Product;
  line: Line;
  goods: number;
  /** The producer's bottles this line pays for. */
  bottles: number;
  packaging: number;
  total: number;
};

export function lineCost(product: Product, line: Line): LineCost {
  const goods = cents(line.qty * product.price);
  const bottles = line.own ? 0 : bottlesFor(product, line.qty);
  const packaging = cents(bottles * (product.pack?.price ?? 0));
  return { product, line, goods, bottles, packaging, total: cents(goods + packaging) };
}

export type OrderCost = { lines: LineCost[]; goods: number; packaging: number; total: number };

/** Only the products the round offers count; a line for one switched off since does not. */
export function orderCost(round: Round, order: Order | null): OrderCost {
  const lines = order
    ? round.products
        .filter((p) => p.active && (order.lines[p.id]?.qty ?? 0) > 0)
        .map((p) => lineCost(p, order.lines[p.id]))
    : [];
  const goods = cents(lines.reduce((sum, l) => sum + l.goods, 0));
  const packaging = cents(lines.reduce((sum, l) => sum + l.packaging, 0));
  return { lines, goods, packaging, total: cents(goods + packaging) };
}

/** Lines for products the round no longer offers. */
export function droppedLines(round: Round, order: Order): string[] {
  const offered = new Set(round.products.filter((p) => p.active).map((p) => p.id));
  return Object.keys(order.lines).filter((id) => !offered.has(id));
}

export const isEmptyOrder = (round: Round, order: Order | null) => orderCost(round, order).lines.length === 0;

type Written = { id: number; creator_id: number | null };

/**
 * One order per person: the earliest counts. Two can only appear when someone
 * orders from two tabs at once; the later ones are `extras`, which an editor
 * may delete.
 */
export function onePerPerson<V extends Written>(values: V[]): { kept: V[]; extras: V[] } {
  const sorted = [...values].sort((a, b) => a.id - b.id);
  const seen = new Set<number>();
  const kept: V[] = [];
  const extras: V[] = [];

  for (const value of sorted) {
    if (value.creator_id === null) kept.push(value);
    else if (seen.has(value.creator_id)) extras.push(value);
    else {
      seen.add(value.creator_id);
      kept.push(value);
    }
  }

  return { kept, extras };
}
