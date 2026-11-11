// Writing: orders, offers to drive and the driver's notes, rounds, the
// settings and the viewer's notifications. Potok checks each write against
// the collection's rule; what comes back goes into the state at once, and the
// same change arriving live later changes nothing.

import { DRIVERS, ORDERS, ROUNDS, amount, fromConfigData, settingsProblems, toConfigData } from '../model/config';
import { newDriver, ownOffer, resolveDrivers, toDriverData, type Driver } from '../model/driver';
import { toOrderData } from '../model/order';
import { roundProblems, toRoundData, type Round, type RoundStatus } from '../model/round';
import type { Translate } from '../i18n';
import type { PotokError } from '../potok';
import { loadDetails, myOrder, pendingOffer, putDriver, putOrder, putRound, refreshConfig, resetDraft } from './data';
import { state, toast, update, viewerId, type DriverValue, type RoundValue } from './state';

let t: Translate;

export function setActionsTranslator(translate: Translate) {
  t = translate;
}

export function errorText(error: PotokError): string {
  if (error.message) return error.message;
  switch (error.error) {
    case 'rate_limited':
      return t('errorRate');
    case 'forbidden':
    case 'not_a_member':
      return t('errorForbidden');
    case 'conflict':
      return t('errorConflict');
    case 'disconnected':
    case 'stale_app':
      return t('errorOffline');
    case 'closed':
      return t('errorClosed');
    default:
      return t('errorGeneric');
  }
}

/** One write at a time under `key`; the button shows it is busy. */
async function run(key: string, write: () => Promise<void>) {
  if (state.busy[key]) return;
  update((s) => (s.busy[key] = true));
  try {
    await write();
  } catch {
    toast(t('errorOffline'));
  } finally {
    update((s) => delete s.busy[key]);
  }
}

export function confirm(text: string, action: () => void, options: { danger?: boolean; label?: string } = {}) {
  update((s) => (s.dialog = { kind: 'confirm', text, action, danger: options.danger ?? true, label: options.label }));
}

// --- Screens ---

export function openRound(id: number) {
  update((s) => {
    s.screen = { kind: 'round', id };
    s.menu = null;
    s.costDraft = null;
    s.roundDraft = null;
    resetDraft(id, true);
  });
  if (!state.details[id]?.loaded) void loadDetails(id).then(() => update(() => resetDraft(id, true)));
  window.scrollTo(0, 0);
}

export function goList() {
  update((s) => {
    s.screen = { kind: 'list' };
    s.roundDraft = null;
    s.settingsDraft = null;
    s.menu = null;
  });
  window.scrollTo(0, 0);
}

// --- Orders ---

export function setLine(round: number, product: string, change: { qty?: number; own?: boolean }) {
  update((s) => {
    if (s.orderDraft?.round !== round) resetDraft(round, true);
    const draft = s.orderDraft!;
    const line = draft.lines[product] ?? { qty: 0, own: false };
    draft.lines[product] = { qty: change.qty ?? line.qty, own: change.own ?? line.own };
    draft.dirty = true;
  });
}

export function setOrderNote(round: number, note: string) {
  update((s) => {
    if (s.orderDraft?.round !== round) resetDraft(round, true);
    s.orderDraft!.note = note;
    s.orderDraft!.dirty = true;
  });
}

export function discardOrderChanges(round: number) {
  update(() => resetDraft(round, true));
}

export function saveOrder(round: number, empty = false) {
  return run(`order:${round}`, async () => {
    const draft = state.orderDraft;
    if (!draft || draft.round !== round) return;
    const data = toOrderData({ round, lines: empty ? {} : draft.lines, note: empty ? '' : draft.note });
    const existing = myOrder(round);
    if (!existing && Object.keys(data.lines).length === 0) return;

    const reply = existing
      ? await window.potok.updateValue(existing.id, data, { revision: existing.revision })
      : await window.potok.insertValue(data, { collection: ORDERS });

    if (!reply.ok) {
      toast(errorText(reply));
      if (reply.error === 'conflict') {
        await loadDetails(round);
        update(() => resetDraft(round, true));
      }
      return;
    }

    update((s) => s.orderDraft && (s.orderDraft.dirty = false));
    putOrder(reply.value);
    toast(Object.keys(data.lines).length === 0 ? t('orderCancelled') : t('orderSaved'));
  });
}

