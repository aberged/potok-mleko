// Pieces every screen uses: buttons, fields, a switch, a stepper, menus,
// dialogs, notices and the role picker, each in the shape Potok's page gives it.

import { html, nothing, type TemplateResult } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { translator, type Translate } from '../i18n';
import { money as formatMoney, number as formatNumber } from '../model/format';
import type { Unit } from '../model/config';
import { state, update } from '../store/state';
import { icon, type IconName } from './icons';

export const ui: { t: Translate } = { t: translator('sr') };

export function setUi(lang: string) {
  ui.t = translator(lang);
}

export const money = (n: number) => formatMoney(n, ui.t.lang);
export const num = (n: number) => formatNumber(n, ui.t.lang);

export function unitLabel(unit: Unit): string {
  return ui.t(unit === 'kg' ? 'unitKg' : unit === 'kom' ? 'unitKom' : 'unitL');
}

export const qty = (n: number, unit: Unit) => `${num(n)} ${unitLabel(unit)}`;

export type ButtonKind = 'primary' | 'secondary' | 'soft' | 'text' | 'success' | 'danger';

export function button(
  label: string,
  onClick: () => void,
  options: { kind?: ButtonKind; id?: string; disabled?: boolean; icon?: IconName; title?: string; busy?: boolean; small?: boolean } = {},
) {
  return html`<button
    type="button"
    id=${options.id ?? nothing}
    class="pm-button pm-button-${options.kind ?? 'text'} ${options.small ? 'pm-button-small' : ''}"
    title=${options.title ?? nothing}
    ?disabled=${options.disabled || options.busy}
    aria-busy=${options.busy ? 'true' : nothing}
    @click=${onClick}
  >
    ${options.busy ? html`<span class="pm-spinner" aria-hidden="true"></span>` : options.icon ? icon(options.icon, 'size-4') : nothing}<span
      >${label}</span
    >
  </button>`;
}

export function iconButton(
  name: IconName,
  label: string,
  onClick: (event: Event) => void,
  options: { id?: string; active?: boolean; disabled?: boolean; className?: string } = {},
) {
  return html`<button
    type="button"
    id=${options.id ?? nothing}
    class="pm-icon-button ${options.active ? 'pm-icon-button-active' : ''} ${options.className ?? ''}"
    title=${label}
    aria-label=${label}
    ?disabled=${options.disabled}
    @click=${onClick}
  >
    ${icon(name)}
  </button>`;
}

export function toggle(
  checked: boolean,
  label: string,
  onChange: (checked: boolean) => void,
  options: { id?: string; disabled?: boolean; hint?: string } = {},
) {
  return html`<label class="pm-switch ${options.disabled ? 'pm-switch-disabled' : ''}">
    <input
      type="checkbox"
      role="switch"
      id=${options.id ?? nothing}
      .checked=${live(checked)}
      ?disabled=${options.disabled}
      @change=${(event: Event) => onChange((event.target as HTMLInputElement).checked)}
    />
    <span class="pm-switch-track" aria-hidden="true"><span class="pm-switch-thumb"></span></span>
    <span class="pm-switch-text"
      ><span>${label}</span>${options.hint ? html`<span class="pm-hint">${options.hint}</span>` : nothing}</span
    >
  </label>`;
}

export function check(checked: boolean, label: string, onChange: (checked: boolean) => void, options: { id?: string; disabled?: boolean } = {}) {
  return html`<label class="pm-check ${options.disabled ? 'pm-check-disabled' : ''}">
    <input
      type="checkbox"
      id=${options.id ?? nothing}
      .checked=${live(checked)}
      ?disabled=${options.disabled}
      @change=${(event: Event) => onChange((event.target as HTMLInputElement).checked)}
    />
    <span>${label}</span>
  </label>`;
}

type FieldOptions = {
  id: string;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'tel' | 'datetime-local' | 'number';
  inputmode?: 'decimal' | 'numeric' | 'text';
  maxlength?: number;
  suffix?: string;
  multiline?: boolean;
  className?: string;
  error?: boolean;
  onBlur?: () => void;
  onEnter?: () => void;
};

/** A labelled field; `onInput` gets the text as typed. */
export function field(value: string, onInput: (value: string) => void, options: FieldOptions) {
  const input = options.multiline
    ? html`<textarea
        id=${options.id}
        class="pm-field pm-textarea ${options.error ? 'pm-field-error' : ''}"
        rows="2"
        placeholder=${options.placeholder ?? nothing}
        maxlength=${options.maxlength ?? 1000}
        .value=${live(value)}
        @input=${(event: Event) => onInput((event.target as HTMLTextAreaElement).value)}
        @blur=${options.onBlur ?? nothing}
      ></textarea>`
    : html`<input
        id=${options.id}
        type=${options.type === 'number' ? 'text' : (options.type ?? 'text')}
        inputmode=${options.inputmode ?? (options.type === 'number' ? 'decimal' : nothing)}
        class="pm-field ${options.error ? 'pm-field-error' : ''}"
        placeholder=${options.placeholder ?? nothing}
        maxlength=${options.maxlength ?? 200}
        .value=${live(value)}
        @input=${(event: Event) => onInput((event.target as HTMLInputElement).value)}
        @blur=${options.onBlur ?? nothing}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'Enter' && options.onEnter) {
            event.preventDefault();
            options.onEnter();
          }
        }}
      />`;

  return html`<label class="pm-labelled ${options.className ?? ''}" for=${options.id}>
    ${options.label ? html`<span class="pm-label">${options.label}</span>` : nothing}
    ${options.suffix ? html`<span class="pm-with-suffix">${input}<span class="pm-suffix">${options.suffix}</span></span>` : input}
  </label>`;
}

