// Numbers, money and times in the viewer's language. Dinars carry no paras in
// practice, so whole amounts show none.

export type Lang = 'sr' | 'sr-Cyrl' | 'en';

const LOCALES: Record<Lang, string> = { sr: 'sr-Latn-RS', 'sr-Cyrl': 'sr-Cyrl-RS', en: 'en-GB' };
const CURRENCY: Record<Lang, string> = { sr: 'din.', 'sr-Cyrl': 'дин.', en: 'RSD' };

export const locale = (lang: Lang) => LOCALES[lang];
export const currency = (lang: Lang) => CURRENCY[lang];

export function number(n: number, lang: Lang, maxDigits = 3): string {
  return new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: maxDigits }).format(n);
}

export function money(n: number, lang: Lang): string {
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  const text = new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(whole ? Math.round(n) : n);
  return `${text} ${CURRENCY[lang]}`;
}

/** "sub, 14. nov." */
export function day(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** "subota, 14. novembar" */
export function longDay(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function clock(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** The day only when it is not the same as `sameAs`'s. */
export function when(iso: string, lang: Lang, sameAs?: string): string {
  if (sameAs && new Date(iso).toDateString() === new Date(sameAs).toDateString()) return clock(iso, lang);
  return `${day(iso, lang)} ${clock(iso, lang)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** For `<input type="datetime-local">`, in the viewer's time zone. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** What is left until a moment, in its largest whole unit; null once it passed. */
export function left(iso: string, now: number): { unit: 'days' | 'hours' | 'minutes'; n: number } | null {
  const ms = Date.parse(iso) - now;
  if (!(ms > 0)) return null;
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return { unit: 'minutes', n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { unit: 'hours', n: hours };
  return { unit: 'days', n: Math.floor(hours / 24) };
}
