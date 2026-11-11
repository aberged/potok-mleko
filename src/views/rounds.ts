// The first screen: rounds still ahead as cards, earlier ones as short rows,
// and "New round" for those who may open one.

import { html, nothing } from 'lit-html';
import { ROUNDS } from '../model/config';
import { clock, day, left, locale, longDay, when } from '../model/format';
import { newRound, upcoming, type Stage } from '../model/round';
import { goList, openRound, openRoundForm } from '../store/actions';
import { loadRounds } from '../store/data';
import { canWrite, state, type RoundValue } from '../store/state';
import { button, money, notice, qty, ui } from './common';
import { icon, type IconName } from './icons';
import { roundModel, type RoundModel } from './round-model';

const STAGES: Record<Stage, { label: 'stageOpen' | 'stageClosed' | 'stagePicked' | 'stageDone' | 'stageCancelled'; icon: IconName }> = {
  open: { label: 'stageOpen', icon: 'basket' },
  closed: { label: 'stageClosed', icon: 'lock' },
  picked: { label: 'stagePicked', icon: 'truck' },
  done: { label: 'stageDone', icon: 'checkCircle' },
  cancelled: { label: 'stageCancelled', icon: 'cancelled' },
};

export function stageChip(stage: Stage, id?: string) {
  const s = STAGES[stage];
  return html`<span class="pm-stage pm-stage-${stage}" id=${id ?? nothing}>${icon(s.icon, 'size-3.5')}<span>${ui.t(s.label)}</span></span>`;
}

/** The day as on a calendar page. */
export function dateBadge(iso: string, size: 'big' | 'small' = 'big') {
  const lang = ui.t.lang;
  const d = new Date(iso);
  return html`<span class="pm-date pm-date-${size}" aria-hidden="true">
    <span class="pm-date-month">${new Intl.DateTimeFormat(locale(lang), { month: 'short' }).format(d).replace('.', '')}</span>
    <span class="pm-date-day">${d.getDate()}</span>
  </span>`;
}

export function timeLeft(iso: string): string | null {
  const rest = left(iso, state.now);
  if (!rest) return null;
  const key = rest.unit === 'days' ? 'daysLeft' : rest.unit === 'hours' ? 'hoursLeft' : 'minutesLeft';
  return ui.t.plural(key, rest.n);
}

function totalsLine(model: RoundModel) {
  const products = model.summary.products;
  if (products.length === 0) return nothing;
  return html`<span class="pm-totals">${products.map((p, i) => html`${i > 0 ? ' · ' : ''}<span class="pm-nowrap">${p.product.name} ${qty(p.qty, p.product.unit)}</span>`)}</span>`;
}

function roundCard(value: RoundValue) {
  const t = ui.t;
  const lang = t.lang;
  const model = roundModel(value);
  const { round, summary } = model;
  const active = model.drivers.active;
  const rest = model.stage === 'open' ? timeLeft(round.closesAt) : null;
  const mine = model.mine ? summary.entries.find((e) => e.id === model.mine!.id) : null;

  return html`<button type="button" class="pm-round-card pm-round-${model.stage}" id="round-card-${value.id}" @click=${() => openRound(value.id)}>
    ${dateBadge(round.farmAt)}
    <span class="pm-round-main">
      <span class="pm-round-top">
        <span class="pm-round-title">${longDay(round.farmAt, lang)}</span>
        ${stageChip(model.stage)}
      </span>
      <span class="pm-round-meta">
        <span class="pm-meta">${icon('truck', 'size-4')}<span>${t('atFarm')} ${clock(round.farmAt, lang)}</span></span>
        <span class="pm-meta">${icon('pin', 'size-4')}<span>${t('handout')} ${when(round.meetAt, lang, round.farmAt)}${round.meetPlace ? `, ${round.meetPlace}` : ''}</span></span>
      </span>
      ${model.stage === 'open'
        ? html`<span class="pm-round-meta"
            ><span class="pm-meta"
              >${icon('clock', 'size-4')}<span
                >${t('ordersUntil')} ${when(round.closesAt, lang)}${rest ? html` · <strong class="pm-accent pm-nowrap">${rest}</strong>` : nothing}</span
              ></span
            ></span
          >`
        : nothing}
      ${model.details.loaded && model.stage !== 'cancelled'
        ? html`<span class="pm-round-stats">
            ${totalsLine(model)}
            <span class="pm-muted pm-nowrap">${t.plural('orders', summary.entries.length)}</span>
          </span>
          <span class="pm-round-foot">
            ${active
              ? html`<span class="pm-meta">${icon('person', 'size-4')}<span>${t('driverIs', { name: model.iDrive ? t('you') : (active.creator_username ?? '') })}</span></span>`
              : html`<span class="pm-meta pm-warn-text">${icon('warning', 'size-4')}<span>${t('lookingForDriver')}</span></span>`}
            ${mine
              ? html`<span class="pm-mine-pill">${icon('check', 'size-3.5')}${money(mine.due)}</span>`
              : nothing}
          </span>`
        : nothing}
    </span>
    <span class="pm-round-chevron" aria-hidden="true">${icon('right', 'size-5')}</span>
  </button>`;
}