export function cancelOrder(round: number) {
  confirm(t('cancelOrderConfirm'), () => void saveOrder(round, true), { label: t('cancelOrder') });
}

export function deleteDuplicate(id: number, round: number) {
  return run(`delete:${id}`, async () => {
    const reply = await window.potok.deleteValue(id);
    if (!reply.ok) toast(errorText(reply));
    else await loadDetails(round);
  });
}

// --- Driving ---

function offers(round: number): DriverValue[] {
  return state.details[round]?.drivers ?? [];
}

// The driver's value takes one change at a time, each made on the newest copy,
// so ticking several boxes quickly loses none of them. Each change shows at
// once (see `pendingOffer`); a refused one goes away with a fresh read.
let driverChain: Promise<void> = Promise.resolve();

function changeOwnOffer(round: number, change: (driver: Driver) => Driver, key: string) {
  const own = ownOffer(offers(round), viewerId());
  if (!own) return driverChain;

  (pendingOffer[round] ??= []).push(change);
  update((s) => {
    const details = s.details[round];
    if (details) details.drivers = details.drivers.map((d) => (d.id === own.id ? { ...d, driver: change(d.driver) } : d));
  });

  const settle = () => {
    pendingOffer[round] = (pendingOffer[round] ?? []).filter((c) => c !== change);
  };

  driverChain = driverChain.then(async () => {
    let refused = false;
    await run(key, async () => {
      const current = ownOffer(offers(round), viewerId());
      if (!current) return;
      // The copy in the state already carries this change and the ones after it.
      const reply = await window.potok.updateValue(current.id, toDriverData(change(current.driver)));
      if (!reply.ok) {
        refused = true;
        toast(errorText(reply));
      } else {
        settle();
        putDriver(reply.value);
      }
    });
    if (refused || pendingOffer[round]?.includes(change)) {
      settle();
      await loadDetails(round);
    }
  });
  return driverChain;
}

export function volunteer(round: number) {
  return run(`drive:${round}`, async () => {
    const own = ownOffer(offers(round), viewerId());
    const now = Date.now();
    const data = own
      ? toDriverData({ ...own.driver, withdrawn: false, at: new Date(now).toISOString() })
      : toDriverData(newDriver(round, now));
    const reply = own ? await window.potok.updateValue(own.id, data) : await window.potok.insertValue(data, { collection: DRIVERS });
    if (!reply.ok) {
      toast(errorText(reply));
      return;
    }
    putDriver(reply.value);
    const { active } = resolveDrivers(offers(round));
    toast(active?.creator_id === viewerId() ? t('volunteered') : t('volunteeredReserve'));
  });
}

export function withdraw(round: number) {
  confirm(t('withdrawConfirm'), () => {
    void changeOwnOffer(round, (d) => ({ ...d, withdrawn: true }), `drive:${round}`).then(() => toast(t('withdrawn')));
  }, { label: t('withdraw') });
}

export function setCostDraft(round: number, text: string) {
  update((s) => (s.costDraft = { round, text }));
}

export function saveCost(round: number) {
  const text = state.costDraft?.round === round ? state.costDraft.text.replace(',', '.').trim() : '';
  const cost = text === '' ? null : amount(text, -1);
  if (cost !== null && cost < 0) return;
  return changeOwnOffer(round, (d) => ({ ...d, cost }), `cost:${round}`).then(() => {
    update((s) => (s.costDraft = null));
    toast(t('tripSaved'));
  });
}

export function setPickedUp(round: number, pickedUp: boolean) {
  return changeOwnOffer(round, (d) => ({ ...d, pickedUp }), `picked:${round}`);
}

export function setHandover(round: number, order: number, field: 'got' | 'paid', on: boolean) {
  return changeOwnOffer(
    round,
    (d) => {
      const current = d.handover[String(order)] ?? { got: false, paid: false };
      return { ...d, handover: { ...d.handover, [String(order)]: { ...current, [field]: on } } };
    },
    `handover:${order}:${field}`,
  );
}

// --- Rounds ---

export function openRoundForm(id: number | null, round: Round, drive = false) {
  update((s) => {
    s.roundDraft = { id, round: structuredClone(round), drive, tried: false };
    s.screen = { kind: 'form', id };
    s.menu = null;
  });
}

export function changeRoundDraft(change: (round: Round) => void) {
  update((s) => s.roundDraft && change(s.roundDraft.round));
}

