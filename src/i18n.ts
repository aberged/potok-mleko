// The app's words. Potok's page says its language on the frame's <html lang>
// ("sr", "sr-Cyrl" or "en"), and nothing else tells an app. Serbian is the
// reference, as in Potok, and Cyrillic comes from it. `{n}`, `{a}`, `{b}`,
// `{name}` and the like are filled in; plurals end in One, Few and Many.

import type { Lang } from './model/format';

const sr = {
  appName: 'Kupovina od proizvođača',
  loading: 'Učitavam ture…',
  failed: 'Aplikacija se nije učitala. Pokušaj ponovo.',
  retry: 'Pokušaj ponovo',
  outdated: 'Otvori stranicu ponovo da bi aplikacija radila.',
  previewFrame: 'U pregledu podešavanja aplikacija ne radi. Sačuvaj grupu i otvori opis.',
  membersOnly: 'Ture i porudžbine vide samo članovi grupe.',
  setupPending: 'Administrator grupe još nije upisao proizvođača i proizvode. Kad to uradi, ovde ćeš moći da naručuješ.',
  setupHint: 'Upiši proizvođača i cene proizvoda, pa sačuvaj. Posle toga komšije mogu da otvaraju ture i naručuju.',
  defaultProduct: 'Mleko',
  close: 'Zatvori',
  cancel: 'Otkaži',
  save: 'Sačuvaj',
  saving: 'Čuvam…',
  back: 'Nazad',
  edit: 'Izmeni',
  delete: 'Obriši',
  more: 'Još',
  yes: 'Da',
  you: 'ti',
  empty: '—',

  rounds: 'Ture',
  newRound: 'Nova tura',
  upcoming: 'Predstojeće',
  earlier: 'Ranije',
  loadMore: 'Prikaži starije',
  noRounds: 'Još nema tura.',
  noRoundsOrganize: 'Otvori prvu: kada ideš po robu, do kada se naručuje i gde se roba deli.',
  noRoundsWait: 'Kad neko otvori turu, pojaviće se ovde.',
  noEarlier: 'Nema ranijih tura.',

  stageOpen: 'Naručuje se',
  stageClosed: 'Porudžbine zatvorene',
  stagePicked: 'Roba preuzeta',
  stageDone: 'Završena',
  stageCancelled: 'Otkazana',

  atFarm: 'Kod proizvođača',
  ordersUntil: 'Porudžbine do',
  handout: 'Podela',
  emptyBottles: 'Prazne flaše',
  organizer: 'Organizuje {name}',
  daysLeftOne: 'još {n} dan',
  daysLeftFew: 'još {n} dana',
  daysLeftMany: 'još {n} dana',
  hoursLeftOne: 'još {n} sat',
  hoursLeftFew: 'još {n} sata',
  hoursLeftMany: 'još {n} sati',
  minutesLeftOne: 'još {n} minut',
  minutesLeftFew: 'još {n} minuta',
  minutesLeftMany: 'još {n} minuta',
  ordersOne: '{n} porudžbina',
  ordersFew: '{n} porudžbine',
  ordersMany: '{n} porudžbina',

  driverTitle: 'Ko ide po robu',
  noDriver: 'Još niko ne ide po robu.',
  lookingForDriver: 'Traži se ko ide po robu',
  iGo: 'Ja idem',
  iCanToo: 'Mogu i ja, kao rezerva',
  driverIs: 'Ide {name}',
  youDrive: 'Ti ideš po robu',
  youReserve: 'Ti si rezerva',
  reserves: 'Rezerva: {names}',
  withdraw: 'Odustajem',
  withdrawConfirm: 'Odustaješ od odlaska po robu? Ako postoji rezerva, ona preuzima.',
  tripCost: 'Trošak prevoza',
  tripCostHint: 'Upiši procenu unapred, a tačan iznos posle. Deli se na sve porudžbine ove ture.',
  tripUnknown: 'još nije upisan',
  tripSaved: 'Trošak prevoza je upisan.',
  pickedUp: 'Roba je preuzeta od proizvođača',
  volunteered: 'Upisan si kao onaj koji ide po robu.',
  volunteeredReserve: 'Upisan si kao rezerva.',
  withdrawn: 'Više nisi upisan za odlazak po robu.',

  myOrder: 'Moja porudžbina',
  ownPack: 'Imam svoju ambalažu',
  perUnit: '{price} za {unit}',
  packInfo: '{name} od {size}: {price}',
  goods: 'Roba',
  packaging: 'Ambalaža',
  trip: 'Prevoz',
  total: 'Ukupno',
  saveOrder: 'Sačuvaj porudžbinu',
  placeOrder: 'Naruči',
  cancelOrder: 'Otkaži porudžbinu',
  cancelOrderConfirm: 'Otkazuješ svoju porudžbinu u ovoj turi?',
  orderSaved: 'Porudžbina je sačuvana.',
  orderCancelled: 'Porudžbina je otkazana.',
  orderNote: 'Napomena',
  orderNotePlaceholder: 'Npr. flaše ostavljam ispred vrata',
  ordersClosedNote: 'Porudžbine su zatvorene, pa se ova više ne menja.',
  cannotOrder: 'Tvoje uloge u ovoj grupi ne naručuju.',
  noOrderYet: 'Nemaš porudžbinu u ovoj turi.',
  noLongerOffered: 'više se ne nudi u ovoj turi',
  minus: 'Manje',
  plus: 'Više',
  quantity: 'Količina',
  unsavedOrder: 'Izmene još nisu sačuvane.',

  ordersTitle: 'Porudžbine',
  noOrders: 'Još nema porudžbina.',
  duplicate: 'Dvostruka porudžbina: računa se ranija.',
  deleteDuplicate: 'Obriši dvostruku',
  ownPackShort: 'svoja ambalaža',
  roundTotal: 'Ukupno u turi',

  forProducer: 'Za proizvođača',
  payProducer: 'Proizvođaču se plaća',
  producerBottles: 'ambalaža proizvođača: {n} × {name}',
  ownPackers: 'Svoju ambalažu daju',
  producerList: 'Spisak za proizvođača',
  copyList: 'Kopiraj',
  copied: 'Spisak je kopiran.',
  copyFailed: 'Kopiranje ovde ne radi: označi tekst i kopiraj ga.',

  handoutTitle: 'Podela i naplata',
  handoutHint: 'Ko ide po robu štiklira ko je preuzeo i ko je platio.',
  got: 'Preuzeto',
  paid: 'Plaćeno',
  driverMark: 'ide po robu',
  collected: 'Naplaćeno {a} od {b}',
  handedOut: 'Preuzelo {a} od {b}',
  dueBreakdown: 'roba {goods} + prevoz {trip}',

  editRound: 'Izmeni turu',
  closeOrders: 'Zatvori porudžbine',
  reopenOrders: 'Ponovo otvori porudžbine',
  reopenPast: 'Rok za porudžbine je prošao: pomeri ga u izmeni ture.',
  cancelRound: 'Otkaži turu',
  cancelRoundConfirm: 'Otkazuješ turu? Porudžbine ostaju zapisane, ali se roba ne nabavlja.',
  restoreRound: 'Vrati turu',
  deleteRound: 'Obriši turu',
  deleteRoundConfirm: 'Brišeš turu sa svim porudžbinama? To ne može da se vrati.',
  roundDeleted: 'Tura je obrisana.',
  roundSaved: 'Tura je sačuvana.',
  roundCancelled: 'Tura je otkazana.',
  roundNotFound: 'Ove ture više nema.',
  cancelledNote: 'Tura je otkazana: roba se ovaj put ne nabavlja.',

  formNew: 'Nova tura',
  formEdit: 'Izmena ture',
  farmAtLabel: 'Kada se ide kod proizvođača',
  closesAtLabel: 'Porudžbine do',
  meetAtLabel: 'Podela komšijama',
  meetPlaceLabel: 'Mesto podele',
  meetPlacePlaceholder: 'Npr. ispred ulaza 3',
  bottlesNoteLabel: 'Prazne flaše',
  bottlesNotePlaceholder: 'Npr. ostavite prazne flaše kod mene do petka u 20h',
  noteLabel: 'Napomena',
  productsInRound: 'Proizvodi u ovoj turi',
  pricesHint: 'Cene su prepisane iz podešavanja. Promena ovde važi samo za ovu turu.',
  splitLabel: 'Prevoz se deli',
  splitEqual: 'Jednako na svaku porudžbinu',
  splitAmount: 'Srazmerno iznosu porudžbine',
  splitEqualShort: 'deli se jednako na porudžbine',
  splitAmountShort: 'deli se po iznosu porudžbine',
  iDrive: 'Ja idem po robu',
  createRound: 'Otvori turu',
  problemOrder: 'Porudžbine se zatvaraju pre odlaska kod proizvođača, a podela je posle njega.',
  problemNoProducts: 'Uključi bar jedan proizvod.',
  problemProductName: 'Svaki proizvod mora da ima naziv.',
  offeredSwitch: 'Nudi se u ovoj turi',

  settingsTitle: 'Podešavanja',
  producerTitle: 'Proizvođač',
  producerName: 'Ime',
  producerNamePlaceholder: 'Npr. Domaćinstvo Jovanović',
  producerPlace: 'Mesto',
  producerPlacePlaceholder: 'Npr. Ripanj, Kružni put 12',
  producerPhone: 'Telefon',
  producerNote: 'Napomena',
  productsTitle: 'Proizvodi',
  addProduct: 'Dodaj proizvod',
  productName: 'Naziv',
  productNamePlaceholder: 'Npr. Kajmak',
  unit: 'Jedinica',
  price: 'Cena za jedinicu',
  step: 'Korak',
  packSwitch: 'Proizvođač daje svoju ambalažu',
  packName: 'Ambalaža',
  packNamePlaceholder: 'flaša',
  packSize: 'Veličina',
  packPrice: 'Cena ambalaže',
  activeSwitch: 'Nudi se u novim turama',
  removeProduct: 'Ukloni proizvod',
  moveUp: 'Pomeri gore',
  tripTitle: 'Prevoz',
  tripHint: 'Ko ide po robu upiše trošak, a svako vidi svoj deo. Nova tura preuzima ovaj izbor.',
  meetPlaceDefault: 'Uobičajeno mesto podele',
  rolesTitle: 'Ko šta može',
  organizeRoles: 'Ko otvara ture',
  orderRoles: 'Ko naručuje i ide po robu',
  rolesHint: 'Svi članovi vide ture i porudžbine. Svako menja samo svoje.',
  rolesLoading: 'Učitavam uloge…',
  settingsSaved: 'Podešavanja su sačuvana.',
  settingsConflict: 'Neko je u međuvremenu sačuvao podešavanja. Učitana su nova: ponovi svoju izmenu.',
  noProducts: 'Dodaj bar jedan proizvod.',
  productNameMissing: 'Svaki proizvod mora da ima naziv.',
  packSizeMissing: 'Ambalaža mora da ima veličinu.',
  noPrice: 'Bez cene',
  unsavedSettings: 'Ima nesačuvanih izmena.',

  unitL: 'l',
  unitKg: 'kg',
  unitKom: 'kom',

  notifyTitle: 'Obaveštenja',
  notifyRounds: 'Kad se otvori nova tura',
  notifyOrders: 'Kad stigne nova porudžbina',
  notifyHint: 'Obaveštenje stiže na tvoje uređaje. Izmena postojeće porudžbine se ne javlja.',

  errorRate: 'Previše izmena u kratkom roku. Pokušaj malo kasnije.',
  errorForbidden: 'Za to nemaš dozvolu.',
  errorConflict: 'Neko je u međuvremenu menjao isto. Učitano je novo stanje.',
  errorOffline: 'Veza sa Potokom je prekinuta. Pokušaj ponovo.',
  errorClosed: 'Ovde se više ne upisuje.',
  errorGeneric: 'Nije sačuvano. Pokušaj ponovo.',
};

