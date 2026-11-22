#!/usr/bin/env node
// Start a video project: copies the engine, a style preset and a template into a folder.
//   node <skill>/scripts/init.mjs <folder> --template app-promo|website-launch|social-ad --style midnight-glow|pastel-pop|bold-type|clean-light|neon-lime|warm-editorial
// Then in <folder>: npm install && npx playwright install chromium (once), edit video.html, node engine/render.mjs video.html
import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const dir = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const template = get('template', 'app-promo'); const style = get('style', 'midnight-glow'); const name = get('name', 'video');
const templates = readdirSync(join(skill, 'templates')).map((f) => f.replace('.html', ''));
const styles = readdirSync(join(skill, 'styles')).map((f) => f.replace('.css', ''));
if (!dir || !templates.includes(template) || !styles.includes(style)) {
  console.error(`usage: init.mjs <folder> --template ${templates.join('|')} --style ${styles.join('|')} [--name video]`); process.exit(1);
}
const out = resolve(dir); mkdirSync(join(out, 'assets'), { recursive: true });
cpSync(join(skill, 'engine'), join(out, 'engine'), { recursive: true });
if (!existsSync(join(out, 'style.css'))) cpSync(join(skill, 'styles', `${style}.css`), join(out, 'style.css'));
const target = join(out, `${name}.html`);
if (existsSync(target)) { console.error(`${target} exists; pick another --name`); process.exit(1); }
cpSync(join(skill, 'templates', `${template}.html`), target);
if (!existsSync(join(out, 'package.json'))) writeFileSync(join(out, 'package.json'), JSON.stringify({ name: 'motion-video-project', private: true, type: 'module', scripts: { check: `node engine/check.mjs ${name}.html`, render: `node engine/render.mjs ${name}.html`, sheet: `node engine/render.mjs ${name}.html --sheet` }, devDependencies: { playwright: '^1.49.0', three: '0.170.0' } }, null, 2));
if (!existsSync(join(out, '.gitignore'))) writeFileSync(join(out, '.gitignore'), 'node_modules/\nrenders/\n.voice/\nengine/.sfx/\n');
console.log(`created ${target}\n  style: ${style}\n  next: cd ${dir} && npm install && npx playwright install chromium\n        node engine/check.mjs ${name}.html            (fix what it reports)\n        node engine/render.mjs ${name}.html --sheet   (look at the frames)\n        node engine/render.mjs ${name}.html           (MP4s in renders/)`);