export function saveRound() {
  return run('round', async () => {
    const draft = state.roundDraft;
    if (!draft) return;
    if (roundProblems(draft.round).length > 0) {
      update((s) => s.roundDraft && (s.roundDraft.tried = true));
      return;
    }

    const data = toRoundData(draft.round);
    const reply = draft.id === null
      ? await window.potok.insertValue(data, { collection: ROUNDS })
      : await window.potok.updateValue(draft.id, data);
    if (!reply.ok) {
      toast(errorText(reply));
      return;
    }

    putRound(reply.value);
    const id = reply.value.id;

    if (draft.id === null) {
      update((s) => (s.details[id] = { orders: [], drivers: [], loading: false, loaded: true, failed: false }));
      if (draft.drive) {
        const offer = await window.potok.insertValue(toDriverData(newDriver(id, Date.now())), { collection: DRIVERS });
        if (offer.ok) putDriver(offer.value);
        else toast(errorText(offer));
      }
    }

    update((s) => {
      s.roundDraft = null;
      s.screen = { kind: 'round', id };
      resetDraft(id, true);
    });
    toast(t('roundSaved'));
  });
}

export function setRoundStatus(value: RoundValue, status: RoundStatus) {
  return run(`status:${value.id}`, async () => {
    const reply = await window.potok.updateValue(value.id, toRoundData({ ...value.round, status }), { revision: value.revision });
    if (!reply.ok) {
      toast(errorText(reply));
      return;
    }
    putRound(reply.value);
    if (status === 'cancelled') toast(t('roundCancelled'));
  });
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** For editors: the round with its orders and offers, the children first. */
export function deleteRound(value: RoundValue) {
  confirm(t('deleteRoundConfirm'), () => {
    void run(`delete:${value.id}`, async () => {
      await loadDetails(value.id);
      const details = state.details[value.id];
      const ids = [...(details?.orders ?? []), ...(details?.drivers ?? [])].map((v) => v.id).concat(value.id);

      for (const id of ids) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const reply = await window.potok.deleteValue(id);
          if (reply.ok || reply.error === 'not_found') break;
          if (reply.error !== 'rate_limited') {
            toast(errorText(reply));
            return;
          }
          await pause(1_000);
        }
      }

      update((s) => {
        s.rounds = s.rounds.filter((r) => r.id !== value.id);
        delete s.details[value.id];
        s.screen = { kind: 'list' };
      });
      toast(t('roundDeleted'));
    });
  }, { label: t('deleteRound') });
}

// --- Settings ---

export function openSettings() {
  update((s) => {
    s.settingsDraft = structuredClone(s.settings);
    s.settingsTried = false;
    s.screen = { kind: 'settings' };
    s.menu = null;
  });
}

export function saveSettings() {
  return run('settings', async () => {
    const draft = state.settingsDraft;
    if (!draft) return;
    if (settingsProblems(draft).length > 0) {
      update((s) => (s.settingsTried = true));
      return;
    }

    const reply = await window.potok.saveConfig(toConfigData(draft), { revision: state.revision });
    if (!reply.ok) {
      if (reply.error === 'conflict') {
        await refreshConfig();
        update((s) => (s.settingsDraft = structuredClone(s.settings)));
        toast(t('settingsConflict'));
      } else toast(errorText(reply));
      return;
    }

    update((s) => {
      s.settings = fromConfigData(reply.config.data, t('defaultProduct'));
      s.revision = reply.config.revision;
      s.settingsDraft = null;
      s.settingsTried = false;
      s.fresh = false;
      s.screen = { kind: 'list' };
    });
    // The rules changed with the roles: what the viewer may do comes again.
    await refreshConfig();
    toast(t('settingsSaved'));
  });
}

// --- Notifications ---

export function setNotify(collection: string, on: boolean) {
  return run(`notify:${collection}`, async () => {
    const reply = await window.potok.setNotifications(collection, on);
    if (!reply.ok) {
      toast(errorText(reply));
      return;
    }
    update((s) => {
      const caps = s.reply?.caps[collection];
      if (caps) caps.notify = reply.on;
    });
  });
}

// --- Copying ---

export async function copyText(text: string, fieldId: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied'));
  } catch {
    const field = document.getElementById(fieldId) as HTMLTextAreaElement | null;
    field?.focus();
    field?.select();
    toast(t('copyFailed'));
  }
}
