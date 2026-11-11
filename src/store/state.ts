// One state for the whole app and one way to change it. Every change draws the
// page again on the next frame; lit-html touches only what changed, so typing
// keeps its cursor.

import type { PotokCollectionValue, PotokConfigReply, PotokData, PotokRole } from '../potok';
import { defaultSettings, type Settings } from '../model/config';
import type { Driver } from '../model/driver';
import type { Line, Order } from '../model/order';
import type { Round } from '../model/round';

export type Phase = 'loading' | 'failed' | 'outdated' | 'previewFrame' | 'denied' | 'setup' | 'ready';

export type Screen =
  | { kind: 'list' }
  | { kind: 'round'; id: number }
  | { kind: 'form'; id: number | null }
  | { kind: 'settings' };

export type Value = PotokCollectionValue<PotokData>;
export type RoundValue = Value & { round: Round };
export type OrderValue = Value & { order: Order };
export type DriverValue = Value & { driver: Driver };

export type Details = {
  orders: OrderValue[];
  drivers: DriverValue[];
  loading: boolean;
  loaded: boolean;
  failed: boolean;
};

export type OrderDraft = { round: number; lines: Record<string, Line>; note: string; dirty: boolean };
export type RoundDraft = { id: number | null; round: Round; drive: boolean; tried: boolean };

export type Dialog = { kind: 'confirm'; text: string; action: () => void; danger?: boolean; label?: string };

export type State = {
  phase: Phase;
  reply: PotokConfigReply | null;
  groupName: string;
  settings: Settings;
  /** The config's revision the settings came from. */
  revision: number;
  roles: PotokRole[] | null;
  screen: Screen;
  rounds: RoundValue[];
  roundsMore: boolean;
  roundsLoading: boolean;
  roundsLoaded: boolean;
  details: Record<number, Details>;
  /** The viewer's own orders by round, for the earlier rounds' rows. */
  mine: Record<number, OrderValue>;
  orderDraft: OrderDraft | null;
  roundDraft: RoundDraft | null;
  settingsDraft: Settings | null;
  settingsTried: boolean;
  /** The editor just made the config: the settings open with a word on what to fill in. */
  fresh: boolean;
  costDraft: { round: number; text: string } | null;
  /** Writes under way, by what they change. */
  busy: Record<string, true>;
  dialog: Dialog | null;
  menu: string | null;
  toast: string | null;
  now: number;
};

export const state: State = {
  phase: 'loading',
  reply: null,
  groupName: '',
  settings: defaultSettings(''),
  revision: 0,
  roles: null,
  screen: { kind: 'list' },
  rounds: [],
  roundsMore: false,
  roundsLoading: false,
  roundsLoaded: false,
  details: {},
  mine: {},
  orderDraft: null,
  roundDraft: null,
  settingsDraft: null,
  settingsTried: false,
  fresh: false,
  costDraft: null,
  busy: {},
  dialog: null,
  menu: null,
  toast: null,
  now: Date.now(),
};

let draw: () => void = () => {};
let scheduled = false;

export function onChange(render: () => void) {
  draw = render;
}

/** Changes the state and draws on the next frame. */
export function update(change: (current: State) => void) {
  change(state);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    draw();
  });
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function toast(text: string) {
  update((s) => {
    s.toast = text;
  });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => update((s) => (s.toast = null)), 4_000);
}

export const emptyDetails = (): Details => ({ orders: [], drivers: [], loading: false, loaded: false, failed: false });

export const viewerId = () => state.reply?.viewer.profile_id ?? null;
export const isEditor = () => state.reply?.manage === true;
export const caps = (collection: string) => state.reply?.caps[collection] ?? null;
export const canWrite = (collection: string) => caps(collection)?.write === true;
