// Reading: the config, the rounds page by page, each round's orders and
// offers to drive, the viewer's own orders, and every change Potok sends from
// then on. Values come in as they are stored and are parsed once, here.

import { DRIVERS, fromConfigData, ORDERS, ROUNDS, defaultSettings, toConfigData } from '../model/config';
import { fromDriverData, type Driver } from '../model/driver';
import { fromOrderData, onePerPerson } from '../model/order';
import { fromRoundData, upcoming } from '../model/round';
import type { Translate } from '../i18n';
import type { PotokConfigReply, PotokError, PotokValueChange } from '../potok';
import {
  emptyDetails,
  state,
  toast,
  update,
  viewerId,
  type DriverValue,
  type OrderValue,
  type RoundValue,
  type Value,
} from './state';

let t: Translate;

export const asRound = (v: Value): RoundValue | null => {
  const round = fromRoundData(v.data);
  return round ? { ...v, round } : null;
};

export const asOrder = (v: Value): OrderValue | null => {
  const order = fromOrderData(v.data);
  return order ? { ...v, order } : null;
};

export const asDriver = (v: Value): DriverValue | null => {
  const driver = fromDriverData(v.data);
  return driver ? { ...v, driver } : null;
};

function upsert<T extends { id: number }>(list: T[], item: T): T[] {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) return [...list, item].sort((a, b) => a.id - b.id);
  const copy = [...list];
  copy[index] = item;
  return copy;
}

const PAGE = 20;
let unsubscribe: (() => void) | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;

export async function boot(translate: Translate) {
  t = translate;
  update((s) => (s.phase = 'loading'));

  let first: PotokConfigReply | PotokError;
  try {
    first = await window.potok.getConfig();
  } catch {
    update((s) => (s.phase = 'failed'));
    return;
  }

  if (!first.ok) {
    const error = first.error;
    update((s) => {
      if (error === 'unknown_method') s.phase = 'outdated';
      else if (error === 'preview') s.phase = 'previewFrame';
      else if (error === 'not_a_member' || error === 'forbidden') s.phase = 'denied';
      else s.phase = 'failed';
    });
    return;
  }

  let reply: PotokConfigReply = first;
  const group = await window.potok.getGroup().catch(() => null);
  const groupName = group?.ok ? group.group.name : '';

  if (!reply.config) {
    if (!reply.manage) {
      const waiting = reply;
      update((s) => {
        s.reply = waiting;
        s.groupName = groupName;
        s.phase = 'setup';
      });
      return;
    }

    // The first editor to open the app makes its config, so the collections
    // have their rules before anyone writes, then fills in the settings.
    const saved = await window.potok.saveConfig(toConfigData(defaultSettings(t('defaultProduct'))), { revision: 0 }).catch(() => null);
    const again = saved?.ok || saved?.error === 'conflict' ? await window.potok.getConfig().catch(() => null) : null;
    if (!again?.ok || !again.config) {
      update((s) => (s.phase = 'failed'));
      return;
    }
    reply = again;
    update((s) => {
      s.fresh = true;
      s.screen = { kind: 'settings' };
    });
  }

  const ready = reply;
  const config = ready.config!;
  update((s) => {
    s.reply = ready;
    s.groupName = groupName;
    s.settings = fromConfigData(config.data, t('defaultProduct'));
    s.revision = config.revision;
    s.phase = 'ready';
    if (s.screen.kind === 'settings') s.settingsDraft = structuredClone(s.settings);
  });

  if (reply.manage) void loadRoles();
  void loadRounds();
  void loadMine();
  listen();

  if (ticker) clearInterval(ticker);
  ticker = setInterval(() => update((s) => (s.now = Date.now())), 30_000);
}

export async function loadRoles() {
  const roles = await window.potok.listRoles().catch(() => null);
  update((s) => (s.roles = roles?.ok ? roles.roles : []));
}

