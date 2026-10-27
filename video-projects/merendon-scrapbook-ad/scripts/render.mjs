// Full pipeline: Remotion render (H.264, CRF 18, veryfast) -> master audio to
// -14 LUFS (two-pass loudnorm, video stream copied) -> 3s hook GIF.
//   node scripts/render.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {measureLufs} from './loudness.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHELL = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(SHELL) ? SHELL : null;
const RAW = path.join(ROOT, 'renders/raw.mp4');
const FINAL = path.join(ROOT, 'merendon-ad.mp4');
const GIF = path.join(ROOT, 'merendon-hook-preview.gif');
fs.mkdirSync(path.join(ROOT, 'renders'), {recursive: true});

if (!process.argv.includes('--skip-video')) {
  const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts')});
  const composition = await selectComposition({serveUrl, id: 'MerendonAd', browserExecutable});
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    crf: 18,
    x264Preset: 'veryfast',
    pixelFormat: 'yuv420p',
    imageFormat: 'jpeg',
    jpegQuality: 92,
    audioCodec: 'aac',
    audioBitrate: '320k',
    outputLocation: RAW,
    browserExecutable,
    concurrency: Math.max(1, os.cpus().length),
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 20);
      if (p !== last) console.log(`render ${Math.round(progress * 100)}%`), (last = p);
    },
  });
}

// Master: two-pass EBU R128 loudnorm to -14 LUFS / -1 dBTP, linear gain.
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-i', RAW, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const m = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
const ln = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', RAW, '-af', `${ln},aresample=48000`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', FINAL]);
console.log('final loudness', measureLufs(FINAL));

// 3-second hook GIF at 15fps (the animation is on twos anyway)
execFileSync('ffmpeg', ['-y', '-v', 'error', '-t', '3', '-i', FINAL, '-vf', 'fps=15,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', GIF]);
console.log('wrote', FINAL, 'and', GIF);
