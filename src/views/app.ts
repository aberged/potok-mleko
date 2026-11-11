// The whole app: a bar with the producer and the viewer's notifications, then
// the rounds, one round, the round form or the settings, and the dialog and
// toast over them. It draws in Potok's own look: the page's theme, its icons,
// its pill buttons and cards.

import { html, nothing } from 'lit-html';
import { ORDERS, ROUNDS } from '../model/config';
import { goList, openRound, openSettings, setNotify } from '../store/actions';
import { boot } from '../store/data';
import { caps, isEditor, state, update } from '../store/state';
import { button, confirmDialog, iconButton, menu, notice, toggle, ui } from './common';
import { icon } from './icons';
import { roundView } from './round';
import { roundFormView } from './round-form';
import { missingRound, roundsView } from './rounds';
import { settingsView } from './settings';

function back() {
  const screen = state.screen;
  if (screen.kind === 'form' && screen.id !== null) openRound(screen.id);
  else goList();
}

function notifyMenu() {
  const t = ui.t;
  const rounds = caps(ROUNDS);
  const orders = caps(ORDERS);
  if (!rounds || rounds.read !== 'all') return nothing;
  const on = rounds.notify || orders?.notify === true;

  return menu(
    'notify',
    iconButton(on ? 'bellOn' : 'bell', t('notifyTitle'), () => {}, { id: 'notify-button', active: on }),
    html`<div class="pm-menu-panel" id="notify-panel">
      <strong class="pm-menu-title">${t('notifyTitle')}</strong>
      ${toggle(rounds.notify, t('notifyRounds'), (value) => void setNotify(ROUNDS, value), { id: 'notify-rounds', disabled: state.busy[`notify:${ROUNDS}`] === true })}
      ${orders && orders.read === 'all'
        ? toggle(orders.notify, t('notifyOrders'), (value) => void setNotify(ORDERS, value), { id: 'notify-orders', disabled: state.busy[`notify:${ORDERS}`] === true })
        : nothing}
      <p class="pm-hint">${t('notifyHint')}</p>
    </div>`,
  );
}

function topBar() {
  const t = ui.t;
  const producer = state.settings.producer;
  const atList = state.screen.kind === 'list';
  const title = producer.name || state.groupName || t('appName');
  const sub = [producer.place].filter(Boolean).join(' · ');

  return html`<header class="pm-topbar" id="topbar">
    <div class="pm-topbar-row">
      ${atList
        ? html`<span class="pm-tile" aria-hidden="true">${icon('basket', 'size-6')}</span>`
        : iconButton('back', t('back'), back, { id: 'back', className: 'pm-back' })}
      <div class="pm-topbar-title">
        <span class="pm-topbar-name" id="producer-name">${title}</span>
        ${sub || producer.phone
          ? html`<span class="pm-topbar-sub"
              >${sub}${sub && producer.phone ? ' · ' : ''}${producer.phone
                ? html`<a class="pm-link" href="tel:${producer.phone.replace(/[^\d+]/g, '')}">${producer.phone}</a>`
                : nothing}</span
            >`
          : nothing}
      </div>
      <div class="pm-topbar-actions">
        ${notifyMenu()}
        ${isEditor() && state.screen.kind !== 'settings' ? iconButton('settings', t('settingsTitle'), openSettings, { id: 'open-settings' }) : nothing}
      </div>
    </div>
  </header>`;
}

function screenView() {
  const screen = state.screen;
  switch (screen.kind) {
    case 'list':
      return roundsView();
    case 'round': {
      const value = state.rounds.find((r) => r.id === screen.id);
      return value ? roundView(value) : missingRound();
    }
    case 'form':
      return roundFormView();
    case 'settings':
      return settingsView();
  }
}

function phaseView() {
  const t = ui.t;

  switch (state.phase) {
    case 'loading':
      return html`<div class="pm-loading" id="app-loading" role="status">
        <span class="pm-tile pm-pulse" aria-hidden="true">${icon('basket', 'size-6')}</span>
        <span class="pm-muted">${t('loading')}</span>
      </div>`;
    case 'failed':
      return html`<div class="pm-column">
        ${notice(t('failed'), 'warning', 'app-failed')}
        <div>${button(t('retry'), () => void boot(ui.t), { kind: 'secondary', icon: 'reopen', id: 'app-retry' })}</div>
      </div>`;
    case 'outdated':
      return html`<div class="pm-column">${notice(t('outdated'), 'warning', 'app-outdated')}</div>`;
    case 'previewFrame':
      return html`<div class="pm-column">${notice(t('previewFrame'), 'info', 'app-preview')}</div>`;
    case 'denied':
      return html`<div class="pm-column">${notice(t('membersOnly'), 'info', 'app-denied')}</div>`;
    case 'setup':
      return html`<div class="pm-column">
        <div class="pm-empty" id="app-setup">
          <span class="pm-tile" aria-hidden="true">${icon('basket', 'size-6')}</span>
          <strong>${state.groupName || t('appName')}</strong>
          <span class="pm-muted">${t('setupPending')}</span>
        </div>
      </div>`;
    default:
      return null;
  }
}

function toast() {
  return state.toast
    ? html`<div class="pm-toast" role="status" id="pm-toast">
        <span class="pm-toast-icon" aria-hidden="true">${icon('check', 'size-4')}</span><span>${state.toast}</span>
      </div>`
    : nothing;
}

export function appView() {
  const phase = phaseView();
  if (phase) return html`<div class="pm-root"><main class="pm-main">${phase}</main></div>`;

  const closeMenu = () => state.menu && update((s) => (s.menu = null));

  return html`<div class="pm-root" @click=${closeMenu}>
    ${topBar()}
    <main class="pm-main">${screenView()}</main>
    ${state.dialog ? confirmDialog() : nothing}${toast()}
  </div>`;
}
