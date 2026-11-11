# potok mleko

Zajednička kupovina od proizvođača: Potok aplikacija u kojoj komšije zajedno naručuju mleko (i drugo) direktno od poljoprivrednika. Napravljena je po šablonu [potok-vite](https://github.com/aberged/potok-vite/tree/align-alt-descriptions): Vite, TypeScript, Tailwind, daisyUI sa prefiksom `d-` i lit-html.

Za svaku turu aplikacija vodi:

- kada se ide kod proizvođača, do kada se naručuje, gde i kada se roba deli i gde se ostavljaju prazne flaše;
- ko šta naručuje i koliko, i da li ima svoju ambalažu (ambalaža proizvođača se plaća po flaši: ⌈količina / veličina flaše⌉);
- ko ide po robu, a ko je rezerva, i koliko košta prevoz;
- koliko svako duguje: roba, ambalaža i deo prevoza;
- šta se plaća proizvođaču, sa spiskom koji može da se kopira;
- podelu: ko je preuzeo i ko je platio.

## Ko šta radi

| Ko | Šta |
|---|---|
| urednik grupe (`edit_group`, admin) | upisuje proizvođača, proizvode, cene i ambalažu, način deljenja prevoza i uloge; briše turu ili dvostruku porudžbinu |
| ko sme da otvara ture (podrazumevano svi članovi) | otvara turu i menja svoju: vreme, mesto, cene u toj turi, zatvara i ponovo otvara porudžbine, otkazuje |
| ko sme da naručuje (podrazumevano svi članovi) | naručuje i menja ili otkazuje svoju porudžbinu; javlja se da ide po robu ili kao rezerva |
| onaj ko ide po robu | upisuje trošak prevoza, „roba je preuzeta“ i štiklira ko je preuzeo i ko je platio |
| svi članovi | vide sve ture i porudžbine i biraju svoja obaveštenja |

Prevoz se deli jednako na svaku porudžbinu ili srazmerno iznosu porudžbine; to bira urednik, a tura pamti izbor iz trenutka kad je otvorena. Delovi su u celim dinarima i u zbiru daju tačno upisan trošak (ostatak ide najvećim ostacima).

## Podaci

Sve je u data vrednostima aplikacije, u tri kolekcije sa pravilima, i u config-u:

| Gde | Šta | Pravilo |
|---|---|---|
| config | proizvođač, proizvodi (`id`, naziv, jedinica `l`/`kg`/`kom`, cena, korak, ambalaža `{name, size, price}`), deljenje prevoza, uobičajeno mesto podele, uloge | menjaju samo urednici, sa `revision` |
| `rounds` | tura: `farm_at`, `closes_at`, `meet_at`, `meet_place`, `bottles_note`, `note`, `status` (`open`/`closed`/`cancelled`), kopija proizvoda sa cenama, `split` | piše ko otvara ture, čitaju svi, autor menja svoju |
| `orders` | porudžbina: `round`, `lines: {proizvod: {qty, own}}`, `note` | piše ko naručuje, čitaju svi, autor menja svoju |
| `drivers` | ponuda da ide po robu: `round`, `at`, `withdrawn`, `cost`, `picked_up`, `handover: {porudžbina: {got, paid}}` | piše ko naručuje, čitaju svi, autor menja svoju |

Pravila prave podešavanja (`rulesFor` u [src/model/config.ts](src/model/config.ts)), pa Potok proverava svaki upis: niko ne menja tuđu porudžbinu, tuđu turu ni beleške onoga ko ide po robu.

Šta Potok ne može da drži, pa drži aplikacija:

- **Rok za porudžbine.** `closes_at` u pravilu važi za celu kolekciju, a ne za jednu turu. Aplikacija posle roka više ne nudi izmenu, ali server bi primio upis poslat mimo nje.
- **Jedna porudžbina po osobi u turi.** `once` takođe važi za celu kolekciju. Aplikacija menja postojeću porudžbinu; ako se ipak pojave dve (dve kartice u isti mah), računa se ranija, a urednik vidi višak i može da ga obriše.
- **Otkazivanje.** Autor ne može da obriše svoju vrednost, pa otkazana porudžbina ostaje kao prazna i ne računa se.
- **Ko ide po robu.** Ide najraniji koji nije odustao, po vremenu ponude (`at`, sat njegovog uređaja); ko se ponovo javi posle odustajanja, staje iza rezervi.

Obaveštenja su Potokova: svako za sebe uključuje „kad se otvori nova tura“ i „kad stigne nova porudžbina“. Potok javlja samo novu vrednost, pa izmena postojeće porudžbine ne stiže kao obaveštenje.

Kada urednik prvi put otvori aplikaciju, ona odmah sačuva podrazumevani config (sa pravilima) i otvori podešavanja. Dok toga nema, ostali članovi vide da administrator još nije upisao proizvođača.

## Brzi start

```sh
npm install
npm run dev      # lokalno, na portu 5179, uz dev mock potok API-ja
npm test
npm run build    # tsc + vite build → dist/potok-build.html
```

`dist/potok-build.html` se lepi u grupu kao aplikacija: u izmeni grupe, opis u HTML-u sa uključenim „Opis je aplikacija (API)“. Ovo nije šablon u meniju „Kreiraj podgrupu“, pa potok-ide nema kopiju u `priv/apps`.

U dev režimu `?viewer=member` (ili `outsider`, `guest`) igra drugog gledaoca, a `?lang=en` ili `?lang=sr-Cyrl` drugi jezik. Seed u [src/dev-tools.ts](src/dev-tools.ts) pravi proizvođača sa pet proizvoda, turu sa osam komšija, turu kojoj se traži vozač i jednu raniju turu. `?seed=empty` počinje bez config-a; za novi početak: `localStorage.clear()`.

## Jezici

Stranica Potoka upisuje jezik u `<html lang>` okvira: `sr`, `sr-Cyrl` ili `en`. Reči su u [src/i18n.ts](src/i18n.ts). Srpski je referenca, a ćirilica se računa iz njega i važi samo za reči aplikacije, nikad za ono što su ljudi upisali (nazivi proizvoda, mesta, napomene).

## Struktura

| Fajl | Šta je |
|---|---|
| [index.html](index.html) | koren aplikacije i opis za karticu linka, koji mora da bude u `<body>` |
| [src/main.ts](src/main.ts) | ulaz |
| [src/model/](src/model/) | čiste funkcije: podešavanja i pravila, tura, porudžbina i cene, deljenje prevoza, vozač, zbirovi, formati |
| [src/model/model.test.ts](src/model/model.test.ts) | vitest testovi |
| [src/store/](src/store/) | stanje, čitanje i žive izmene (`data.ts`), upisi (`actions.ts`) |
| [src/views/](src/views/) | lit-html prikaz: lista tura, tura, obrazac ture, podešavanja |
| [src/views/icons.ts](src/views/icons.ts) | Heroicons, piše ga [scripts/icons.py](scripts/icons.py) iz `../potok-ide/deps/heroicons` |
| [src/dev-tools.ts](src/dev-tools.ts), [src/dev-theme.css](src/dev-theme.css) | samo za dev |
| [src/potok.ts](src/potok.ts), [src/potok-dev.ts](src/potok-dev.ts), [vite.config.ts](vite.config.ts) | iz šablona, bez izmena |

## Licenca

MIT, vidi [LICENSE](LICENSE). Ikonice su iz Heroicons-a (MIT), vidi [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Build nosi i licence koda koji pakuje: pun tekst licence lit-html-a (BSD-3-Clause) na vrhu skripte, a u CSS-u napomene Tailwind CSS-a i daisyUI-ja (MIT).