const decimal = (n: number) => (Number.isFinite(n) ? String(n).replace('.', ui.t.lang === 'en' ? '.' : ',') : '');

/** What a number field holds, if it reads as a number in [min, max]. */
function readNumber(text: string, min: number, max: number): number | null {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() !== '' && Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 1000) / 1000 : null;
}

/**
 * A number field that takes the number as it is typed. Its text is written
 * back only when the number changes, and not with `live`, so a comma typed on
 * the way to "1,5" stays. Nothing waits for the field to be left: on a phone,
 * a tap on a button may not take the focus from it. What does not read as a
 * number goes back to the last good one when the field is left.
 */
export function numberField(value: number, onChange: (value: number) => void, options: Omit<FieldOptions, 'type' | 'multiline'> & { min?: number; max?: number }) {
  const min = options.min ?? 0;
  const max = options.max ?? 1_000_000;
  const input = html`<input
    id=${options.id}
    type="text"
    inputmode=${options.inputmode ?? 'decimal'}
    class="pm-field ${options.error ? 'pm-field-error' : ''}"
    placeholder=${options.placeholder ?? nothing}
    maxlength="12"
    .value=${decimal(value)}
    @input=${(event: Event) => {
      const n = readNumber((event.target as HTMLInputElement).value, min, max);
      if (n !== null && n !== value) onChange(n);
    }}
    @change=${(event: Event) => {
      const el = event.target as HTMLInputElement;
      if (readNumber(el.value, min, max) === null) el.value = decimal(value);
    }}
    @keydown=${(event: KeyboardEvent) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
  />`;

  return html`<label class="pm-labelled ${options.className ?? ''}" for=${options.id}>
    ${options.label ? html`<span class="pm-label">${options.label}</span>` : nothing}
    ${options.suffix ? html`<span class="pm-with-suffix">${input}<span class="pm-suffix">${options.suffix}</span></span>` : input}
  </label>`;
}

export function select<T extends string>(
  value: T,
  options: { value: T; label: string }[],
  onChange: (value: T) => void,
  attrs: { id: string; label?: string },
) {
  return html`<label class="pm-labelled" for=${attrs.id}>
    ${attrs.label ? html`<span class="pm-label">${attrs.label}</span>` : nothing}
    <select id=${attrs.id} class="pm-select" @change=${(event: Event) => onChange((event.target as HTMLSelectElement).value as T)}>
      ${options.map((option) => html`<option value=${option.value} ?selected=${option.value === value}>${option.label}</option>`)}
    </select>
  </label>`;
}

/** − quantity + : the step is the product's; typing a number works too. */
export function stepper(
  value: number,
  step: number,
  unit: Unit,
  onChange: (value: number) => void,
  options: { id: string; disabled?: boolean; max?: number },
) {
  const t = ui.t;
  const max = options.max ?? 999;
  const snap = (n: number) => Math.min(max, Math.max(0, Math.round(n * 1000) / 1000));

  return html`<div class="pm-stepper ${value > 0 ? 'pm-stepper-on' : ''}" role="group" aria-label=${t('quantity')}>
    <button
      type="button"
      class="pm-step"
      aria-label=${t('minus')}
      id="${options.id}-minus"
      ?disabled=${options.disabled || value <= 0}
      @click=${() => onChange(snap(value - step))}
    >
      ${icon('minus', 'size-4')}
    </button>
    <input
      class="pm-step-value"
      id=${options.id}
      inputmode="decimal"
      aria-label=${t('quantity')}
      ?disabled=${options.disabled}
      .value=${decimal(value)}
      @focus=${(event: Event) => (event.target as HTMLInputElement).select()}
      @input=${(event: Event) => {
        const n = readNumber((event.target as HTMLInputElement).value, 0, max);
        if (n !== null && n !== value) onChange(snap(n));
      }}
      @change=${(event: Event) => {
        const input = event.target as HTMLInputElement;
        if (readNumber(input.value, 0, max) === null) input.value = decimal(value);
      }}
    />
    <span class="pm-step-unit">${unitLabel(unit)}</span>
    <button
      type="button"
      class="pm-step"
      aria-label=${t('plus')}
      id="${options.id}-plus"
      ?disabled=${options.disabled || value >= max}
      @click=${() => onChange(snap(value + step))}
    >
      ${icon('plus', 'size-4')}
    </button>
  </div>`;
}