/** After the config changed: the new settings and what the viewer may do now. */
export async function refreshConfig() {
  const reply = await window.potok.getConfig().catch(() => null);
  if (!reply?.ok || !reply.config) return;
  const config = reply.config;

  update((s) => {
    const untouched = s.settingsDraft && JSON.stringify(s.settingsDraft) === JSON.stringify(s.settings);
    s.reply = reply;
    s.settings = fromConfigData(config.data, t('defaultProduct'));
    s.revision = config.revision;
    if (untouched) s.settingsDraft = structuredClone(s.settings);
  });
}

export async function loadRounds(more = false) {
  if (state.roundsLoading) return;
  update((s) => (s.roundsLoading = true));

  const oldest = state.rounds.length > 0 ? Math.min(...state.rounds.map((r) => r.id)) : undefined;
  const reply = await window.potok
    .listValues({ collection: ROUNDS, orderDir: 'desc', limit: PAGE, beforeId: more ? oldest : undefined })
    .catch(() => null);

  if (!reply?.ok) {
    update((s) => (s.roundsLoading = false));
    if (more) toast(t('errorOffline'));
    else update((s) => (s.phase = 'failed'));
    return;
  }

  const parsed = reply.values.map(asRound).filter((r): r is RoundValue => r !== null);
  update((s) => {
    s.rounds = more ? parsed.reduce(upsert, s.rounds) : parsed.sort((a, b) => a.id - b.id);
    s.roundsMore = reply.has_more;
    s.roundsLoading = false;
    s.roundsLoaded = true;
  });

  for (const round of parsed) {
    if (upcoming(round.round, Date.now())) void loadDetails(round.id);
  }
}

async function every(collection: string, round: number): Promise<Value[]> {
  const values: Value[] = [];
  let afterId: number | undefined;

  for (let page = 0; page < 20; page++) {
    const reply = await window.potok.listValues({ collection, match: { round }, limit: 100, afterId });
    if (!reply.ok) throw new Error(reply.error);
    values.push(...reply.values);
    if (!reply.has_more || reply.values.length === 0) break;
    afterId = reply.values[reply.values.length - 1].id;
  }

  return values;
}

/** A round's orders and offers to drive, all of them. */
export async function loadDetails(round: number) {
  const current = state.details[round];
  if (current?.loading) return;
  update((s) => (s.details[round] = { ...(s.details[round] ?? emptyDetails()), loading: true, failed: false }));

  try {
    const [orders, drivers] = await Promise.all([every(ORDERS, round), every(DRIVERS, round)]);
    update((s) => {
      s.details[round] = {
        orders: orders.map(asOrder).filter((o): o is OrderValue => o !== null && o.order.round === round),
        drivers: drivers
          .map(asDriver)
          .filter((d): d is DriverValue => d !== null && d.driver.round === round)
          .map(withPending),
        loading: false,
        loaded: true,
        failed: false,
      };
      resetDraft(s.orderDraft?.round ?? null);
    });
  } catch {
    update((s) => (s.details[round] = { ...(s.details[round] ?? emptyDetails()), loading: false, failed: true }));
  }
}

/** The viewer's own orders, newest first, for the rows of earlier rounds. */
export async function loadMine() {
  const reply = await window.potok.listValues({ collection: ORDERS, mine: true, orderDir: 'desc', limit: 100 }).catch(() => null);
  if (!reply?.ok) return;

  update((s) => {
    const mine: Record<number, OrderValue> = {};
    for (const order of reply.values.map(asOrder)) {
      if (order && (!mine[order.order.round] || order.id < mine[order.order.round].id)) mine[order.order.round] = order;
    }
    s.mine = mine;
  });
}

/** The order of the viewer that counts in a round: the earliest of theirs. */
export function myOrder(round: number): OrderValue | null {
  const me = viewerId();
  if (me === null) return null;
  const details = state.details[round];
  if (details?.loaded) return onePerPerson(details.orders).kept.find((o) => o.creator_id === me) ?? null;
  return state.mine[round] ?? null;
}

