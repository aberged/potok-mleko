// The icons an editor can pick for a product, by its unit: what is sold by the
// litre comes in bottles, cans and jars, what is sold by the kilogram is
// weighed, what is sold by the piece is counted. The first of each list is the
// unit's default. The drawings are in views/product-icons.ts.

import type { Unit } from './config';

export const PRODUCT_ICONS = {
  l: ['bottle', 'can', 'jar', 'wine', 'drop', 'glass'],
  kg: ['sack', 'cheese', 'meat', 'fruit', 'vegetable', 'honey', 'jar'],
  kom: ['box', 'egg', 'bread', 'chicken', 'seedling', 'cake'],
} as const satisfies Record<Unit, readonly string[]>;

export type ProductIcon = (typeof PRODUCT_ICONS)[Unit][number];

export function defaultIcon(unit: Unit): ProductIcon {
  return PRODUCT_ICONS[unit][0];
}

/** `value` when the unit offers it, else the unit's default: for reading data and for a change of unit. */
export function iconFor(unit: Unit, value: unknown): ProductIcon {
  const icons: readonly string[] = PRODUCT_ICONS[unit];
  return typeof value === 'string' && icons.includes(value) ? (value as ProductIcon) : defaultIcon(unit);
}
