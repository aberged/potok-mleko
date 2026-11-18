# potok naručivanje

Zajedničko naručivanje od proizvođača: Potok aplikacija u kojoj komšije zajedno naručuju direktno od proizvođača, na litar, kilogram ili komad: mleko, sir, jaja, med, povrće, hleb ili rasad. Napravljena je po šablonu [potok-vite](https://github.com/aberged/potok-vite/tree/align-alt-descriptions): Vite, TypeScript, Tailwind, daisyUI sa prefiksom `d-` i lit-html.

Za svaku turu aplikacija vodi:

- kada se ide kod proizvođača, do kada se naručuje, gde i kada se roba deli (rečima i na mapi) i gde se ostavlja povratna ambalaža;
- ko šta naručuje i koliko, i da li ima svoju ambalažu (ambalaža proizvođača se plaća po komadu: ⌈količina / veličina pakovanja⌉);
- ko ide po robu, a ko je rezerva, i koliko košta prevoz;
- koliko svako duguje: roba, ambalaža i deo prevoza;
- šta se plaća proizvođaču, sa spiskom koji može da se kopira;
- podelu: ko je preuzeo i ko je platio.

## Ko šta radi

| Ko | Šta |
|---|---|
| urednik grupe (`edit_group`, admin) | upisuje proizvođača i njegovo mesto na mapi, proizvode sa ikonicom, cenama i ambalažom, način deljenja prevoza, uobičajeno mesto podele i uloge; briše turu ili dvostruku porudžbinu |
| ko sme da otvara ture (podrazumevano svi članovi) | otvara turu i menja svoju: vreme, mesto (i na mapi), cene u toj turi, zatvara i ponovo otvara porudžbine, otkazuje |
| ko sme da naručuje (podrazumevano svi članovi) | naručuje i menja ili otkazuje svoju porudžbinu; javlja se da ide po robu ili kao rezerva |
| onaj ko ide po robu | upisuje trošak prevoza, „roba je preuzeta“ i štiklira ko je preuzeo i ko je platio |
| svi članovi | vide sve ture i porudžbine i biraju svoja obaveštenja |

## Ikonice proizvoda

Urednik svakom proizvodu bira ikonicu, od onih koje nudi njegova jedinica. Prva u spisku je podrazumevana:

| Jedinica | Ikonice |
|---|---|
| litar | flaša, kanta za mleko, tegla, boca, kap, čaša |
| kilogram | džak, sir, meso, voće, povrće, med, tegla |
| komad | paket, jaje, hleb, pile, rasad, kolač |

Kad se jedinica promeni, ikonica ostaje ako je nova jedinica nudi (tegla između litra i kilograma), a inače postaje podrazumevana. Spiskovi su u [src/model/product-icons.ts](src/model/product-icons.ts), a crteži u [src/views/product-icons.ts](src/views/product-icons.ts): sopstveni crteži aplikacije, na mreži 24 sa potezom 1.5, kao Heroicons. Članovi vide ikonicu uz proizvod u porudžbini, zbirovima i spisku za proizvođača.

## Mesta na mapi

Mesto proizvođača (u podešavanjima), uobičajeno mesto podele (u podešavanjima) i mesto podele jedne ture (u obrascu ture) mogu da dobiju i tačku na mapi: **Izaberi na mapi** otvara Leaflet mapu sa Potokovim pločicama (`getMapConfig`), na kojoj se pin stavlja dodirom i prevlači, a **Pin u sredinu mape** služi tastaturi. Tačka se čuva u podacima aplikacije (`producer.point`, `meet_point`), nikad u lokaciji grupe.

Gde je tačka, stoji link **Prikaži na mapi** (u gornjoj traci je to samo mesto proizvođača, a u turi i mesto podele). Link zove `potok.openMap({lat, lng, label})`, a Potok vodi gledaoca na mapu grupa (`/groups/<koren>/map?point=…&group=…&label=…`): pin sa slikom grupe i kartica sa imenom grupe i oznakom. Stranica Potoka bez `openMap` (starija verzija) dobija poruku da treba ponovo da se otvori.

Nova tura prepisuje tačku mesta podele iz podešavanja, kao i reči.

Prevoz se deli jednako na svaku porudžbinu ili srazmerno iznosu porudžbine; to bira urednik, a tura pamti izbor iz trenutka kad je otvorena. Delovi su u celim dinarima i u zbiru daju tačno upisan trošak (ostatak ide najvećim ostacima).

## Podaci

Sve je u data vrednostima aplikacije, u tri kolekcije sa pravilima, i u config-u:

| Gde | Šta | Pravilo |
|---|---|---|
| config | proizvođač (`name`, `place`, `phone`, `note`, `point: {lat, lng}`), proizvodi (`id`, naziv, jedinica `l`/`kg`/`kom`, cena, korak, ambalaža `{name, size, price}`, `icon`), deljenje prevoza, uobičajeno mesto podele (`meet_place`, `meet_point`), uloge | menjaju samo urednici, sa `revision` |
| `rounds` | tura: `farm_at`, `closes_at`, `meet_at`, `meet_place`, `meet_point`, `bottles_note` (povratna ambalaža; ime ključa je ostalo iz vremena flaša), `note`, `status` (`open`/`closed`/`cancelled`), kopija proizvoda sa cenama i ikonicama, `split` | piše ko otvara ture, čitaju svi, autor menja svoju |
| `orders` | porudžbina: `round`, `lines: {proizvod: {qty, own}}`, `note` | piše ko naručuje, čitaju svi, autor menja svoju |
| `drivers` | ponuda da ide po robu: `round`, `at`, `withdrawn`, `cost`, `picked_up`, `handover: {porudžbina: {got, paid}}` | piše ko naručuje, čitaju svi, autor menja svoju |

Tačka je `{lat, lng}` u stepenima, zaokružena na šest decimala; sve drugo se čita kao bez tačke. Proizvod bez ikonice (podaci od ranije) dobija podrazumevanu za svoju jedinicu, a stare ture tako i ostaju, jer drže svoju kopiju proizvoda.

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
| [src/views/map-picker.ts](src/views/map-picker.ts) | dijalog sa mapom (Leaflet), dugme „Izaberi na mapi“ i link „Prikaži na mapi“ |
| [src/model/product-icons.ts](src/model/product-icons.ts), [src/views/product-icons.ts](src/views/product-icons.ts) | ikonice proizvoda po jedinici i njihovi crteži |
| [src/leaflet.css](src/leaflet.css) | Leaflet-ov CSS bez slika, kao u aplikaciji Mapa |
| [icons/products/](icons/products/) | ikonice proizvoda kao PNG (64 i 512 px, providna pozadina) za upotrebu van aplikacije; build ih ne uzima. Pravi ih ponovo `node scripts/product-icons-png.mjs` iz crteža u [src/views/product-icons.ts](src/views/product-icons.ts) |
| [src/views/icons.ts](src/views/icons.ts) | Heroicons, piše ga [scripts/icons.py](scripts/icons.py) iz `../potok-ide/deps/heroicons` |
| [src/dev-tools.ts](src/dev-tools.ts), [src/dev-theme.css](src/dev-theme.css) | samo za dev |
| [src/potok.ts](src/potok.ts), [src/potok-dev.ts](src/potok-dev.ts) | iz šablona; dodat `openMap` |
| [vite.config.ts](vite.config.ts) | iz šablona, bez izmena |

## Licenca

MIT, vidi [LICENSE](LICENSE). Ikonice aplikacije su iz Heroicons-a (MIT), a ikonice proizvoda su sopstveni crteži; Leaflet-ov CSS je pod BSD-2-Clause. Vidi [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Build nosi i licence koda koji pakuje: pune tekstove licenci Leaflet-a (BSD-2-Clause) i lit-html-a (BSD-3-Clause) na vrhu skripte, a u CSS-u napomene Tailwind CSS-a i daisyUI-ja (MIT).
