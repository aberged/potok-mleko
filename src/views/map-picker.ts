// Places on the map: the dialog where an editor drops a pin for the producer
// or for where goods are handed out, the button that opens it beside a place
// field, and the link that takes everyone to Potok's map at that point. The
// point stays in the app's own data; the group's own place is never touched.
//
// The map is Leaflet over Potok's tiles (`getMapConfig`), as in the Map app.
// It is made when the dialog opens and taken down when it closes: lit calls
// `mount` with the map's box, and with nothing once the box is gone.

import * as L from 'leaflet';
import { html, nothing } from 'lit-html';
import { ref } from 'lit-html/directives/ref.js';
import { round6, type Point } from '../model/config';
import type { PotokMapConfig } from '../potok';
import { pickOnMap, showOnMap } from '../store/actions';
import { state, update, type MapDialog } from '../store/state';
import { button, closeDialog, dialog, ui } from './common';
import { icon } from './icons';

// The drop of Potok's pins, on a 32 x 40 box with its point at (16, 39).
const DROP = 'M16 38.5C11 33 2 24 2 15a14 14 0 1 1 28 0c0 9-9 18-14 23.5Z';

let config: Promise<PotokMapConfig | null> | null = null;

/** Potok's map config, asked for once; asked again after a failure. */
function mapConfig(): Promise<PotokMapConfig | null> {
  config ??= window.potok
    .getMapConfig()
    .then((reply) => (reply.ok ? reply : null))
    .catch(() => null)
    .then((found) => {
      if (!found) config = null;
      return found;
    });
  return config;
}

let map: L.Map | null = null;
let marker: L.Marker | null = null;
let observer: ResizeObserver | null = null;
let mounted: Element | null = null;
let pinHtml = '';

const openDialog = (): MapDialog | null => (state.dialog?.kind === 'map' ? state.dialog : null);

function setStatus(status: MapDialog['status']) {
  update((s) => {
    if (s.dialog?.kind === 'map') s.dialog.status = status;
  });
}

function mount(el?: Element) {
  if (!el) {
    unmount();
    return;
  }
  if (el === mounted) return;
  unmount();
  mounted = el;

  void mapConfig().then((found) => {
    const d = openDialog();
    if (mounted !== el || !d) return;
    if (!found) {
      setStatus('failed');
      return;
    }
    start(el as HTMLElement, found, d);
    setStatus('ready');
  });
}

function start(el: HTMLElement, found: PotokMapConfig, d: MapDialog) {
  const maxZoom = found.tiles.max_zoom;
  map = L.map(el, { minZoom: 2, maxZoom, worldCopyJump: true });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  L.tileLayer(found.tiles.url, { maxZoom, attribution: found.tiles.attribution }).addTo(map);

  pinHtml = `<svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"><path d="${found.pins?.drop || DROP}" fill="currentColor" stroke="#fff" stroke-width="1.5"/><circle cx="16" cy="15" r="5" fill="#fff"/></svg>`;

  if (d.point) map.setView([d.point.lat, d.point.lng], 16);
  else if (d.near) map.setView([d.near.lat, d.near.lng], 13);
  else map.fitBounds(found.default_bounds);
  if (d.point) placeMarker(d.point);

  map.on('click', (event: L.LeafletMouseEvent) => setPoint(event.latlng));

  // The dialog grows into place after the map is made, and a phone turns.
  observer = new ResizeObserver(() => map?.invalidateSize());
  observer.observe(el);
  requestAnimationFrame(() => map?.invalidateSize());
}

function unmount() {
  observer?.disconnect();
  map?.remove();
  observer = null;
  map = null;
  marker = null;
  mounted = null;
}

function placeMarker(p: Point) {
  if (!map) return;
  if (marker) {
    marker.setLatLng([p.lat, p.lng]);
    return;
  }
  marker = L.marker([p.lat, p.lng], {
    draggable: true,
    autoPan: true,
    keyboard: false,
    icon: L.divIcon({ html: pinHtml, className: 'pm-map-pin', iconSize: [32, 40], iconAnchor: [16, 39] }),
  }).addTo(map);
  marker.on('dragend', () => marker && setPoint(marker.getLatLng()));
}

function setPoint(latlng: L.LatLng) {
  const wrapped = latlng.wrap();
  const p = { lat: round6(wrapped.lat), lng: round6(wrapped.lng) };
  placeMarker(p);
  update((s) => {
    if (s.dialog?.kind === 'map') s.dialog.point = p;
  });
}

/** For the keyboard: the arrows move the map, this puts the pin in its middle. */
function pinAtCenter() {
  if (map) setPoint(map.getCenter());
}

const samePoint = (a: Point | null, b: Point | null) => a?.lat === b?.lat && a?.lng === b?.lng;

export function mapDialog(d: MapDialog) {
  const t = ui.t;

  const body = html`<div class="pm-dialog-body pm-map-body">
    <p class="pm-hint">${t('mapHint')}</p>
    <div class="pm-map-frame">
      <div class="pm-map-box" id="map-dialog-map" ${ref(mount)}></div>
      ${d.status === 'ready'
        ? nothing
        : html`<div class="pm-map-cover" role="status">
            ${d.status === 'loading' ? html`<span class="pm-spinner" aria-hidden="true"></span><span>${t('mapLoading')}</span>` : t('mapFailed')}
          </div>`}
    </div>
    <div class="pm-map-foot">
      <span class="pm-hint" id="map-dialog-point" aria-live="polite"
        >${d.point ? t('mapPinAt', { lat: d.point.lat.toFixed(5), lng: d.point.lng.toFixed(5) }) : t('mapNoPin')}</span
      >
      ${d.status === 'ready' ? button(t('mapCenter'), pinAtCenter, { kind: 'soft', small: true, icon: 'pin', id: 'map-dialog-center' }) : nothing}
    </div>
  </div>`;

  const actions = html`${d.start
      ? button(
          t('mapRemove'),
          () => {
            closeDialog();
            d.save(null);
          },
          { kind: 'text', icon: 'trash', id: 'map-dialog-remove' },
        )
      : nothing}
    <span class="pm-grow"></span>
    ${button(t('cancel'), closeDialog, { kind: 'text', id: 'map-dialog-cancel' })}
    ${button(
      t('save'),
      () => {
        const p = d.point;
        closeDialog();
        d.save(p);
      },
      { kind: 'primary', icon: 'check', id: 'map-dialog-save', disabled: !d.point || samePoint(d.point, d.start) },
    )}`;

  return dialog(d.title, body, actions, 'map-dialog', 'pin');
}

/** The button beside a place field that opens the map on its point. */
export function placeMapButton(title: string, point: Point | null, near: Point | null, save: (point: Point | null) => void, id: string) {
  const t = ui.t;
  return button(point ? t('editOnMap') : t('pickOnMap'), () => pickOnMap(title, point, near, save), {
    kind: point ? 'soft' : 'secondary',
    icon: 'pin',
    id,
  });
}

/** A link to Potok's map at the point, with the group's picture on the pin and `label` on its card. */
export function mapLink(point: Point, label: string, id: string, text = ui.t('showOnMap')) {
  return html`<button
    type="button"
    class="pm-map-link"
    id=${id}
    title=${ui.t('showOnMap')}
    @click=${(event: Event) => {
      event.stopPropagation();
      showOnMap(point, label);
    }}
  >
    ${icon('pin', 'size-3.5')}<span>${text}</span>
  </button>`;
}
