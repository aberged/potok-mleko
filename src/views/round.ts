// One round: when and where, the viewer's own order, who goes for the goods,
// everyone's orders, what goes to the producer, and the handing out.

import { html, nothing, type TemplateResult } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { clock, currency, longDay, when } from '../model/format';
import { droppedLines, lineCost, type Order } from '../model/order';
import { offered, withNewProducts } from '../model/round';
import type { Entry, RoundSummary } from '../model/summary';
import {
  cancelOrder,
  confirm,
  copyText,
  deleteDuplicate,
  deleteRound,
  discardOrderChanges,
  openRoundForm,
  saveCost,
  saveOrder,
  setCostDraft,
  setHandover,
  setLine,
  setOrderNote,
  setPickedUp,
  setRoundStatus,
  volunteer,
  withdraw,
} from '../store/actions';
import { loadDetails } from '../store/data';
import { state, type RoundValue } from '../store/state';
import { button, card, cardHead, check, field, iconButton, menu, menuItem, money, notice, num, qty, stepper, toggle, ui, unitLabel } from './common';
import { icon } from './icons';
import { dateBadge, stageChip, timeLeft } from './rounds';
import { draftSummary, roundModel, type RoundModel } from './round-model';

const nameOf = (model: RoundModel, creatorId: number | null, username: string | null) =>
  creatorId !== null && creatorId === model.me ? ui.t('you') : (username ?? ui.t('empty'));

function packText(model: RoundModel['round']['products'][number]) {
  const t = ui.t;
  if (!model.pack) return nothing;
  return t('packInfo', { name: model.pack.name || t('packaging'), size: qty(model.pack.size, model.unit), price: money(model.pack.price) });
}

// --- When and where ---

function organizerMenu(model: RoundModel) {
  const t = ui.t;
  const { value, round } = model;
  const items: TemplateResult[] = [];

  if (model.organizer) {
    items.push(menuItem(t('editRound'), () => openRoundForm(value.id, { ...round, products: withNewProducts(round, state.settings) }), { icon: 'edit', id: 'round-edit' }));
    if (round.status === 'open' && model.stage === 'open') items.push(menuItem(t('closeOrders'), () => void setRoundStatus(value, 'closed'), { icon: 'stop', id: 'round-close' }));
    if (round.status === 'closed') items.push(menuItem(t('reopenOrders'), () => void setRoundStatus(value, 'open'), { icon: 'reopen', id: 'round-reopen' }));
    if (round.status === 'cancelled') items.push(menuItem(t('restoreRound'), () => void setRoundStatus(value, 'open'), { icon: 'restore', id: 'round-restore' }));
    else items.push(menuItem(t('cancelRound'), () => confirm(t('cancelRoundConfirm'), () => void setRoundStatus(value, 'cancelled'), { label: t('cancelRound') }), { icon: 'cancelled', danger: true, id: 'round-cancel' }));
  }
  if (model.editor) items.push(menuItem(t('deleteRound'), () => deleteRound(value), { icon: 'trash', danger: true, id: 'round-delete' }));

  if (items.length === 0) return nothing;
  return menu(`round-${value.id}`, iconButton('more', t('more'), () => {}, { id: 'round-menu' }), items);
}

function infoRow(symbol: Parameters<typeof icon>[0], label: string, content: TemplateResult | string, id?: string) {
  return html`<div class="pm-info-row" id=${id ?? nothing}>
    <span class="pm-info-icon" aria-hidden="true">${icon(symbol, 'size-4')}</span>
    <span class="pm-info-text"><span class="pm-info-label">${label}</span><span>${content}</span></span>
  </div>`;
}

