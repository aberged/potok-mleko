// Opening or changing a round: the three times, where goods are handed out,
// a word on empty bottles, which products and at what price, how the trip is
// shared, and for a new round whether its organizer goes for the goods.

import { html, nothing } from 'lit-html';
import { DRIVERS } from '../model/config';
import { currency, fromLocalInput, toLocalInput } from '../model/format';
import { roundProblems, type RoundProblem } from '../model/round';
import { changeRoundDraft, goList, openRound, saveRound } from '../store/actions';
import { canWrite, state, update } from '../store/state';
import { button, card, cardHead, field, notice, numberField, qty, toggle, ui, unitLabel } from './common';

const PROBLEMS: Record<RoundProblem, 'problemOrder' | 'problemNoProducts' | 'problemProductName'> = {
  order: 'problemOrder',
  noProducts: 'problemNoProducts',
  productName: 'problemProductName',
};

function timeField(id: string, label: string, iso: string, set: (iso: string) => void, error: boolean) {
  return field(
    toLocalInput(iso),
    (text) => {
      const value = fromLocalInput(text);
      if (value) set(value);
    },
    { id, label, type: 'datetime-local', error },
  );
}

export function roundFormView() {
  const draft = state.roundDraft;
  if (!draft) return nothing;
  const t = ui.t;
  const round = draft.round;
  const problems = draft.tried ? roundProblems(round) : [];
  const busy = state.busy.round === true;
  const cur = currency(t.lang);
  const leave = () => (draft.id === null ? goList() : openRound(draft.id));

  return html`<div class="pm-column" id="round-form">
    <h2 class="pm-section-title">${draft.id === null ? t('formNew') : t('formEdit')}</h2>

    ${card(
      html`${cardHead(t('rounds'), 'calendar')}
        <div class="pm-grid">
          ${timeField('form-farm-at', t('farmAtLabel'), round.farmAt, (v) => changeRoundDraft((r) => (r.farmAt = v)), problems.includes('order'))}
          ${timeField('form-closes-at', t('closesAtLabel'), round.closesAt, (v) => changeRoundDraft((r) => (r.closesAt = v)), problems.includes('order'))}
          ${timeField('form-meet-at', t('meetAtLabel'), round.meetAt, (v) => changeRoundDraft((r) => (r.meetAt = v)), problems.includes('order'))}
          ${field(round.meetPlace, (v) => changeRoundDraft((r) => (r.meetPlace = v)), {
            id: 'form-meet-place',
            label: t('meetPlaceLabel'),
            placeholder: t('meetPlacePlaceholder'),
          })}
        </div>
        ${field(round.bottlesNote, (v) => changeRoundDraft((r) => (r.bottlesNote = v)), {
          id: 'form-bottles',
          label: t('bottlesNoteLabel'),
          placeholder: t('bottlesNotePlaceholder'),
          maxlength: 500,
        })}
        ${field(round.note, (v) => changeRoundDraft((r) => (r.note = v)), { id: 'form-note', label: t('noteLabel'), multiline: true, maxlength: 2000 })}`,
      { id: 'form-when' },
    )}

    ${card(
      html`${cardHead(t('productsInRound'), 'basket')}
        <p class="pm-hint">${t('pricesHint')}</p>
        <div class="pm-form-products" id="form-products">
          ${round.products.map(
            (p, index) => html`<div class="pm-form-product ${p.active ? '' : 'pm-off'}" id="form-product-${p.id}">
              ${toggle(p.active, p.name || t('empty'), (on) => changeRoundDraft((r) => (r.products[index].active = on)), {
                id: `form-offered-${p.id}`,
                hint: p.pack ? `${p.pack.name || t('packaging')} ${qty(p.pack.size, p.unit)}` : undefined,
              })}
              ${p.active
                ? html`<div class="pm-grid pm-grid-tight">
                    ${numberField(p.price, (n) => changeRoundDraft((r) => (r.products[index].price = n)), {
                      id: `form-price-${p.id}`,
                      label: t('price'),
                      suffix: `${cur}/${unitLabel(p.unit)}`,
                    })}
                    ${p.pack
                      ? numberField(p.pack.price, (n) => changeRoundDraft((r) => r.products[index].pack && (r.products[index].pack.price = n)), {
                          id: `form-pack-price-${p.id}`,
                          label: t('packPrice'),
                          suffix: cur,
                        })
                      : nothing}
                  </div>`
                : nothing}
            </div>`,
          )}
        </div>`,
      { id: 'form-what' },
    )}

    ${card(
      html`${cardHead(t('splitLabel'), 'money')}
        <div class="pm-radios" role="radiogroup" id="form-split">
          ${(['equal', 'amount'] as const).map(
            (split) => html`<label class="pm-radio">
              <input
                type="radio"
                name="form-split"
                id="form-split-${split}"
                .checked=${round.split === split}
                @change=${() => changeRoundDraft((r) => (r.split = split))}
              />
              <span>${split === 'equal' ? t('splitEqual') : t('splitAmount')}</span>
            </label>`,
          )}
        </div>
        ${draft.id === null && canWrite(DRIVERS)
          ? toggle(draft.drive, t('iDrive'), (on) => update((s) => s.roundDraft && (s.roundDraft.drive = on)), { id: 'form-drive' })
          : nothing}`,
      { id: 'form-how' },
    )}

    ${problems.length > 0
      ? html`<div class="pm-problems" id="form-problems">${problems.map((p) => notice(t(PROBLEMS[p]), 'warning'))}</div>`
      : nothing}

    <div class="pm-actions pm-sticky-actions">
      <span class="pm-grow"></span>
      ${button(t('cancel'), leave, { kind: 'text', id: 'form-cancel', disabled: busy })}
      ${button(draft.id === null ? t('createRound') : t('save'), () => void saveRound(), { kind: 'primary', icon: 'check', id: 'form-save', busy })}
    </div>
  </div>`;
}
