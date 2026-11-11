// What a screen needs to know about one round, worked out from the state:
// the orders that count, who drives, the sums and what the viewer may do.

import { DRIVERS, ORDERS } from '../model/config';
import { resolveDrivers } from '../model/driver';
import { onePerPerson, type Order } from '../model/order';
import { stage, type Stage } from '../model/round';
import { summarize, type Placed } from '../model/summary';
import { canWrite, emptyDetails, isEditor, state, viewerId, type RoundValue } from '../store/state';

const placed = (o: { id: number; creator_id: number | null; creator_username: string | null; order: Order }): Placed => ({
  id: o.id,
  creator_id: o.creator_id,
  creator_username: o.creator_username,
  order: o.order,
});

export function roundModel(value: RoundValue) {
  const details = state.details[value.id] ?? emptyDetails();
  const me = viewerId();
  const { kept, extras } = onePerPerson(details.orders);
  const drivers = resolveDrivers(details.drivers);
  const active = drivers.active;
  const driver = active ? { creator_id: active.creator_id, driver: active.driver } : null;
  const summary = summarize(value.round, kept.map(placed), driver);
  const st: Stage = stage(value.round, active?.driver.pickedUp ?? false, state.now);
  const mine = me === null ? null : (kept.find((o) => o.creator_id === me) ?? null);

  return {
    value,
    round: value.round,
    details,
    kept,
    extras,
    drivers,
    summary,
    stage: st,
    mine,
    me,
    iDrive: me !== null && active?.creator_id === me,
    iStandBy: me !== null && drivers.reserves.some((r) => r.creator_id === me),
    organizer: me !== null && value.creator_id === me,
    editor: isEditor(),
    canOrder: canWrite(ORDERS),
    canDrive: canWrite(DRIVERS),
  };
}

export type RoundModel = ReturnType<typeof roundModel>;

/** The viewer's draft in place of their saved order, for its live total and trip part. */
export function draftSummary(model: RoundModel, order: Order) {
  const others = model.kept.filter((o) => o.creator_id !== model.me).map(placed);
  const own: Placed = {
    id: model.mine?.id ?? Number.MAX_SAFE_INTEGER,
    creator_id: model.me,
    creator_username: model.mine?.creator_username ?? null,
    order,
  };
  const active = model.drivers.active;
  const summary = summarize(model.round, [...others, own], active ? { creator_id: active.creator_id, driver: active.driver } : null);
  return summary.entries.find((e) => e.id === own.id) ?? null;
}
