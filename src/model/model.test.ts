import { describe, expect, it } from 'vitest';
import { keys, toCyrillic, translator } from '../i18n';
import { defaultSettings, fromConfigData, rulesFor, settingsProblems, toConfigData, type Product } from './config';
import { fromDriverData, newDriver, ownOffer, resolveDrivers, toDriverData, type Driver } from './driver';
import { fromLocalInput, left, money, toLocalInput } from './format';
import { bottlesFor, droppedLines, fromOrderData, lineCost, onePerPerson, orderCost, toOrderData } from './order';
import { DONE_AFTER, fromRoundData, newRound, roundProblems, stage, toRoundData, withNewProducts, type Round } from './round';
import { shareTrip } from './split';
import { summarize, type Placed } from './summary';

const milk: Product = { id: 'mleko', name: 'Mleko', unit: 'l', price: 120, step: 0.5, pack: { name: 'flaša', size: 1.5, price: 30 }, active: true };
const cheese: Product = { id: 'sir', name: 'Sir', unit: 'kg', price: 900, step: 0.25, pack: null, active: true };
const eggs: Product = { id: 'jaja', name: 'Jaja', unit: 'kom', price: 25, step: 10, pack: null, active: false };

const T0 = Date.parse('2026-11-14T08:00:00.000Z');
const hour = 3_600_000;

function round(extra: Partial<Round> = {}): Round {
  return {
    farmAt: new Date(T0).toISOString(),
    closesAt: new Date(T0 - 12 * hour).toISOString(),
    meetAt: new Date(T0 + 2 * hour).toISOString(),
    meetPlace: 'Ulaz 3',
    bottlesNote: '',
    note: '',
    status: 'open',
    products: [milk, cheese, eggs],
    split: 'equal',
    ...extra,
  };
}

describe('prices and packaging', () => {
  it('charges the producer’s bottles by whole ones, unless the neighbour brings their own', () => {
    expect(lineCost(milk, { qty: 3, own: false })).toMatchObject({ goods: 360, bottles: 2, packaging: 60, total: 420 });
    expect(lineCost(milk, { qty: 2, own: false })).toMatchObject({ bottles: 2, packaging: 60 });
    expect(lineCost(milk, { qty: 3, own: true })).toMatchObject({ goods: 360, bottles: 0, packaging: 0, total: 360 });
    expect(lineCost(cheese, { qty: 0.75, own: false })).toMatchObject({ goods: 675, bottles: 0, total: 675 });
  });

  it('does not count a bottle too many on a float’s tail', () => {
    expect(bottlesFor(milk, 4.5)).toBe(3);
    expect(bottlesFor(milk, 1.5)).toBe(1);
    expect(bottlesFor({ ...milk, pack: { name: '', size: 0.1, price: 1 } }, 1.1)).toBe(11);
    expect(bottlesFor({ ...milk, pack: { name: '', size: 0.1, price: 1 } }, 0.7)).toBe(7);
    expect(bottlesFor(milk, 0)).toBe(0);
    expect(bottlesFor(cheese, 3)).toBe(0);
  });

  it('counts only the products the round offers', () => {
    const order = { round: 1, lines: { mleko: { qty: 1.5, own: false }, jaja: { qty: 10, own: false }, gone: { qty: 1, own: false } }, note: '' };
    const cost = orderCost(round(), order);
    expect(cost.lines.map((l) => l.product.id)).toEqual(['mleko']);
    expect(cost.total).toBe(210);
    expect(droppedLines(round(), order).sort()).toEqual(['gone', 'jaja']);
  });

  it('reads orders safely and keeps only real quantities', () => {
    expect(fromOrderData({ round: 'x', lines: {} })).toBeNull();
    expect(fromOrderData({ round: 7, lines: { a: { qty: 0 }, b: { qty: -1 }, c: { qty: '2', own: true }, d: 'no' } })).toEqual({
      round: 7,
      lines: { c: { qty: 2, own: true } },
      note: '',
    });
    expect(toOrderData({ round: 7, lines: { a: { qty: 0, own: false }, b: { qty: 1, own: false } }, note: ' x ' })).toEqual({
      v: 1,
      round: 7,
      lines: { b: { qty: 1, own: false } },
      note: 'x',
    });
  });
});