function pastRow(value: RoundValue) {
  const t = ui.t;
  const model = roundModel(value);
  const mine = state.mine[value.id];
  const fromMine = mine && !model.details.loaded ? null : model.mine ? model.summary.entries.find((e) => e.id === model.mine!.id) : null;

  return html`<button type="button" class="pm-past-row" id="round-row-${value.id}" @click=${() => openRound(value.id)}>
    ${dateBadge(value.round.farmAt, 'small')}
    <span class="pm-past-main">
      <span class="pm-past-title">${day(value.round.farmAt, t.lang)}</span>
      ${stageChip(model.stage)}
    </span>
    <span class="pm-past-mine">${fromMine ? money(fromMine.due) : mine ? html`${icon('check', 'size-4')}` : nothing}</span>
    ${icon('right', 'size-4')}
  </button>`;
}

export function roundsView() {
  const t = ui.t;
  const now = state.now;
  const ahead = state.rounds
    .filter((r) => upcoming(r.round, now))
    .sort((a, b) => Date.parse(a.round.farmAt) - Date.parse(b.round.farmAt));
  const earlier = state.rounds
    .filter((r) => !upcoming(r.round, now))
    .sort((a, b) => Date.parse(b.round.farmAt) - Date.parse(a.round.farmAt));
  const organize = canWrite(ROUNDS);

  return html`<div class="pm-column" id="rounds">
    <div class="pm-section-head">
      <h2 class="pm-section-title">${t('upcoming')}</h2>
      ${organize
        ? button(t('newRound'), () => openRoundForm(null, newRound(state.settings, Date.now()), true), {
            kind: 'primary',
            icon: 'plus',
            id: 'new-round',
          })
        : nothing}
    </div>

    ${!state.roundsLoaded
      ? html`<div class="pm-skeleton" aria-hidden="true"></div><div class="pm-skeleton" aria-hidden="true"></div>`
      : ahead.length === 0
        ? html`<div class="pm-empty" id="rounds-empty">
            <span class="pm-tile" aria-hidden="true">${icon('calendar', 'size-6')}</span>
            <strong>${t('noRounds')}</strong>
            <span class="pm-muted">${organize ? t('noRoundsOrganize') : t('noRoundsWait')}</span>
          </div>`
        : html`<div class="pm-list" id="rounds-ahead">${ahead.map(roundCard)}</div>`}

    ${earlier.length > 0 || state.roundsMore
      ? html`<h2 class="pm-section-title pm-section-gap">${t('earlier')}</h2>
          <div class="pm-past-list" id="rounds-earlier">${earlier.map(pastRow)}</div>`
      : nothing}
    ${state.roundsMore
      ? html`<div class="pm-center">
          ${button(t('loadMore'), () => void loadRounds(true), { kind: 'secondary', id: 'rounds-more', busy: state.roundsLoading })}
        </div>`
      : nothing}
  </div>`;
}

export function missingRound() {
  return html`<div class="pm-column">
    ${notice(ui.t('roundNotFound'), 'info', 'round-missing')}
    <div>${button(ui.t('back'), goList, { kind: 'secondary', icon: 'back' })}</div>
  </div>`;
}
