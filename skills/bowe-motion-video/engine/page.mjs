// Shared by render.mjs and check.mjs: serve a video's folder over HTTP and open it at a format's size.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, dirname, resolve, basename } from 'node:path';

export const SIZES = { story: [1080, 1920], feed: [1080, 1350], square: [1080, 1080], landscape: [1920, 1080] };
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json', '.mp4': 'video/mp4' };

// --name value, --name=value, or --flag (true); d when absent
export function options(argv) {
  return (k, d) => {
    const i = argv.findIndex((a) => a === `--${k}` || a.startsWith(`--${k}=`));
    if (i < 0) return d;
    const a = argv[i];
    return a.includes('=') ? a.split('=')[1] : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true);
  };
}

// A page that draws WebGL (a 3D stage, three.js, a canvas asking for webgl): only then is Chrome's software GL needed.
export function usesWebGL(file) {
  try { return /scene3d|from\s*['"]three|three(\.module)?(\.min)?\.js|getContext\(\s*['"](experimental-)?webgl/i.test(readFileSync(file, 'utf8')); } catch { return true; }
}

// webgl: true launches Chrome with its software renderer (SwiftShader), so 3D works the same on every machine without
// a GPU. A 2D page goes without it: SwiftShader makes every screenshot about 5 times slower.
export async function loadPlaywright({ webgl = true } = {}) {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch {
    console.error('Playwright is missing: run `npm i playwright && npx playwright install chromium` in this folder.');
    process.exit(1);
  }
  const gl = webgl ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [];
  return { launch: (o = {}) => chromium.launch({ ...o, args: [...gl, ...(o.args || [])] }) };
}

// Starts a server for the video's folder (fonts and modules do not load reliably from file://).
export async function serve(file) {
  const abs = resolve(file); const root = dirname(abs);
  const server = createServer(async (req, res) => {
    try {
      const p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(root)) throw new Error('outside');
      const body = await readFile(p);
      res.writeHead(200, { 'Content-Type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { root, name: basename(abs, '.html'), url: `http://127.0.0.1:${server.address().port}/${encodeURIComponent(basename(abs))}`, close: () => server.close() };
}

// Opens the page at a format's size, waits for fonts and images; errors lists load and script failures.
// scale 2 renders every pixel twice as fine (render.mjs --scale 2 then scales it back down: supersampling).
export async function openFormat(browser, url, format, scale = 1) {
  const [w, h] = SIZES[format];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(`failed to load ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`failed to load ${r.url()} (${r.status()})`); });
  await page.goto(`${url}?format=${format}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  // a 3D stage (scene3d.js) builds asynchronously: wait for it and its textures
  await page.waitForFunction(() => !document.querySelector('script[type=module]') || window.__mvReady, null, { timeout: 60000 }).catch(() => errors.push('the 3D stage never finished building (missing s.done()?)'));
  await page.evaluate(() => window.__mvReady);
  return { page, errors };
}

// The formats to work on: --format, else the page's <body data-formats>, else story.
export async function pickFormats(browser, url, asked) {
  let formats = asked;
  if (!formats || formats === true) {
    const { page } = await openFormat(browser, url, 'story');
    formats = (await page.evaluate(() => document.body.dataset.formats)) || 'story';
    await page.close();
  }
  return String(formats).split(',').map((f) => f.trim()).filter((f) => SIZES[f]);
}