export type Key = keyof typeof sr;

const en: Record<Key, string> = {
  appName: 'Buying from the producer',
  loading: 'Loading rounds…',
  failed: 'The app did not load. Try again.',
  retry: 'Try again',
  outdated: 'Reload the page for the app to work.',
  previewFrame: 'The app does not run in the settings preview. Save the group and open its description.',
  membersOnly: 'Only members of the group see rounds and orders.',
  setupPending: 'The group’s admin has not entered the producer and products yet. Once they do, you can order here.',
  setupHint: 'Enter the producer and the products’ prices, then save. After that, neighbours can open rounds and order.',
  defaultProduct: 'Milk',
  close: 'Close',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving…',
  back: 'Back',
  edit: 'Edit',
  delete: 'Delete',
  more: 'More',
  yes: 'Yes',
  you: 'you',
  empty: '—',

  rounds: 'Rounds',
  newRound: 'New round',
  upcoming: 'Coming up',
  earlier: 'Earlier',
  loadMore: 'Show older',
  noRounds: 'No rounds yet.',
  noRoundsOrganize: 'Open the first: when you go for the goods, until when people order and where they are handed out.',
  noRoundsWait: 'When someone opens a round, it shows up here.',
  noEarlier: 'No earlier rounds.',

  stageOpen: 'Taking orders',
  stageClosed: 'Orders closed',
  stagePicked: 'Goods picked up',
  stageDone: 'Done',
  stageCancelled: 'Cancelled',

  atFarm: 'At the producer’s',
  ordersUntil: 'Orders until',
  handout: 'Handing out',
  emptyBottles: 'Empty bottles',
  organizer: 'Organized by {name}',
  daysLeftOne: '{n} day left',
  daysLeftFew: '{n} days left',
  daysLeftMany: '{n} days left',
  hoursLeftOne: '{n} hour left',
  hoursLeftFew: '{n} hours left',
  hoursLeftMany: '{n} hours left',
  minutesLeftOne: '{n} minute left',
  minutesLeftFew: '{n} minutes left',
  minutesLeftMany: '{n} minutes left',
  ordersOne: '{n} order',
  ordersFew: '{n} orders',
  ordersMany: '{n} orders',

  driverTitle: 'Who goes for the goods',
  noDriver: 'Nobody goes for the goods yet.',
  lookingForDriver: 'Someone to go for the goods is needed',
  iGo: 'I’ll go',
  iCanToo: 'I can too, as a backup',
  driverIs: '{name} goes',
  youDrive: 'You go for the goods',
  youReserve: 'You are the backup',
  reserves: 'Backup: {names}',
  withdraw: 'I can’t go',
  withdrawConfirm: 'Step back from going for the goods? If there is a backup, they take over.',
  tripCost: 'Trip cost',
  tripCostHint: 'Enter an estimate beforehand and the exact amount afterwards. It is shared among all orders of this round.',
  tripUnknown: 'not entered yet',
  tripSaved: 'The trip cost is saved.',
  pickedUp: 'The goods are picked up at the producer’s',
  volunteered: 'You are down to go for the goods.',
  volunteeredReserve: 'You are down as the backup.',
  withdrawn: 'You are no longer down to go for the goods.',

  myOrder: 'My order',
  ownPack: 'I bring my own packaging',
  perUnit: '{price} per {unit}',
  packInfo: '{name} of {size}: {price}',
  goods: 'Goods',
  packaging: 'Packaging',
  trip: 'Trip',
  total: 'Total',
  saveOrder: 'Save order',
  placeOrder: 'Order',
  cancelOrder: 'Cancel order',
  cancelOrderConfirm: 'Cancel your order in this round?',
  orderSaved: 'Your order is saved.',
  orderCancelled: 'Your order is cancelled.',
  orderNote: 'Note',
  orderNotePlaceholder: 'E.g. I leave the bottles by the door',
  ordersClosedNote: 'Orders are closed, so this one no longer changes.',
  cannotOrder: 'Your roles in this group do not order.',
  noOrderYet: 'You have no order in this round.',
  noLongerOffered: 'no longer offered in this round',
  minus: 'Less',
  plus: 'More',
  quantity: 'Quantity',
  unsavedOrder: 'Changes are not saved yet.',

  ordersTitle: 'Orders',
  noOrders: 'No orders yet.',
  duplicate: 'Double order: the earlier one counts.',
  deleteDuplicate: 'Delete the double',
  ownPackShort: 'own packaging',
  roundTotal: 'Round total',

  forProducer: 'For the producer',
  payProducer: 'Paid to the producer',
  producerBottles: 'producer’s packaging: {n} × {name}',
  ownPackers: 'Bringing their own packaging',
  producerList: 'List for the producer',
  copyList: 'Copy',
  copied: 'The list is copied.',
  copyFailed: 'Copying does not work here: select the text and copy it.',

  handoutTitle: 'Handing out and paying',
  handoutHint: 'Whoever goes for the goods ticks who took theirs and who paid.',
  got: 'Taken',
  paid: 'Paid',
  driverMark: 'goes for the goods',
  collected: 'Collected {a} of {b}',
  handedOut: 'Taken {a} of {b}',
  dueBreakdown: 'goods {goods} + trip {trip}',

  editRound: 'Edit round',
  closeOrders: 'Close orders',
  reopenOrders: 'Reopen orders',
  reopenPast: 'The order deadline has passed: move it in the round’s edit.',
  cancelRound: 'Cancel round',
  cancelRoundConfirm: 'Cancel the round? The orders stay written down, but the goods are not bought.',
  restoreRound: 'Restore round',
  deleteRound: 'Delete round',
  deleteRoundConfirm: 'Delete the round with all its orders? This cannot be undone.',
  roundDeleted: 'The round is deleted.',
  roundSaved: 'The round is saved.',
  roundCancelled: 'The round is cancelled.',
  roundNotFound: 'This round is gone.',
  cancelledNote: 'The round is cancelled: the goods are not bought this time.',

  formNew: 'New round',
  formEdit: 'Edit round',
  farmAtLabel: 'When to go to the producer',
  closesAtLabel: 'Orders until',
  meetAtLabel: 'Handing out to neighbours',
  meetPlaceLabel: 'Where goods are handed out',
  meetPlacePlaceholder: 'E.g. in front of entrance 3',
  bottlesNoteLabel: 'Empty bottles',
  bottlesNotePlaceholder: 'E.g. leave your empty bottles with me by Friday 8 pm',
  noteLabel: 'Note',
  productsInRound: 'Products in this round',
  pricesHint: 'Prices are copied from the settings. A change here holds for this round only.',
  splitLabel: 'The trip is shared',
  splitEqual: 'Equally among the orders',
  splitAmount: 'By what each order costs',
  splitEqualShort: 'shared equally among the orders',
  splitAmountShort: 'shared by what each order costs',
  iDrive: 'I go for the goods',
  createRound: 'Open round',
  problemOrder: 'Orders close before the trip to the producer, and the handing out comes after it.',
  problemNoProducts: 'Switch on at least one product.',
  problemProductName: 'Every product needs a name.',
  offeredSwitch: 'Offered in this round',

  settingsTitle: 'Settings',
  producerTitle: 'Producer',
  producerName: 'Name',
  producerNamePlaceholder: 'E.g. Jovanović farm',
  producerPlace: 'Place',
  producerPlacePlaceholder: 'E.g. Ripanj, Kružni put 12',
  producerPhone: 'Phone',
  producerNote: 'Note',
  productsTitle: 'Products',
  addProduct: 'Add product',
  productName: 'Name',
  productNamePlaceholder: 'E.g. Kaymak',
  unit: 'Unit',
  price: 'Price per unit',
  step: 'Step',
  packSwitch: 'The producer supplies packaging',
  packName: 'Packaging',
  packNamePlaceholder: 'bottle',
  packSize: 'Size',
  packPrice: 'Packaging price',
  activeSwitch: 'Offered in new rounds',
  removeProduct: 'Remove product',
  moveUp: 'Move up',
  tripTitle: 'Trip',
  tripHint: 'Whoever goes for the goods enters the cost, and everyone sees their part. A new round takes this choice.',
  meetPlaceDefault: 'Usual place for handing out',
  rolesTitle: 'Who does what',
  organizeRoles: 'Who opens rounds',
  orderRoles: 'Who orders and goes for the goods',
  rolesHint: 'All members see rounds and orders. Everyone changes only their own.',
  rolesLoading: 'Loading roles…',
  settingsSaved: 'The settings are saved.',
  settingsConflict: 'Someone else saved the settings meanwhile. Theirs are loaded: make your change again.',
  noProducts: 'Add at least one product.',
  productNameMissing: 'Every product needs a name.',
  packSizeMissing: 'Packaging needs a size.',
  noPrice: 'No price',
  unsavedSettings: 'There are unsaved changes.',

  unitL: 'l',
  unitKg: 'kg',
  unitKom: 'pcs',

  notifyTitle: 'Notifications',
  notifyRounds: 'When a new round opens',
  notifyOrders: 'When a new order comes in',
  notifyHint: 'Pushes go to your devices. A change to an existing order is not announced.',

  errorRate: 'Too many changes in a short time. Try again shortly.',
  errorForbidden: 'You are not allowed to do that.',
  errorConflict: 'Someone changed the same thing meanwhile. The new state is loaded.',
  errorOffline: 'The connection to Potok is lost. Try again.',
  errorClosed: 'This no longer takes entries.',
  errorGeneric: 'Not saved. Try again.',
};