/** The draft of the viewer's order follows their saved order until they change something. */
export function resetDraft(round: number | null, force = false) {
  if (round === null) return;
  const s = state;
  if (!force && s.orderDraft?.round === round && s.orderDraft.dirty) return;
  const mine = myOrder(round);
  s.orderDraft = {
    round,
    lines: structuredClone(mine?.order.lines ?? {}),
    note: mine?.order.note ?? '',
    dirty: false,
  };
}

export function putRound(value: Value) {
  const round = asRound(value);
  if (!round) return;
  const isNew = !state.rounds.some((r) => r.id === round.id);
  update((s) => (s.rounds = upsert(s.rounds, round)));
  if (isNew && upcoming(round.round, Date.now()) && !state.details[round.id]) void loadDetails(round.id);
}

export function putOrder(value: Value) {
  const order = asOrder(value);
  if (!order) return;

  update((s) => {
    const details = s.details[order.order.round];
    if (details?.loaded) details.orders = upsert(details.orders, order);
    if (order.creator_id !== null && order.creator_id === viewerId()) {
      const known = s.mine[order.order.round];
      if (!known || order.id <= known.id) s.mine[order.order.round] = order;
    }
    if (s.orderDraft?.round === order.order.round) resetDraft(order.order.round);
  });
}

/**
 * Changes to the viewer's own offer that are still on their way, by round.
 * They show at once, and stay on top of any copy that comes back meanwhile,
 * so a box ticked right after another does not flick off and on again.
 */
export const pendingOffer: Record<number, ((driver: Driver) => Driver)[]> = {};

export function withPending(value: DriverValue): DriverValue {
  const pending = pendingOffer[value.driver.round];
  if (!pending?.length || value.creator_id === null || value.creator_id !== viewerId()) return value;
  return { ...value, driver: pending.reduce((driver, change) => change(driver), value.driver) };
}

export function putDriver(value: Value) {
  const parsed = asDriver(value);
  if (!parsed) return;
  const driver = withPending(parsed);

  update((s) => {
    const details = s.details[driver.driver.round];
    if (details?.loaded) details.drivers = upsert(details.drivers, driver);
  });
}

function removeEverywhere(id: number) {
  update((s) => {
    const wasRound = s.rounds.some((r) => r.id === id);
    s.rounds = s.rounds.filter((r) => r.id !== id);
    for (const details of Object.values(s.details)) {
      details.orders = details.orders.filter((o) => o.id !== id);
      details.drivers = details.drivers.filter((d) => d.id !== id);
    }
    for (const [round, order] of Object.entries(s.mine)) {
      if (order.id === id) delete s.mine[Number(round)];
    }
    if (wasRound) delete s.details[id];
    if (wasRound && (s.screen.kind === 'round' || s.screen.kind === 'form') && s.screen.id === id) {
      s.screen = { kind: 'list' };
      s.roundDraft = null;
      toast(t('roundNotFound'));
    }
    if (s.orderDraft) resetDraft(s.orderDraft.round);
  });
}

async function reloadAll() {
  update((s) => {
    s.details = {};
    s.mine = {};
  });
  await loadRounds();
  await loadMine();
}

function listen() {
  unsubscribe?.();
  unsubscribe = window.potok.onValues((change: PotokValueChange) => {
    if (change.event === 'config') {
      void refreshConfig();
      return;
    }
    if (change.event === 'cleared') {
      void reloadAll();
      return;
    }
    if (change.event === 'regraded') return;
    if (change.event === 'deleted') {
      removeEverywhere(change.id);
      return;
    }

    const value = change.value as Value;
    if (change.collection === ROUNDS) putRound(value);
    else if (change.collection === ORDERS) putOrder(value);
    else if (change.collection === DRIVERS) putDriver(value);
  });
}
