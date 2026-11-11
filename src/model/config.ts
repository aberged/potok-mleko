// The app's settings, kept in Potok's config (one value that only editors
// save): the producer, what can be ordered from them, how the trip is paid
// and who may do what. The rules of the three collections come from the
// roles chosen here, so Potok checks every write against them.

import type { PotokConfigData, PotokRoleKey, PotokRule } from '../potok';
import { newId } from './ids';

export const ROUNDS = 'rounds';
export const ORDERS = 'orders';
export const DRIVERS = 'drivers';

export type Unit = 'l' | 'kg' | 'kom';
export const UNITS: Unit[] = ['l', 'kg', 'kom'];

/** The producer's own packaging: a bottle (or a jar) of `size` units for `price`. */
export type Pack = { name: string; size: number; price: number };

export type Product = {
  id: string;
  name: string;
  unit: Unit;
  /** Per unit, in the producer's own packaging left aside. */
  price: number;
  /** What one press of + adds. */
  step: number;
  pack: Pack | null;
  /** Offered in new rounds. */
  active: boolean;
};

/** How the trip is shared: the same part for every order, or by what each order costs. */
export type Split = 'equal' | 'amount';

export type Producer = { name: string; place: string; phone: string; note: string };

export type Settings = {
  producer: Producer;
  products: Product[];
  split: Split;
  /** Where neighbours usually take their goods. */
  meetPlace: string;
  /** Who may start a round. */
  organize: PotokRoleKey[];
  /** Who may order and drive. */
  order: PotokRoleKey[];
};

export const MAX_PRODUCTS = 30;
export const MAX_QTY = 999;
export const MAX_PRICE = 1_000_000;

export function defaultStep(unit: Unit): number {
  return unit === 'kom' ? 1 : unit === 'kg' ? 0.25 : 0.5;
}

export function newProduct(name = '', unit: Unit = 'l'): Product {
  return { id: newId(), name, unit, price: 0, step: defaultStep(unit), pack: null, active: true };
}

export function defaultSettings(productName: string): Settings {
  return {
    producer: { name: '', place: '', phone: '', note: '' },
    products: [newProduct(productName, 'l')],
    split: 'equal',
    meetPlace: '',
    organize: ['everyone'],
    order: ['everyone'],
  };
}

const text = (value: unknown, max = 200) => (typeof value === 'string' ? value.slice(0, max) : '');

/** A number of at most two decimals in [min, max], or `fallback`. */
export function amount(value: unknown, fallback: number, min = 0, max = MAX_PRICE): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return Math.round(n * 100) / 100;
}

/** A quantity of at most three decimals. */
export function quantity(value: unknown, fallback: number, min = 0, max = MAX_QTY): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return Math.round(n * 1000) / 1000;
}

function unit(value: unknown): Unit {
  return value === 'kg' || value === 'kom' ? value : 'l';
}

function pack(value: unknown): Pack | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const size = quantity(raw.size, 0);
  if (size <= 0) return null;
  return { name: text(raw.name, 60), size, price: amount(raw.price, 0) };
}

export function product(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = text(raw.id, 40);
  if (!id) return null;
  const u = unit(raw.unit);
  const step = quantity(raw.step, defaultStep(u));

  return {
    id,
    name: text(raw.name, 80),
    unit: u,
    price: amount(raw.price, 0),
    step: step > 0 ? step : defaultStep(u),
    pack: pack(raw.pack),
    active: raw.active !== false,
  };
}

function roleKeys(value: unknown): PotokRoleKey[] {
  if (!Array.isArray(value)) return ['everyone'];
  const keys = value.filter((key): key is string => typeof key === 'string' && key.trim() !== '');
  return keys.length > 0 ? [...new Set(keys)].slice(0, 50) : ['everyone'];
}

/** What a config holds, made safe to use: anything missing or wrong takes its default. */
export function fromConfigData(data: unknown, productName = ''): Settings {
  const base = defaultSettings(productName);
  if (!data || typeof data !== 'object') return base;
  const raw = data as Record<string, unknown>;
  const producer = (raw.producer && typeof raw.producer === 'object' ? raw.producer : {}) as Record<string, unknown>;
  const products = Array.isArray(raw.products)
    ? raw.products.map(product).filter((p): p is Product => p !== null).slice(0, MAX_PRODUCTS)
    : base.products;
  const roles = (raw.roles && typeof raw.roles === 'object' ? raw.roles : {}) as Record<string, unknown>;

  return {
    producer: {
      name: text(producer.name, 120),
      place: text(producer.place, 200),
      phone: text(producer.phone, 60),
      note: text(producer.note, 1000),
    },
    products,
    split: raw.split === 'amount' ? 'amount' : 'equal',
    meetPlace: text(raw.meet_place, 200),
    organize: roleKeys(roles.organize),
    order: roleKeys(roles.order),
  };
}

export function productData(p: Product) {
  return {
    id: p.id,
    name: p.name.trim(),
    unit: p.unit,
    price: p.price,
    step: p.step,
    pack: p.pack ? { name: p.pack.name.trim(), size: p.pack.size, price: p.pack.price } : null,
    active: p.active,
  };
}

/** Everyone reads; each writes and changes only their own. */
export function rulesFor(settings: Settings): Record<string, PotokRule> {
  const rule = (write: PotokRoleKey[]): PotokRule => ({ write, read: ['everyone'], edit_own: true });

  return {
    [ROUNDS]: rule(settings.organize),
    [ORDERS]: rule(settings.order),
    [DRIVERS]: rule(settings.order),
  };
}

export function toConfigData(settings: Settings): PotokConfigData {
  return {
    v: 1,
    producer: {
      name: settings.producer.name.trim(),
      place: settings.producer.place.trim(),
      phone: settings.producer.phone.trim(),
      note: settings.producer.note.trim(),
    },
    products: settings.products.map(productData),
    split: settings.split,
    meet_place: settings.meetPlace.trim(),
    roles: { organize: roleKeys(settings.organize), order: roleKeys(settings.order) },
    rules: rulesFor(settings),
  };
}

/** What keeps the settings from being saved, as keys of the app's words. */
export function settingsProblems(settings: Settings): ('noProducts' | 'productName' | 'packSize')[] {
  const problems: ('noProducts' | 'productName' | 'packSize')[] = [];
  if (settings.products.length === 0) problems.push('noProducts');
  if (settings.products.some((p) => p.name.trim() === '')) problems.push('productName');
  if (settings.products.some((p) => p.pack !== null && !(p.pack.size > 0))) problems.push('packSize');
  return problems;
}
