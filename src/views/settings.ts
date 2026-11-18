// For editors: the producer and where they are, the products with their
// icons, prices and packaging, how the trip is shared, the usual place for
// handing out, and who may open rounds and order. Saving writes the config,
// and with it the rules Potok checks every write against.

import { html, nothing } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { MAX_PRODUCTS, UNITS, defaultStep, newProduct, settingsProblems, type Product, type Settings } from '../model/config';
import { currency } from '../model/format';
import { PRODUCT_ICONS, iconFor } from '../model/product-icons';
import { goList, saveSettings } from '../store/actions';
import { state, update } from '../store/state';
import { button, card, cardHead, field, iconButton, notice, numberField, rolePicker, select, toggle, ui, unitLabel } from './common';
import { placeMapButton } from './map-picker';
import { ICON_LABELS, productIcon } from './product-icons';

function change(edit: (settings: Settings) => void) {
  update((s) => s.settingsDraft && edit(s.settingsDraft));
}

function changeProduct(index: number, edit: (product: Product) => void) {
  change((settings) => edit(settings.products[index]));
}

const PROBLEMS = { noProducts: 'noProducts', productName: 'productNameMissing', packSize: 'packSizeMissing' } as const;

/** The icons of the product's unit, as radio buttons: arrows move among them. */
function iconPicker(product: Product, index: number) {
  const t = ui.t;
  const labelId = `settings-product-icon-label-${index}`;

  return html`<div class="pm-icon-picker">
    <span class="pm-label" id=${labelId}>${t('productIcon')}</span>
    <div class="pm-icon-choices" role="radiogroup" aria-labelledby=${labelId} id="settings-product-icon-${index}">
      ${PRODUCT_ICONS[product.unit].map(
        (key) => html`<label class="pm-icon-choice" title=${t(ICON_LABELS[key])}>
          <input
            type="radio"
            class="pm-sr-only"
            name="product-icon-${product.id}"
            value=${key}
            aria-label=${t(ICON_LABELS[key])}
            .checked=${live(product.icon === key)}
            @change=${() => changeProduct(index, (p) => (p.icon = key))}
          />
          ${productIcon(key, 'size-6')}
        </label>`,
      )}
    </div>
  </div>`;
}

function productEditor(product: Product, index: number, count: number, tried: boolean) {
  const t = ui.t;
  const cur = currency(t.lang);
  const unit = unitLabel(product.unit);

  return html`<div class="pm-product-editor ${product.active ? '' : 'pm-off'}" id="settings-product-${index}">
    <div class="pm-product-editor-head">
      ${field(product.name, (v) => changeProduct(index, (p) => (p.name = v)), {
        id: `settings-product-name-${index}`,
        label: t('productName'),
        placeholder: t('productNamePlaceholder'),
        maxlength: 80,
        className: 'pm-grow',
        error: tried && product.name.trim() === '',
      })}
      ${select(
        product.unit,
        UNITS.map((u) => ({ value: u, label: unitLabel(u) })),
        (u) =>
          changeProduct(index, (p) => {
            p.unit = u;
            p.step = defaultStep(u);
            p.icon = iconFor(u, p.icon);
          }),
        { id: `settings-product-unit-${index}`, label: t('unit') },
      )}
      <div class="pm-product-editor-tools">
        ${index > 0
          ? iconButton('moveUp', t('moveUp'), () => change((s) => s.products.splice(index - 1, 0, ...s.products.splice(index, 1))), {
              id: `settings-product-up-${index}`,
            })
          : nothing}
        ${count > 1
          ? iconButton('trash', t('removeProduct'), () => change((s) => s.products.splice(index, 1)), { id: `settings-product-remove-${index}` })
          : nothing}
      </div>
    </div>
    ${iconPicker(product, index)}
    <div class="pm-grid pm-grid-tight">
      ${numberField(product.price, (n) => changeProduct(index, (p) => (p.price = n)), {
        id: `settings-product-price-${index}`,
        label: t('price'),
        suffix: `${cur}/${unit}`,
      })}
      ${numberField(product.step, (n) => n > 0 && changeProduct(index, (p) => (p.step = n)), {
        id: `settings-product-step-${index}`,
        label: t('step'),
        suffix: unit,
        min: 0.001,
        max: 999,
      })}
    </div>
    ${toggle(product.pack !== null, t('packSwitch'), (on) => changeProduct(index, (p) => (p.pack = on ? { name: t('packNamePlaceholder'), size: 1, price: 0 } : null)), {
      id: `settings-product-pack-${index}`,
    })}
    ${product.pack
      ? html`<div class="pm-grid pm-grid-three">
          ${field(product.pack.name, (v) => changeProduct(index, (p) => p.pack && (p.pack.name = v)), {
            id: `settings-pack-name-${index}`,
            label: t('packName'),
            placeholder: t('packNamePlaceholder'),
            maxlength: 60,
          })}
          ${numberField(product.pack.size, (n) => n > 0 && changeProduct(index, (p) => p.pack && (p.pack.size = n)), {
            id: `settings-pack-size-${index}`,
            label: t('packSize'),
            suffix: unit,
            min: 0.001,
            max: 999,
            error: tried && !(product.pack.size > 0),
          })}
          ${numberField(product.pack.price, (n) => changeProduct(index, (p) => p.pack && (p.pack.price = n)), {
            id: `settings-pack-price-${index}`,
            label: t('packPrice'),
            suffix: cur,
          })}
        </div>`
      : nothing}
    ${toggle(product.active, t('activeSwitch'), (on) => changeProduct(index, (p) => (p.active = on)), { id: `settings-product-active-${index}` })}
  </div>`;
}