function heroCard(model: RoundModel) {
  const t = ui.t;
  const lang = t.lang;
  const { round, value } = model;
  const producer = state.settings.producer;
  const rest = model.stage === 'open' ? timeLeft(round.closesAt) : null;
  const reopenLate = model.organizer && round.status === 'open' && model.stage === 'closed';

  return card(
    html`<div class="pm-hero-top">
        ${dateBadge(round.farmAt)}
        <div class="pm-hero-title">
          <h2 class="pm-round-heading">${longDay(round.farmAt, lang)}</h2>
          ${stageChip(model.stage, 'round-stage')}
        </div>
        ${organizerMenu(model)}
      </div>
      <div class="pm-info">
        ${infoRow('truck', t('atFarm'), html`${when(round.farmAt, lang)}${producer.name ? html` · ${producer.name}` : nothing}${producer.place ? html`, ${producer.place}` : nothing}`)}
        ${infoRow('clock', t('ordersUntil'), html`${when(round.closesAt, lang)}${rest ? html` · <strong class="pm-accent">${rest}</strong>` : nothing}`, 'round-closes')}
        ${infoRow('pin', t('handout'), `${when(round.meetAt, lang, round.farmAt)}${round.meetPlace ? ` · ${round.meetPlace}` : ''}`)}
        ${round.bottlesNote ? infoRow('pack', t('emptyBottles'), round.bottlesNote) : nothing}
        ${round.note ? infoRow('info', t('noteLabel'), html`<span class="pm-pre">${round.note}</span>`) : nothing}
        ${infoRow('person', '', t('organizer', { name: nameOf(model, value.creator_id, value.creator_username) }))}
      </div>
      ${reopenLate ? html`<p class="pm-hint">${t('reopenPast')}</p>` : nothing}`,
    { id: 'round-hero', className: 'pm-hero' },
  );
}

// --- The viewer's order ---

function draftOrder(model: RoundModel): Order {
  const draft = state.orderDraft?.round === model.value.id ? state.orderDraft : null;
  return draft ? { round: model.value.id, lines: draft.lines, note: draft.note } : (model.mine?.order ?? { round: model.value.id, lines: {}, note: '' });
}

function costRows(entry: Entry | null, tripKnown: boolean) {
  const t = ui.t;
  if (!entry) return nothing;
  const bottles = entry.cost.lines.reduce((s, l) => s + l.bottles, 0);

  return html`<dl class="pm-costs" id="my-costs">
    <div><dt>${t('goods')}</dt><dd>${money(entry.cost.goods)}</dd></div>
    ${bottles > 0 ? html`<div><dt>${t('packaging')} <span class="pm-muted">(${num(bottles)} ×)</span></dt><dd>${money(entry.cost.packaging)}</dd></div>` : nothing}
    <div><dt>${t('trip')}</dt><dd>${tripKnown ? money(entry.share) : html`<span class="pm-muted">${t('tripUnknown')}</span>`}</dd></div>
    <div class="pm-costs-total"><dt>${t('total')}</dt><dd id="my-total">${money(entry.due)}</dd></div>
  </dl>`;
}

