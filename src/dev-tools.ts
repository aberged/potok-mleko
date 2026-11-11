import './dev-theme.css';
import { DRIVERS, ORDERS, ROUNDS, newProduct, toConfigData, type Settings } from './model/config';
import { toDriverData } from './model/driver';
import { toOrderData, type Line } from './model/order';
import { toRoundData, type Round } from './model/round';

// Dev only (main.ts imports it in its DEV block): a producer with five
// products, a round taking orders from eight neighbours with someone going for
// the goods, a round further ahead nobody drives yet, and an earlier round
// already handed out, in the dev store. `?lang=en` or `?lang=sr-Cyrl` tries a
// language, `?viewer=member` (or `outsider`, `guest`) another viewer (see
// potok-dev.ts), `?seed=empty` starts with no config. The editor is viewer 1.
// To start over: localStorage.clear() in this tab.

const CONFIG_KEY = 'potok-dev:config:default';
const VALUES_KEY = 'potok-dev:values';

function sampleSettings(): Settings {
  const milk = { ...newProduct('Mleko', 'l'), id: 'mleko', price: 120, step: 0.5, pack: { name: 'flaša', size: 1.5, price: 30 } };
  const sour = { ...newProduct('Kiselo mleko', 'l'), id: 'kiselo', price: 180, step: 0.5, pack: { name: 'tegla', size: 1, price: 40 } };
  const cheese = { ...newProduct('Sir', 'kg'), id: 'sir', price: 900, step: 0.25 };
  const kaymak = { ...newProduct('Kajmak', 'kg'), id: 'kajmak', price: 1800, step: 0.25, pack: { name: 'tegla', size: 0.5, price: 50 } };
  const eggs = { ...newProduct('Jaja', 'kom'), id: 'jaja', price: 25, step: 10 };

  return {
    producer: { name: 'Domaćinstvo Jovanović', place: 'Ripanj, Kružni put 12', phone: '064 123 4567', note: 'Muzu u 7, mleko je spremno od 8.' },
    products: [milk, sour, cheese, kaymak, eggs],
    split: 'equal',
    meetPlace: 'Ispred ulaza 3',
    organize: ['everyone'],
    order: ['everyone'],
  };
}

const NEIGHBOURS = ['ana', 'marko', 'jelena', 'nikola', 'milica', 'stefan', 'ivana', 'luka'];

function at(daysFromNow: number, hours: number, minutes = 0): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

let nextId = 5_000;

function row(collection: string, data: object, creator: number, username: string, when: string) {
  return {
    id: nextId++,
    content: 'data:',
    data,
    content_format: 'markdown',
    is_data: true,
    group_id: 1,
    parent_id: null,
    creator_id: creator,
    creator_username: username,
    description_id: null,
    collection,
    anonymous: false,
    revision: 0,
    managed: null,
    inserted_at: when,
    updated_at: when,
  };
}

function round(settings: Settings, farmAt: string, closesAt: string, meetAt: string, extra: Partial<Round> = {}): Round {
  return {
    farmAt,
    closesAt,
    meetAt,
    meetPlace: settings.meetPlace,
    bottlesNote: 'Prazne flaše ostavite kod mene (ulaz 3, stan 7) do petka u 20h.',
    note: '',
    status: 'open',
    products: settings.products.map((p) => ({ ...p })),
    split: settings.split,
    ...extra,
  };
}

const ORDERS_SEED: Record<string, Line>[] = [
  { mleko: { qty: 3, own: true }, sir: { qty: 0.5, own: false } },
  { mleko: { qty: 4.5, own: false }, jaja: { qty: 20, own: false } },
  { mleko: { qty: 2, own: false }, kajmak: { qty: 0.5, own: false } },
  { mleko: { qty: 6, own: true } },
  { kiselo: { qty: 2, own: false }, sir: { qty: 1, own: false } },
  { mleko: { qty: 1.5, own: false }, kajmak: { qty: 0.25, own: true } },
  { mleko: { qty: 3, own: false }, jaja: { qty: 10, own: false } },
  { mleko: { qty: 2.5, own: true }, kiselo: { qty: 1, own: true } },
];

export function seedDevMleko() {
  const params = new URLSearchParams(location.search);
  const lang = params.get('lang');
  if (lang) document.documentElement.lang = lang;

  if (params.get('seed') === 'empty' || localStorage.getItem(CONFIG_KEY)) return;

  const settings = sampleSettings();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ id: 900_000, revision: 0, data: toConfigData(settings), updated_at: new Date().toISOString() }));

  const rows: object[] = [];
  const earlier = row(ROUNDS, toRoundData(round(settings, at(-7, 8), at(-8, 20), at(-7, 10))), 1, 'dev-editor', at(-10, 9));
  const open = row(ROUNDS, toRoundData(round(settings, at(2, 8), at(1, 20), at(2, 10))), 12, 'jelena', at(-1, 18));
  const later = row(ROUNDS, toRoundData(round(settings, at(9, 8), at(8, 20), at(9, 10), { bottlesNote: '' })), 11, 'marko', at(0, 9));
  rows.push(earlier, open, later);

  // The earlier round: the editor drove and has ticked most of it off.
  const earlierOrders = ORDERS_SEED.slice(0, 5).map((lines, i) =>
    row(ORDERS, toOrderData({ round: earlier.id, lines, note: '' }), 10 + i, NEIGHBOURS[i], at(-9, 10 + i)),
  );
  rows.push(...earlierOrders);
  rows.push(
    row(
      DRIVERS,
      toDriverData({
        round: earlier.id,
        at: at(-9, 9),
        withdrawn: false,
        cost: 600,
        pickedUp: true,
        handover: Object.fromEntries(earlierOrders.slice(0, 4).map((o, i) => [String(o.id), { got: true, paid: i < 3 }])),
      }),
      1,
      'dev-editor',
      at(-9, 9),
    ),
  );

  // The round taking orders: eight neighbours, Marko goes, Ana stands by.
  ORDERS_SEED.forEach((lines, i) => {
    rows.push(
      row(ORDERS, toOrderData({ round: open.id, lines, note: i === 3 ? 'Flaše ostavljam ispred vrata.' : '' }), 10 + i, NEIGHBOURS[i], at(-1, 19 + (i % 4))),
    );
  });
  rows.push(row(DRIVERS, toDriverData({ round: open.id, at: at(-1, 19), withdrawn: false, cost: 800, pickedUp: false, handover: {} }), 11, 'marko', at(-1, 19)));
  rows.push(row(DRIVERS, toDriverData({ round: open.id, at: at(-1, 21), withdrawn: false, cost: null, pickedUp: false, handover: {} }), 10, 'ana', at(-1, 21)));

  // The round further ahead: two orders and nobody to drive yet.
  rows.push(row(ORDERS, toOrderData({ round: later.id, lines: ORDERS_SEED[1], note: '' }), 11, 'marko', at(0, 9)));
  rows.push(row(ORDERS, toOrderData({ round: later.id, lines: ORDERS_SEED[6], note: '' }), 16, 'ivana', at(0, 10)));

  const others = JSON.parse(localStorage.getItem(VALUES_KEY) || '[]');
  localStorage.setItem(VALUES_KEY, JSON.stringify([...others, ...rows]));
}