const LETTERS: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', č: 'ч', ć: 'ћ', d: 'д', đ: 'ђ', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и',
  j: 'ј', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', š: 'ш', t: 'т', u: 'у',
  v: 'в', z: 'з', ž: 'ж',
};

const PAIRS: Record<string, string> = { lj: 'љ', nj: 'њ', dž: 'џ' };

// Words the Latin text keeps as they are: placeholders and names.
const KEPT = /(\{[a-z]+\}|Potok)/g;

/** Serbian Latin as Cyrillic: the app's own words, never what people typed. */
export function toCyrillic(text: string): string {
  return text
    .split(KEPT)
    .map((part, index) =>
      index % 2 === 1
        ? part === 'Potok'
          ? 'Поток'
          : part
        : part.replace(/lj|nj|dž|[a-zčćđšž]/giu, (latin) => {
            const lower = latin.toLowerCase();
            const cyrillic = PAIRS[lower] ?? LETTERS[lower] ?? latin;

            return latin[0] === latin[0].toUpperCase() && latin[0] !== latin[0].toLowerCase()
              ? cyrillic.toUpperCase()
              : cyrillic;
          }),
    )
    .join('');
}

export function language(tag: string): Lang {
  if (tag === 'en') return 'en';
  return tag === 'sr-Cyrl' ? 'sr-Cyrl' : 'sr';
}