function editableOrder(model: RoundModel) {
  const t = ui.t;
  const id = model.value.id;
  const order = draftOrder(model);
  const draft = state.orderDraft?.round === id ? state.orderDraft : null;
  const dirty = draft?.dirty === true;
  const entry = draftSummary(model, order);
  const busy = state.busy[`order:${id}`] === true;
  const hasSaved = model.mine !== null && Object.keys(model.mine.order.lines).length > 0;

  return html`<div class="pm-products" id="order-products">
      ${offered(model.round).map((product) => {
        const line = order.lines[product.id] ?? { qty: 0, own: false };
        const cost = line.qty > 0 ? lineCost(product, line) : null;
        return html`<div class="pm-product ${line.qty > 0 ? 'pm-product-on' : ''}" id="product-${product.id}">
          <div class="pm-product-head">
            <div class="pm-product-info">
              <span class="pm-product-name">${product.name}</span>
              <span class="pm-product-price">
                ${product.price > 0 ? t('perUnit', { price: money(product.price), unit: unitLabel(product.unit) }) : t('noPrice')}
              </span>
              ${product.pack ? html`<span class="pm-product-pack">${packText(product)}</span>` : nothing}
            </div>
            ${stepper(line.qty, product.step, product.unit, (n) => setLine(id, product.id, { qty: n }), { id: `qty-${product.id}`, disabled: busy })}
          </div>
          ${cost
            ? html`<div class="pm-product-foot">
                ${product.pack
                  ? toggle(line.own, t('ownPack'), (own) => setLine(id, product.id, { own }), { id: `own-${product.id}`, disabled: busy })
                  : html`<span></span>`}
                <span class="pm-product-cost">
                  ${money(cost.goods)}${cost.bottles > 0
                    ? html` <span class="pm-muted">+ ${num(cost.bottles)} × ${product.pack?.name || t('packaging')} ${money(cost.packaging)}</span>`
                    : nothing}
                </span>
              </div>`
            : nothing}
        </div>`;
      })}
    </div>
    ${droppedLines(model.round, order).length > 0 ? html`<p class="pm-hint">${t('noLongerOffered')}</p>` : nothing}
    ${field(order.note, (note) => setOrderNote(id, note), { id: 'order-note', label: t('orderNote'), placeholder: t('orderNotePlaceholder'), maxlength: 500 })}
    ${costRows(entry, model.summary.tripCost !== null)}
    <div class="pm-actions">
      ${dirty ? html`<span class="pm-hint pm-grow" id="order-unsaved">${t('unsavedOrder')}</span>` : html`<span class="pm-grow"></span>`}
      ${hasSaved && !dirty ? button(t('cancelOrder'), () => cancelOrder(id), { kind: 'text', id: 'order-cancel', disabled: busy }) : nothing}
      ${dirty ? button(t('cancel'), () => discardOrderChanges(id), { kind: 'text', id: 'order-discard', disabled: busy }) : nothing}
      ${button(hasSaved ? t('saveOrder') : t('placeOrder'), () => void saveOrder(id), {
        kind: 'primary',
        icon: 'check',
        id: 'order-save',
        disabled: !dirty || (!hasSaved && !entry),
        busy,
      })}
    </div>`;
}

function readOnlyOrder(model: RoundModel, why: string | null) {
  const t = ui.t;
  const entry = model.mine ? (model.summary.entries.find((e) => e.id === model.mine!.id) ?? null) : null;

  return html`${why ? notice(why, 'info', 'order-locked') : nothing}
    ${entry
      ? html`<ul class="pm-lines" id="my-lines">
            ${entry.cost.lines.map(
              (l) => html`<li>
                <span>${l.product.name} <strong>${qty(l.line.qty, l.product.unit)}</strong>${l.line.own ? html` <span class="pm-muted">· ${t('ownPackShort')}</span>` : nothing}</span>
                <span>${money(l.total)}</span>
              </li>`,
            )}
          </ul>
          ${entry.order.note ? html`<p class="pm-note">${entry.order.note}</p>` : nothing}
          ${costRows(entry, model.summary.tripCost !== null)}`
      : html`<p class="pm-muted" id="no-order">${t('noOrderYet')}</p>`}`;
}

function myOrderCard(model: RoundModel) {
  const t = ui.t;
  const open = model.stage === 'open';
  let body: TemplateResult;

  if (!model.details.loaded) body = html`<div class="pm-skeleton pm-skeleton-small" aria-hidden="true"></div>`;
  else if (open && model.canOrder) body = editableOrder(model);
  else if (open) body = readOnlyOrder(model, t('cannotOrder'));
  else body = readOnlyOrder(model, model.stage === 'cancelled' ? null : model.mine ? t('ordersClosedNote') : null);

  return card(html`${cardHead(t('myOrder'), 'basket')}${body}`, { id: 'my-order' });
}

// --- Who goes ---

