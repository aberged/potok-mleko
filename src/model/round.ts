// A round: one trip to the producer. Its author organizes it. The round keeps
// its own copy of the products, their prices and how the trip is shared, so
// a later change in the settings leaves earlier rounds as they were.

import { product, productData, type Product, type Settings, type Split } from './config';

export type RoundStatus = 'open' | 'closed' | 'cancelled';

export type Round = {
  /** When the driver takes the goods at the producer's (ISO 8601). */
  farmAt: string;
  /** Orders until then. */
  closesAt: string;
  /** When neighbours take their goods. */
  meetAt: string;
  meetPlace: string;
  /** Where and until when to leave empty bottles. */
  bottlesNote: string;
  note: string;
  status: RoundStatus;
  /** `active` says whether a product is offered in this round. */
  products: Product[];
  split: Split;
};

/** Where a round is: what the app shows on it and what it still lets people do. */
export type Stage = 'cancelled' | 'open' | 'closed' | 'picked' | 'done';

/** A round is over this long after its goods were handed out. */
export const DONE_AFTER = 12 * 3_600_000;

const time = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');

export function fromRoundData(data: unknown): Round | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const farmAt = time(raw.farm_at);
  const closesAt = time(raw.closes_at);
  const meetAt = time(raw.meet_at);
  if (!farmAt || !closesAt || !meetAt) return null;

  return {
    farmAt,
    closesAt,
    meetAt,
    meetPlace: text(raw.meet_place, 200),
    bottlesNote: text(raw.bottles_note, 500),
    note: text(raw.note, 2000),
    status: raw.status === 'closed' || raw.status === 'cancelled' ? raw.status : 'open',
    products: Array.isArray(raw.products)
      ? raw.products.map(product).filter((p): p is Product => p !== null)
      : [],
    split: raw.split === 'amount' ? 'amount' : 'equal',
  };
}

export function toRoundData(round: Round) {
  return {
    v: 1,
    farm_at: round.farmAt,
    closes_at: round.closesAt,
    meet_at: round.meetAt,
    meet_place: round.meetPlace.trim(),
    bottles_note: round.bottlesNote.trim(),
    note: round.note.trim(),
    status: round.status,
    products: round.products.map(productData),
    split: round.split,
  };
}

export function stage(round: Round, pickedUp: boolean, now: number): Stage {
  if (round.status === 'cancelled') return 'cancelled';
  if (now > Date.parse(round.meetAt) + DONE_AFTER) return 'done';
  if (pickedUp) return 'picked';
  if (round.status === 'open' && now < Date.parse(round.closesAt)) return 'open';
  return 'closed';
}

/** Still ahead or under way, as opposed to the earlier rounds. */
export function upcoming(round: Round, now: number): boolean {
  return now <= Date.parse(round.meetAt) + DONE_AFTER;
}

export const offered = (round: Round) => round.products.filter((p) => p.active);

export type RoundProblem = 'order' | 'noProducts' | 'productName';

/** Order closes, then the trip, then the handing out; at least one product. */
export function roundProblems(round: Round): RoundProblem[] {
  const problems: RoundProblem[] = [];
  const closes = Date.parse(round.closesAt);
  const farm = Date.parse(round.farmAt);
  const meet = Date.parse(round.meetAt);
  if (!(closes <= farm && farm <= meet)) problems.push('order');
  if (offered(round).length === 0) problems.push('noProducts');
  if (round.products.some((p) => p.name.trim() === '')) problems.push('productName');
  return problems;
}

function at(day: Date, hours: number, minutes = 0): Date {
  const copy = new Date(day);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

/** A new round: in two days at eight, orders until eight the evening before, goods out two hours later. */
export function newRound(settings: Settings, now: number): Round {
  const farm = at(new Date(now + 2 * 86_400_000), 8);
  const closes = at(new Date(farm.getTime() - 86_400_000), 20);
  const meet = new Date(farm.getTime() + 2 * 3_600_000);

  return {
    farmAt: farm.toISOString(),
    closesAt: closes.toISOString(),
    meetAt: meet.toISOString(),
    meetPlace: settings.meetPlace,
    bottlesNote: '',
    note: '',
    status: 'open',
    products: settings.products.filter((p) => p.active).map((p) => ({ ...p, pack: p.pack ? { ...p.pack } : null })),
    split: settings.split,
  };
}

/** The round's products with the ones added to the settings since, switched off. */
export function withNewProducts(round: Round, settings: Settings): Product[] {
  const known = new Set(round.products.map((p) => p.id));
  return [
    ...round.products,
    ...settings.products
      .filter((p) => !known.has(p.id))
      .map((p) => ({ ...p, pack: p.pack ? { ...p.pack } : null, active: false })),
  ];
}