export function settingsView() {
  const draft = state.settingsDraft;
  if (!draft) return nothing;
  const t = ui.t;
  const tried = state.settingsTried;
  const problems = tried ? settingsProblems(draft) : [];
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);
  const busy = state.busy.settings === true;

  return html`<div class="pm-column" id="settings">
    <h2 class="pm-section-title">${t('settingsTitle')}</h2>
    ${state.fresh ? notice(t('setupHint'), 'info', 'settings-fresh') : nothing}

    ${card(
      html`${cardHead(t('producerTitle'), 'person')}
        <div class="pm-grid">
          ${field(draft.producer.name, (v) => change((s) => (s.producer.name = v)), {
            id: 'settings-producer-name',
            label: t('producerName'),
            placeholder: t('producerNamePlaceholder'),
            maxlength: 120,
          })}
          ${field(draft.producer.phone, (v) => change((s) => (s.producer.phone = v)), {
            id: 'settings-producer-phone',
            label: t('producerPhone'),
            type: 'tel',
            maxlength: 60,
          })}
        </div>
        <div class="pm-place-field">
          ${field(draft.producer.place, (v) => change((s) => (s.producer.place = v)), {
            id: 'settings-producer-place',
            label: t('producerPlace'),
            placeholder: t('producerPlacePlaceholder'),
            className: 'pm-grow',
          })}
          ${placeMapButton(
            t('mapProducerTitle'),
            draft.producer.point,
            draft.meetPoint,
            (p) => change((s) => (s.producer.point = p)),
            'settings-producer-map',
          )}
        </div>
        ${field(draft.producer.note, (v) => change((s) => (s.producer.note = v)), {
          id: 'settings-producer-note',
          label: t('producerNote'),
          multiline: true,
          maxlength: 1000,
        })}`,
      { id: 'settings-producer' },
    )}

    ${card(
      html`${cardHead(t('productsTitle'), 'basket')}
        <div class="pm-product-editors">${draft.products.map((p, i) => productEditor(p, i, draft.products.length, tried))}</div>
        ${draft.products.length < MAX_PRODUCTS
          ? html`<div>${button(t('addProduct'), () => change((s) => s.products.push(newProduct('', 'kg'))), { kind: 'soft', icon: 'plus', id: 'settings-add-product' })}</div>`
          : nothing}`,
      { id: 'settings-products' },
    )}

    ${card(
      html`${cardHead(t('tripTitle'), 'truck')}
        <div class="pm-radios" role="radiogroup" id="settings-split">
          ${(['equal', 'amount'] as const).map(
            (split) => html`<label class="pm-radio">
              <input type="radio" name="settings-split" id="settings-split-${split}" .checked=${draft.split === split} @change=${() => change((s) => (s.split = split))} />
              <span>${split === 'equal' ? t('splitEqual') : t('splitAmount')}</span>
            </label>`,
          )}
        </div>
        <p class="pm-hint">${t('tripHint')}</p>
        <div class="pm-place-field">
          ${field(draft.meetPlace, (v) => change((s) => (s.meetPlace = v)), {
            id: 'settings-meet-place',
            label: t('meetPlaceDefault'),
            placeholder: t('meetPlacePlaceholder'),
            className: 'pm-grow',
          })}
          ${placeMapButton(t('mapMeetTitle'), draft.meetPoint, draft.producer.point, (p) => change((s) => (s.meetPoint = p)), 'settings-meet-map')}
        </div>`,
      { id: 'settings-trip' },
    )}

    ${card(
      html`${cardHead(t('rolesTitle'), 'people')}
        <span class="pm-label">${t('organizeRoles')}</span>
        ${rolePicker('settings-organize', draft.organize, (keys) => change((s) => (s.organize = keys)))}
        <span class="pm-label">${t('orderRoles')}</span>
        ${rolePicker('settings-order', draft.order, (keys) => change((s) => (s.order = keys)))}
        <p class="pm-hint">${t('rolesHint')}</p>`,
      { id: 'settings-roles' },
    )}

    ${problems.length > 0
      ? html`<div class="pm-problems" id="settings-problems">${problems.map((p) => notice(t(PROBLEMS[p]), 'warning'))}</div>`
      : nothing}

    <div class="pm-actions pm-sticky-actions">
      ${dirty ? html`<span class="pm-hint pm-grow" id="settings-unsaved">${t('unsavedSettings')}</span>` : html`<span class="pm-grow"></span>`}
      ${state.fresh ? nothing : button(t('cancel'), goList, { kind: 'text', id: 'settings-cancel', disabled: busy })}
      ${button(t('save'), () => void saveSettings(), { kind: 'primary', icon: 'check', id: 'settings-save', busy, disabled: !dirty && !state.fresh })}
    </div>
  </div>`;
}