function driverCard(model: RoundModel) {
  const t = ui.t;
  const id = model.value.id;
  const active = model.drivers.active;
  const reserves = model.drivers.reserves;
  const live_ = model.stage === 'open' || model.stage === 'closed' || model.stage === 'picked';
  const busy = state.busy[`drive:${id}`] === true;
  const costText = state.costDraft?.round === id ? state.costDraft.text : active?.driver.cost != null ? String(active.driver.cost) : '';

  const who = active
    ? html`<div class="pm-person" id="driver-name">
        <span class="pm-avatar" aria-hidden="true">${(model.iDrive ? t('you') : (active.creator_username ?? '?')).slice(0, 1).toUpperCase()}</span>
        <span class="pm-person-text">
          <strong>${model.iDrive ? t('youDrive') : t('driverIs', { name: active.creator_username ?? '' })}</strong>
          ${reserves.length > 0
            ? html`<span class="pm-muted pm-small">${t('reserves', { names: reserves.map((r) => nameOf(model, r.creator_id, r.creator_username)).join(', ') })}</span>`
            : nothing}
        </span>
        ${active.driver.pickedUp ? stageChip('picked') : nothing}
      </div>`
    : notice(t('noDriver'), 'warning', 'no-driver');

  const trip = html`<p class="pm-trip-line" id="trip-line">
    ${icon('money', 'size-4')}<span>${t('tripCost')}: ${model.summary.tripCost !== null ? html`<strong>${money(model.summary.tripCost)}</strong>` : t('tripUnknown')}</span>
    <span class="pm-muted">· ${model.round.split === 'amount' ? t('splitAmountShort') : t('splitEqualShort')}</span>
  </p>`;

  let controls: TemplateResult | typeof nothing = nothing;
  if (model.iDrive && model.stage !== 'cancelled') {
    controls = html`<div class="pm-driver-tools" id="driver-tools">
      <div class="pm-cost-row">
        ${field(costText, (text) => setCostDraft(id, text), {
          id: 'trip-cost',
          label: t('tripCost'),
          type: 'number',
          suffix: currency(t.lang),
          onEnter: () => void saveCost(id),
        })}
        ${button(t('save'), () => void saveCost(id), { kind: 'secondary', id: 'trip-cost-save', disabled: state.costDraft?.round !== id, busy: state.busy[`cost:${id}`] === true })}
      </div>
      <p class="pm-hint">${t('tripCostHint')}</p>
      ${toggle(active!.driver.pickedUp, t('pickedUp'), (on) => void setPickedUp(id, on), { id: 'picked-up', disabled: state.busy[`picked:${id}`] === true })}
      <div class="pm-actions">
        <span class="pm-grow"></span>
        ${button(t('withdraw'), () => withdraw(id), { kind: 'text', id: 'driver-withdraw', disabled: busy })}
      </div>
    </div>`;
  } else if (model.iStandBy && live_) {
    controls = html`<div class="pm-actions">
      <span class="pm-grow pm-muted">${t('youReserve')}</span>
      ${button(t('withdraw'), () => withdraw(id), { kind: 'text', id: 'driver-withdraw', disabled: busy })}
    </div>`;
  } else if (model.canDrive && live_ && model.stage !== 'picked') {
    controls = html`<div class="pm-actions">
      <span class="pm-grow"></span>
      ${button(active ? t('iCanToo') : t('iGo'), () => void volunteer(id), { kind: active ? 'secondary' : 'primary', icon: 'truck', id: 'driver-volunteer', busy })}
    </div>`;
  }

  return card(html`${cardHead(t('driverTitle'), 'truck')}${who}${trip}${controls}`, { id: 'driver' });
}

// --- Everyone's orders ---

function linesText(entry: Entry) {
  const t = ui.t;
  return entry.cost.lines.map(
    (l, i) => html`${i > 0 ? ', ' : ''}<span class="pm-nowrap">${l.product.name} ${qty(l.line.qty, l.product.unit)}${l.line.own ? html` <span class="pm-muted">(${t('ownPackShort')})</span>` : nothing}</span>`,
  );
}

