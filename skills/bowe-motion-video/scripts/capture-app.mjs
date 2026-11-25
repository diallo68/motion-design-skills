#!/usr/bin/env node
// Capture the real app's screen from an Android emulator or device (adb) or an iOS simulator (xcrun simctl),
// with the status bar and the navigation bar cropped off, ready for <img class="shot"> inside a .phone.
//
//   node capture-app.mjs home                        → assets/screens/home.png (the only running device)
//   node capture-app.mjs quiz --out assets/screens   output folder (default assets/screens)
//   node capture-app.mjs home --platform ios         force a platform when both are running
//   node capture-app.mjs home --device emulator-5554 pick one Android device (adb devices) or a simulator UDID
//   node capture-app.mjs home --keep-status          keep the status bar (iOS: cleaned to 9:41, full battery)
//   node capture-app.mjs home --keep-nav             keep Android's navigation bar / iOS's home indicator
//   node capture-app.mjs --list                      list the devices it can see
//
// Navigate the app to the screen yourself (or ask the person to), then capture. Needs ffmpeg on the PATH.
// Screens show what is on the device: sign in with a demo account and never capture other people's real
// names, messages, photos or numbers.
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const has = (k) => args.includes(`--${k}`);
const name = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.match(/^--(out|platform|device)$/));
const run = (cmd, a, opts = {}) => spawnSync(cmd, a, { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 64 << 20 });
const fail = (msg) => { console.error(msg); process.exit(1); };

function androidDevices() {
  const r = run('adb', ['devices']);
  if (r.error) return [];
  return r.stdout.split('\n').slice(1).map((l) => l.trim().split(/\s+/)).filter((p) => p[1] === 'device').map((p) => p[0]);
}
function iosDevices() {
  if (process.platform !== 'darwin') return [];
  const r = run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']);
  if (r.error || r.status) return [];
  return Object.values(JSON.parse(r.stdout).devices).flat().filter((d) => d.state === 'Booted').map((d) => ({ id: d.udid, name: d.name }));
}

const android = androidDevices(); const ios = iosDevices();
if (has('list')) {
  console.log(`Android (adb): ${android.join(', ') || 'none'}\niOS simulators: ${ios.map((d) => `${d.name} ${d.id}`).join(', ') || 'none'}`);
  process.exit(0);
}
if (!name) fail('usage: capture-app.mjs <name> [--out assets/screens] [--platform android|ios] [--device id] [--keep-status] [--keep-nav] | --list');
if (run('ffmpeg', ['-version']).status !== 0) fail('ffmpeg is not on the PATH (macOS: brew install ffmpeg · Debian/Ubuntu: sudo apt install ffmpeg · Windows: winget install ffmpeg)');

let platform = get('platform');
const device = get('device');
if (!platform) {
  if (device) platform = android.includes(device) ? 'android' : 'ios';
  else if (android.length && !ios.length) platform = 'android';
  else if (ios.length && !android.length) platform = 'ios';
  else if (!android.length) fail('No running emulator, device or simulator. Start one (Android Studio, `emulator -avd …`, or Xcode Simulator) with the app open.');
  else fail(`Several devices are running: pass --platform android|ios (Android: ${android.join(', ')}; iOS: ${ios.map((d) => d.name).join(', ')}).`);
}

const outDir = resolve(get('out', 'assets/screens'));
mkdirSync(outDir, { recursive: true });
const raw = join(tmpdir(), `capture-${process.pid}.png`);
const out = join(outDir, `${name.replace(/\.png$/i, '')}.png`);

const size = (file) => {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  const [w, h] = r.stdout.trim().split(',').map(Number); return { w, h };
};

let top = 0, bottom = 0;
if (platform === 'android') {
  const id = device || android[0];
  if (!id) fail('No Android device: check `adb devices`.');
  const shot = run('adb', ['-s', id, 'exec-out', 'screencap', '-p'], { binary: true });
  if (shot.status || !shot.stdout?.length) fail(`adb could not capture ${id}: ${shot.stderr}`);
  await import('node:fs').then((fs) => fs.writeFileSync(raw, shot.stdout));
  // the system bars' exact frames: "type=ITYPE_STATUS_BAR frame=[0,0][1080,128]" (Android 11–13) or "type=statusBars …" (14+)
  const win = run('adb', ['-s', id, 'shell', 'dumpsys', 'window']).stdout || '';
  const frame = (re) => { const m = win.match(re); return m ? m.slice(1, 5).map(Number) : null; };
  const st = frame(/type=(?:ITYPE_STATUS_BAR|statusBars)\b[^\n]*?frame=\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  const nv = frame(/type=(?:ITYPE_NAVIGATION_BAR|navigationBars)\b[^\n]*?frame=\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  const { h } = size(raw);
  const dpi = +(run('adb', ['-s', id, 'shell', 'wm', 'density']).stdout.match(/(\d+)\s*$/m)?.[1] || 420);
  top = st && st[1] === 0 ? st[3] : Math.round((24 * dpi) / 160);
  bottom = nv && nv[3] === h && nv[0] === 0 ? h - nv[1] : 0;     // a bar along the bottom (not a side bar in landscape)
} else {
  const id = device || ios[0]?.id;
  if (!id) fail('No booted iOS simulator: open one in Xcode → Open Developer Tool → Simulator.');
  if (has('keep-status')) run('xcrun', ['simctl', 'status_bar', id, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3']);
  const r = run('xcrun', ['simctl', 'io', id, 'screenshot', '--type=png', raw]);
  if (r.status) fail(`simctl could not capture: ${r.stderr}`);
  const { h } = size(raw);
  top = Math.round(h * 0.07);       // status bar with the Dynamic Island (59 pt of 852 on a 6.1" iPhone)
  bottom = Math.round(h * 0.04);    // home indicator (34 pt)
}
if (has('keep-status')) top = 0;
if (has('keep-nav')) bottom = 0;

const { w, h } = size(raw);
const crop = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', `crop=${w}:${h - top - bottom}:0:${top}`, out]);
rmSync(raw, { force: true });
if (crop.status) fail(`ffmpeg could not crop: ${crop.stderr}`);
console.log(`${out}  ${w}×${h - top - bottom} (${platform}; cropped ${top} px top, ${bottom} px bottom; ${Math.round(statSync(out).size / 1024)} KB)`);
console.log('Look at it before using it: no real person\'s name, face, message or number on screen.');