export type Values = Record<string, string | number>;

const fill = (text: string, values?: Values) =>
  values ? text.replace(/\{([a-z]+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole)) : text;

/** Serbian chooses among three forms by the last digits. */
function pluralForm(n: number, lang: Lang): 'One' | 'Few' | 'Many' {
  if (lang === 'en') return n === 1 ? 'One' : 'Many';

  const tens = Math.abs(n) % 100;
  const ones = Math.abs(n) % 10;
  if (ones === 1 && tens !== 11) return 'One';
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return 'Few';
  return 'Many';
}

export type PluralKey = 'daysLeft' | 'hoursLeft' | 'minutesLeft' | 'orders';

export function translator(tag: string) {
  const lang = language(tag);
  const word = (key: Key): string => (lang === 'en' ? en[key] : lang === 'sr-Cyrl' ? toCyrillic(sr[key]) : sr[key]);

  const t = (key: Key, values?: Values): string => fill(word(key), values);
  t.plural = (key: PluralKey, n: number, values?: Values): string =>
    fill(word(`${key}${pluralForm(n, lang)}` as Key), { n, ...values });
  t.lang = lang;

  return t;
}

export type Translate = ReturnType<typeof translator>;

export const keys = { sr: Object.keys(sr), en: Object.keys(en) };