function ordersCard(model: RoundModel) {
  const t = ui.t;
  const { summary } = model;

  return card(
    html`${cardHead(t('ordersTitle'), 'people', html`<span class="pm-count">${summary.entries.length}</span>`)}
      ${summary.products.length > 0
        ? html`<div class="pm-chips pm-totals-chips" id="product-totals">
            ${summary.products.map((p) => html`<span class="pm-total-chip"><span>${p.product.name}</span><strong>${qty(p.qty, p.product.unit)}</strong></span>`)}
          </div>`
        : nothing}
      ${summary.entries.length === 0
        ? html`<p class="pm-muted" id="no-orders">${t('noOrders')}</p>`
        : html`<ul class="pm-orders" id="orders-list">
            ${summary.entries.map(
              (e) => html`<li class="pm-order-row ${e.creatorId === model.me ? 'pm-order-mine' : ''}" id="order-${e.id}">
                <span class="pm-avatar pm-avatar-small" aria-hidden="true">${(e.name || '?').slice(0, 1).toUpperCase()}</span>
                <span class="pm-order-main">
                  <span class="pm-order-name">${nameOf(model, e.creatorId, e.name)}${e.driver ? html` <span class="pm-badge">${t('driverMark')}</span>` : nothing}</span>
                  <span class="pm-order-lines">${linesText(e)}</span>
                  ${e.order.note ? html`<span class="pm-note">${e.order.note}</span>` : nothing}
                </span>
                <span class="pm-order-due">${money(e.due)}</span>
              </li>`,
            )}
          </ul>`}
      ${model.editor && model.extras.length > 0
        ? html`<div class="pm-extras" id="order-extras">
            ${model.extras.map(
              (x) => html`<div class="pm-extra">
                ${notice(html`<strong>${x.creator_username ?? ''}</strong> · ${t('duplicate')}`, 'warning')}
                ${button(t('deleteDuplicate'), () => void deleteDuplicate(x.id, model.value.id), { kind: 'danger', small: true, icon: 'trash', busy: state.busy[`delete:${x.id}`] === true })}
              </div>`,
            )}
          </div>`
        : nothing}
      ${summary.entries.length > 0
        ? html`<dl class="pm-costs pm-costs-quiet">
            <div><dt>${t('roundTotal')}</dt><dd>${money(summary.producerTotal + (summary.tripCost ?? 0))}</dd></div>
          </dl>`
        : nothing}`,
    { id: 'orders' },
  );
}

// --- For the producer ---

function producerText(model: RoundModel, summary: RoundSummary): string {
  const t = ui.t;
  const producer = state.settings.producer;
  const head = [producer.name, `${longDay(model.round.farmAt, t.lang)} ${clock(model.round.farmAt, t.lang)}`].filter(Boolean).join(', ');
  const lines = summary.products.map((p) => {
    const parts = [`${p.product.name}: ${qty(p.qty, p.product.unit)}`];
    if (p.bottles > 0 && p.product.pack) parts.push(t('producerBottles', { n: num(p.bottles), name: `${p.product.pack.name || t('packaging')} ${qty(p.product.pack.size, p.product.unit)}` }));
    return parts.join(', ');
  });
  return [head, ...lines, `${t('total')}: ${money(summary.producerTotal)}`].join('\n');
}

