// Quick look-dev: render chosen frames to renders/stills/ without a full render.
//   node scripts/stills.mjs 0 60 240 ...
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHELL = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(SHELL) ? SHELL : null;
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'MerendonAd', browserExecutable});
fs.mkdirSync(path.join(ROOT, 'renders/stills'), {recursive: true});
for (const frame of frames) {
  const output = path.join(ROOT, `renders/stills/f${String(frame).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame, output, browserExecutable, scale: 0.5});
  console.log(output);
}