/** A menu that opens under its button; one at a time in the whole app. */
export function menu(id: string, trigger: TemplateResult, items: TemplateResult | TemplateResult[], align: 'left' | 'right' = 'right') {
  const open = state.menu === id;

  return html`<div class="pm-menu-anchor">
    <div
      @click=${(event: Event) => {
        event.stopPropagation();
        update((s) => (s.menu = open ? null : id));
      }}
    >
      ${trigger}
    </div>
    ${open
      ? html`<div class="pm-menu pm-menu-${align}" role="menu" id="${id}-menu" @click=${(event: Event) => event.stopPropagation()}>
          ${items}
        </div>`
      : nothing}
  </div>`;
}

export function menuItem(label: string, onClick: () => void, options: { danger?: boolean; icon?: IconName; id?: string; disabled?: boolean } = {}) {
  return html`<button
    type="button"
    role="menuitem"
    id=${options.id ?? nothing}
    class="pm-menu-item ${options.danger ? 'pm-menu-item-danger' : ''}"
    ?disabled=${options.disabled}
    @click=${() => {
      update((s) => (s.menu = null));
      onClick();
    }}
  >
    ${options.icon ? icon(options.icon, 'size-4') : nothing}<span>${label}</span>
  </button>`;
}

export function closeDialog() {
  update((s) => (s.dialog = null));
}

/** A dialog as Potok draws one: a sheet from the bottom on a phone, a card in the middle on a wide screen. */
export function dialog(title: string, body: TemplateResult, actions: TemplateResult, id = 'pm-dialog', symbol: IconName | null = null) {
  return html`<div class="pm-backdrop" @click=${closeDialog}>
    <div
      class="pm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${id}-title"
      id=${id}
      @click=${(event: Event) => event.stopPropagation()}
      @keydown=${(event: KeyboardEvent) => event.key === 'Escape' && closeDialog()}
    >
      <header class="pm-dialog-head">
        ${symbol ? html`<span class="pm-tile pm-tile-small" aria-hidden="true">${icon(symbol)}</span>` : nothing}
        <h2 id="${id}-title" class="pm-dialog-title">${title}</h2>
        <button type="button" class="pm-icon-button" aria-label=${ui.t('close')} @click=${closeDialog}>${icon('close')}</button>
      </header>
      ${body}
      <footer class="pm-dialog-actions">${actions}</footer>
    </div>
  </div>`;
}

export function confirmDialog() {
  const d = state.dialog;
  if (!d) return nothing;
  const t = ui.t;

  return dialog(
    d.label ?? t('yes'),
    html`<div class="pm-dialog-body"><p>${d.text}</p></div>`,
    html`${button(t('back'), closeDialog, { kind: 'text', id: 'confirm-no' })}
    ${button(d.label ?? t('yes'), () => {
      closeDialog();
      d.action();
    }, { kind: d.danger ? 'danger' : 'primary', id: 'confirm-yes' })}`,
    'confirm-dialog',
    d.danger ? 'warning' : 'info',
  );
}

export function notice(text: string | TemplateResult, kind: 'info' | 'warning' = 'info', id?: string) {
  return html`<div class="pm-notice pm-notice-${kind}" role="status" id=${id ?? nothing}>
    <span class="pm-notice-icon" aria-hidden="true">${icon(kind === 'warning' ? 'warning' : 'info', 'size-4')}</span><span>${text}</span>
  </div>`;
}

/** Roles as chips with checks; at least one stays chosen. */
export function rolePicker(id: string, chosen: string[], onChange: (keys: string[]) => void) {
  const roles = state.roles;
  if (!roles) return html`<p class="pm-muted pm-small">${ui.t('rolesLoading')}</p>`;

  return html`<div class="pm-chips" id=${id} role="group">
    ${roles.map((role) => {
      const on = chosen.includes(role.key);
      return html`<button
        type="button"
        class="pm-chip ${on ? 'pm-chip-on' : ''}"
        aria-pressed=${String(on)}
        data-role=${role.key}
        ?disabled=${on && chosen.length === 1}
        @click=${() => onChange(on ? chosen.filter((key) => key !== role.key) : [...chosen, role.key])}
      >
        ${on ? icon('check', 'size-4') : nothing}<span>${role.name}</span>
      </button>`;
    })}
  </div>`;
}

export function card(content: TemplateResult | (TemplateResult | typeof nothing)[], options: { id?: string; className?: string } = {}) {
  return html`<section class="pm-card ${options.className ?? ''}" id=${options.id ?? nothing}>${content}</section>`;
}

export function cardHead(title: string, symbol: IconName, extra: TemplateResult | typeof nothing = nothing) {
  return html`<header class="pm-card-head">
    <span class="pm-tile pm-tile-small" aria-hidden="true">${icon(symbol)}</span>
    <h2 class="pm-card-title">${title}</h2>
    ${extra}
  </header>`;
}