function producerCard(model: RoundModel) {
  const t = ui.t;
  const { summary } = model;
  if (summary.entries.length === 0 || model.stage === 'cancelled') return nothing;
  const text = producerText(model, summary);

  return card(
    html`${cardHead(t('forProducer'), 'basket')}
      <table class="pm-table" id="producer-table">
        <tbody>
          ${summary.products.map(
            (p) => html`<tr>
              <th scope="row">${p.product.name}</th>
              <td>
                <strong>${qty(p.qty, p.product.unit)}</strong>
                ${p.bottles > 0 && p.product.pack ? html`<span class="pm-muted pm-small pm-block">${num(p.bottles)} × ${p.product.pack.name || t('packaging')} ${qty(p.product.pack.size, p.product.unit)}</span>` : nothing}
              </td>
              <td class="pm-num">${money(p.goods + p.packaging)}</td>
            </tr>`,
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colspan="2">${t('payProducer')}</th>
            <td class="pm-num" id="producer-total"><strong>${money(summary.producerTotal)}</strong></td>
          </tr>
        </tfoot>
      </table>
      ${summary.ownPackers.length > 0
        ? html`<div class="pm-own-packers" id="own-packers">
            <span class="pm-label">${t('ownPackers')}</span>
            <ul>
              ${summary.ownPackers.map(
                (e) => html`<li>
                  <strong>${nameOf(model, e.creatorId, e.name)}</strong>:
                  ${e.cost.lines.filter((l) => l.line.own).map((l, i) => html`${i > 0 ? ', ' : ''}${l.product.name} ${qty(l.line.qty, l.product.unit)}`)}
                </li>`,
              )}
            </ul>
          </div>`
        : nothing}
      <div class="pm-copy-block">
        <label class="pm-label" for="producer-text">${t('producerList')}</label>
        <textarea id="producer-text" class="pm-field pm-textarea pm-mono" readonly rows=${summary.products.length + 2} .value=${live(text)}></textarea>
        <div class="pm-actions">
          <span class="pm-grow"></span>
          ${button(t('copyList'), () => void copyText(text, 'producer-text'), { kind: 'soft', icon: 'copy', id: 'producer-copy', small: true })}
        </div>
      </div>`,
    { id: 'producer' },
  );
}

// --- Handing out ---

function handoutCard(model: RoundModel) {
  const t = ui.t;
  const { summary } = model;
  if (summary.entries.length === 0 || model.stage === 'cancelled') return nothing;
  if (model.stage === 'open' && !model.iDrive) return nothing;
  const id = model.value.id;
  const others = summary.entries.filter((e) => !e.driver);

  return card(
    html`${cardHead(t('handoutTitle'), 'money')}
      <p class="pm-hint">${t('handoutHint')}</p>
      <ul class="pm-handout" id="handout-list">
        ${summary.entries.map(
          (e) => html`<li class="pm-handout-row" id="handout-${e.id}">
            <span class="pm-handout-main">
              <span class="pm-order-name">${nameOf(model, e.creatorId, e.name)}${e.driver ? html` <span class="pm-badge">${t('driverMark')}</span>` : nothing}</span>
              <span class="pm-small pm-muted">${t('dueBreakdown', { goods: money(e.cost.total), trip: money(e.share) })}</span>
            </span>
            <span class="pm-handout-due">${money(e.due)}</span>
            <span class="pm-handout-checks">
              ${e.driver
                ? nothing
                : html`${check(e.handover.got, t('got'), (on) => void setHandover(id, e.id, 'got', on), { id: `got-${e.id}`, disabled: !model.iDrive })}
                  ${check(e.handover.paid, t('paid'), (on) => void setHandover(id, e.id, 'paid', on), { id: `paid-${e.id}`, disabled: !model.iDrive })}`}
            </span>
          </li>`,
        )}
      </ul>
      <div class="pm-handout-sum" id="handout-sum">
        <span>${t('collected', { a: money(summary.collected), b: money(summary.fromOthers) })}</span>
        <span class="pm-muted">${t('handedOut', { a: num(summary.handedOut), b: num(others.length) })}</span>
      </div>`,
    { id: 'handout' },
  );
}

export function roundView(value: RoundValue) {
  const model = roundModel(value);
  const t = ui.t;

  return html`<div class="pm-column" id="round-${value.id}">
    ${heroCard(model)}
    ${model.details.failed
      ? html`${notice(t('failed'), 'warning')}
          <div>${button(t('retry'), () => void loadDetails(value.id), { kind: 'secondary', icon: 'reopen' })}</div>`
      : nothing}
    ${model.stage === 'cancelled' ? notice(t('cancelledNote'), 'warning', 'round-cancelled') : nothing}
    ${myOrderCard(model)}
    ${model.details.loaded ? html`${driverCard(model)}${ordersCard(model)}${producerCard(model)}${handoutCard(model)}` : nothing}
  </div>`;
}