describe('sharing the trip', () => {
  it('splits equally in whole dinars that add up to the cost', () => {
    const parts = shareTrip(800, [{ id: 3, amount: 100 }, { id: 1, amount: 900 }, { id: 2, amount: 50 }], 'equal');
    expect([...parts.values()].reduce((a, b) => a + b, 0)).toBe(800);
    expect(parts.get(1)).toBe(267);
    expect(parts.get(2)).toBe(267);
    expect(parts.get(3)).toBe(266);
  });

  it('splits by what each order costs', () => {
    const parts = shareTrip(1000, [{ id: 1, amount: 300 }, { id: 2, amount: 700 }], 'amount');
    expect(parts.get(1)).toBe(300);
    expect(parts.get(2)).toBe(700);

    const odd = shareTrip(100, [{ id: 1, amount: 1 }, { id: 2, amount: 1 }, { id: 3, amount: 1 }], 'amount');
    expect([...odd.values()].reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('falls back to equal parts when nothing has a price, and gives zeros without a cost', () => {
    expect([...shareTrip(90, [{ id: 1, amount: 0 }, { id: 2, amount: 0 }], 'amount').values()]).toEqual([45, 45]);
    expect([...shareTrip(0, [{ id: 1, amount: 10 }], 'equal').values()]).toEqual([0]);
    expect(shareTrip(500, [], 'equal').size).toBe(0);
  });
});

describe('rounds', () => {
  it('goes from taking orders to done', () => {
    const r = round();
    expect(stage(r, false, T0 - 13 * hour)).toBe('open');
    expect(stage(r, false, T0 - 11 * hour)).toBe('closed');
    expect(stage({ ...r, status: 'closed' }, false, T0 - 13 * hour)).toBe('closed');
    expect(stage(r, true, T0 + hour)).toBe('picked');
    expect(stage(r, true, T0 + 2 * hour + DONE_AFTER + 1)).toBe('done');
    expect(stage({ ...r, status: 'cancelled' }, false, T0 - 13 * hour)).toBe('cancelled');
  });

  it('wants orders to close before the trip and the handing out after it', () => {
    expect(roundProblems(round())).toEqual([]);
    expect(roundProblems(round({ closesAt: new Date(T0 + hour).toISOString() }))).toContain('order');
    expect(roundProblems(round({ meetAt: new Date(T0 - hour).toISOString() }))).toContain('order');
    expect(roundProblems(round({ products: [{ ...milk, active: false }] }))).toContain('noProducts');
    expect(roundProblems(round({ products: [{ ...milk, name: ' ' }] }))).toContain('productName');
  });

  it('keeps its own copy of the products and reads back what it wrote', () => {
    const settings = { ...defaultSettings('Mleko'), products: [milk, eggs], meetPlace: 'Kod česme' };
    const r = newRound(settings, T0);
    expect(r.products.map((p) => p.id)).toEqual(['mleko']);
    expect(r.meetPlace).toBe('Kod česme');
    expect(roundProblems(r)).toEqual([]);
    expect(fromRoundData(toRoundData(r))).toEqual(r);
    expect(withNewProducts(r, settings).map((p) => [p.id, p.active])).toEqual([['mleko', true], ['jaja', false]]);
    expect(fromRoundData({ farm_at: 'x' })).toBeNull();
  });
});

describe('who goes for the goods', () => {
  const offer = (id: number, creator: number, at: number, withdrawn = false) => ({
    id,
    creator_id: creator,
    driver: { ...newDriver(1, at), withdrawn } as Driver,
  });

  it('takes the earliest offer that stands, the others stand by', () => {
    const { active, reserves } = resolveDrivers([offer(3, 30, T0 + 2), offer(1, 10, T0), offer(2, 20, T0 + 1)]);
    expect(active?.creator_id).toBe(10);
    expect(reserves.map((r) => r.creator_id)).toEqual([20, 30]);
  });

  it('skips a withdrawn offer, and an offer made again goes to the back', () => {
    const { active } = resolveDrivers([offer(1, 10, T0, true), offer(2, 20, T0 + 1)]);
    expect(active?.creator_id).toBe(20);

    const again = resolveDrivers([offer(1, 10, T0 + 5), offer(2, 20, T0 + 1)]);
    expect(again.active?.creator_id).toBe(20);
    expect(again.reserves.map((r) => r.creator_id)).toEqual([10]);
  });

  it('counts each person once and finds the viewer’s own offer, also a withdrawn one', () => {
    const offers = [offer(1, 10, T0), offer(2, 10, T0 - 1), offer(3, 20, T0 + 1, true)];
    expect(resolveDrivers(offers).reserves).toEqual([]);
    expect(resolveDrivers(offers).active?.id).toBe(1);
    expect(ownOffer(offers, 20)?.id).toBe(3);
    expect(ownOffer(offers, null)).toBeNull();
  });

  it('reads and writes the driver’s notes', () => {
    const d: Driver = { round: 4, at: new Date(T0).toISOString(), withdrawn: false, cost: 600, pickedUp: true, handover: { '9': { got: true, paid: false }, '8': { got: false, paid: false } } };
    expect(fromDriverData(toDriverData(d))).toEqual({ ...d, handover: { '9': { got: true, paid: false } } });
    expect(fromDriverData({ round: 4, cost: -5 })?.cost).toBeNull();
  });
});

describe('one order per person', () => {
  it('keeps the earliest and calls the rest extras', () => {
    const { kept, extras } = onePerPerson([
      { id: 5, creator_id: 1 },
      { id: 2, creator_id: 1 },
      { id: 3, creator_id: 2 },
    ]);
    expect(kept.map((v) => v.id)).toEqual([2, 3]);
    expect(extras.map((v) => v.id)).toEqual([5]);
  });
});

describe('what a round adds up to', () => {
  const placed = (id: number, creator: number, lines: Placed['order']['lines']): Placed => ({
    id,
    creator_id: creator,
    creator_username: `n${creator}`,
    order: { round: 1, lines, note: '' },
  });

  const orders = [
    placed(10, 1, { mleko: { qty: 3, own: false } }),
    placed(11, 2, { mleko: { qty: 2, own: true }, sir: { qty: 1, own: false } }),
    placed(12, 3, {}),
    placed(13, 4, { mleko: { qty: 1, own: false } }),
  ];
  const driver: Driver = { round: 1, at: '', withdrawn: false, cost: 300, pickedUp: false, handover: { '11': { got: true, paid: true }, '10': { got: true, paid: false } } };

  it('sums for the producer, leaves out empty orders and shares the trip among the rest', () => {
    const s = summarize(round(), orders, { creator_id: 4, driver });
    expect(s.entries.map((e) => e.id)).toEqual([10, 11, 13]);
    expect(s.products.find((p) => p.product.id === 'mleko')).toMatchObject({ qty: 6, ownQty: 2, bottles: 3 });
    expect(s.goods).toBe(6 * 120 + 900);
    expect(s.packaging).toBe(90);
    expect(s.producerTotal).toBe(720 + 900 + 90);
    expect(s.entries.map((e) => e.share)).toEqual([100, 100, 100]);
    expect(s.entries.find((e) => e.id === 10)?.due).toBe(420 + 100);
  });

  it('counts what the driver takes from the others and how far handing out went', () => {
    const s = summarize(round(), orders, { creator_id: 4, driver });
    expect(s.entries.find((e) => e.id === 13)?.driver).toBe(true);
    expect(s.fromOthers).toBe(520 + 240 + 900 + 100);
    expect(s.collected).toBe(240 + 900 + 100);
    expect(s.handedOut).toBe(2);
    expect(s.paid).toBe(1);
    expect(s.ownPackers.map((e) => e.id)).toEqual([11]);
  });

  it('has no trip part until the driver writes a cost', () => {
    const s = summarize(round(), orders, null);
    expect(s.tripCost).toBeNull();
    expect(s.entries.every((e) => e.share === 0)).toBe(true);
  });
});

describe('settings', () => {
  it('reads anything and falls back to defaults', () => {
    const s = fromConfigData({ products: [{ id: 'a', name: 'X', price: -3, unit: 'gal', pack: { size: 0 } }, 'junk'], roles: { organize: [] } }, 'Mleko');
    expect(s.products).toEqual([{ id: 'a', name: 'X', unit: 'l', price: 0, step: 0.5, pack: null, active: true }]);
    expect(s.organize).toEqual(['everyone']);
    expect(s.split).toBe('equal');
    expect(fromConfigData(null, 'Mleko').products[0].name).toBe('Mleko');
  });

  it('turns the roles into rules: everyone reads, each changes only their own', () => {
    const settings = { ...defaultSettings('Mleko'), organize: ['admin'], order: ['everyone', 'r1'] };
    expect(rulesFor(settings)).toEqual({
      rounds: { write: ['admin'], read: ['everyone'], edit_own: true },
      orders: { write: ['everyone', 'r1'], read: ['everyone'], edit_own: true },
      drivers: { write: ['everyone', 'r1'], read: ['everyone'], edit_own: true },
    });
    const data = toConfigData(settings);
    expect(fromConfigData(data, '').organize).toEqual(['admin']);
  });

  it('wants a name for every product', () => {
    expect(settingsProblems({ ...defaultSettings(''), products: [] })).toEqual(['noProducts']);
    expect(settingsProblems(defaultSettings(''))).toEqual(['productName']);
    expect(settingsProblems(defaultSettings('Mleko'))).toEqual([]);
  });
});

describe('words and formats', () => {
  it('has every Serbian word in English too', () => {
    expect(keys.en).toEqual(keys.sr);
  });

  it('chooses the Serbian plural by the last digits', () => {
    const t = translator('sr');
    expect(t.plural('orders', 1)).toBe('1 porudžbina');
    expect(t.plural('orders', 3)).toBe('3 porudžbine');
    expect(t.plural('orders', 5)).toBe('5 porudžbina');
    expect(t.plural('orders', 11)).toBe('11 porudžbina');
    expect(t.plural('orders', 21)).toBe('21 porudžbina');
    expect(translator('en').plural('orders', 1)).toBe('1 order');
  });

  it('writes Cyrillic from the Latin words', () => {
    expect(toCyrillic('Nova tura')).toBe('Нова тура');
    expect(toCyrillic('Ljubljana i džem')).toBe('Љубљана и џем');
    expect(toCyrillic('Potok {name}')).toBe('Поток {name}');
    expect(translator('sr-Cyrl')('unitKg')).toBe('кг');
  });

  it('shows dinars without paras when there are none', () => {
    expect(money(1200, 'sr')).toMatch(/^1\.?200 din\.$/);
    expect(money(12.5, 'sr')).toBe('12,50 din.');
    expect(money(40, 'en')).toBe('40 RSD');
  });

  it('round-trips a local time and counts down', () => {
    const iso = new Date(2026, 10, 14, 8, 30).toISOString();
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(fromLocalInput('nope')).toBeNull();
    expect(left(new Date(T0).toISOString(), T0 - 30 * 60_000)).toEqual({ unit: 'minutes', n: 30 });
    expect(left(new Date(T0).toISOString(), T0 - 5 * hour)).toEqual({ unit: 'hours', n: 5 });
    expect(left(new Date(T0).toISOString(), T0 - 3 * 24 * hour)).toEqual({ unit: 'days', n: 3 });
    expect(left(new Date(T0).toISOString(), T0 + 1)).toBeNull();
  });
});
