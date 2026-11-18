// Draws the product icons of src/views/product-icons.ts as PNG files with a
// transparent background, in icons/products/<size>/<name>.png, for use outside
// the app (documents, slides, posts). The app itself does not use them, and
// the build does not take them.
//
//   node scripts/product-icons-png.mjs
//
// It renders in headless Chrome; set CHROME to its path when it is not in the
// usual place. Stroke 1.5 on the 24 grid, as in the app, in COLOR (#1f2937 by
// default).

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [64, 512];
const COLOR = process.env.COLOR || '#1f2937';
const CHROME =
  process.env.CHROME ||
  (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome');

function readPaths() {
  const source = readFileSync(path.join(ROOT, 'src/views/product-icons.ts'), 'utf8');
  const block = source.match(/const PATHS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error('no PATHS in src/views/product-icons.ts');
  const paths = [...block[1].matchAll(/^\s*([a-z]+): '([^']+)',?$/gm)].map(([, name, d]) => ({ name, d }));
  if (paths.length === 0) throw new Error('no icons in PATHS');
  return paths;
}

const svg = (d, size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
  `stroke="${COLOR}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function devtools(port) {
  for (let i = 0; i < 100; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = pages.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error(`Chrome did not start: ${CHROME}`);
}

const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(path.join(tmpdir(), 'product-icons-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank']);

try {
  const ws = new WebSocket(await devtools(port));
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    waiting.get(message.id)?.(message);
    waiting.delete(message.id);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (message) => (message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send('Page.enable');
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  const { frameTree } = await send('Page.getFrameTree');

  const icons = readPaths();
  for (const size of SIZES) {
    const dir = path.join(ROOT, 'icons', 'products', String(size));
    mkdirSync(dir, { recursive: true });
    await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });

    for (const { name, d } of icons) {
      await send('Page.setDocumentContent', {
        frameId: frameTree.frame.id,
        html: `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg(d, size)}`,
      });
      const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
      writeFileSync(path.join(dir, `${name}.png`), Buffer.from(data, 'base64'));
    }
  }

  ws.close();
  console.log(`wrote ${icons.length} icons × ${SIZES.join(', ')} px to icons/products/`);
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}
