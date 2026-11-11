// Who goes to the producer. A neighbour offers by writing a value of their own
// in `drivers`; the earliest offer that was not withdrawn drives, the others
// stand by. The driver keeps the trip's cost and the handing out (who took
// their goods, who paid) in that same value, so Potok lets only them change it.

import { amount } from './config';

export type Handover = { got: boolean; paid: boolean };

export type Driver = {
  round: number;
  /** When they offered, by their clock: a new offer after withdrawing goes to the back. */
  at: string;
  withdrawn: boolean;
  /** The trip's cost; null until written. */
  cost: number | null;
  pickedUp: boolean;
  /** By order id. */
  handover: Record<string, Handover>;
};

export function fromDriverData(data: unknown): Driver | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const round = raw.round;
  if (typeof round !== 'number' || !Number.isInteger(round) || round <= 0) return null;
  const at = typeof raw.at === 'string' && Number.isFinite(Date.parse(raw.at)) ? raw.at : '1970-01-01T00:00:00.000Z';

  const handover: Record<string, Handover> = {};
  if (raw.handover && typeof raw.handover === 'object') {
    for (const [id, value] of Object.entries(raw.handover as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const h = value as Record<string, unknown>;
      if (h.got === true || h.paid === true) handover[id] = { got: h.got === true, paid: h.paid === true };
    }
  }

  const cost = raw.cost === null || raw.cost === undefined ? null : amount(raw.cost, -1);

  return {
    round,
    at,
    withdrawn: raw.withdrawn === true,
    cost: cost === null || cost < 0 ? null : cost,
    pickedUp: raw.picked_up === true,
    handover,
  };
}

export function toDriverData(driver: Driver) {
  const handover: Record<string, Handover> = {};
  for (const [id, h] of Object.entries(driver.handover)) {
    if (h.got || h.paid) handover[id] = { got: h.got, paid: h.paid };
  }
  return {
    v: 1,
    round: driver.round,
    at: driver.at,
    withdrawn: driver.withdrawn,
    cost: driver.cost,
    picked_up: driver.pickedUp,
    handover,
  };
}

export function newDriver(round: number, now: number): Driver {
  return { round, at: new Date(now).toISOString(), withdrawn: false, cost: null, pickedUp: false, handover: {} };
}

type Offer = { id: number; creator_id: number | null; driver: Driver };

/** The one who drives and those who stand by, each person once (their earliest value). */
export function resolveDrivers<O extends Offer>(offers: O[]): { active: O | null; reserves: O[] } {
  const seen = new Set<number>();
  const own: O[] = [];
  for (const offer of [...offers].sort((a, b) => a.id - b.id)) {
    if (offer.creator_id !== null) {
      if (seen.has(offer.creator_id)) continue;
      seen.add(offer.creator_id);
    }
    own.push(offer);
  }

  const standing = own
    .filter((o) => !o.driver.withdrawn)
    .sort((a, b) => Date.parse(a.driver.at) - Date.parse(b.driver.at) || a.id - b.id);

  return { active: standing[0] ?? null, reserves: standing.slice(1) };
}

/** The viewer's own offer, also a withdrawn one, to change instead of writing another. */
export function ownOffer<O extends Offer>(offers: O[], profileId: number | null): O | null {
  if (profileId === null) return null;
  return [...offers].sort((a, b) => a.id - b.id).find((o) => o.creator_id === profileId) ?? null;
}
