// Linear (non-compressing) loudness helpers built on ffmpeg's ebur128 meter.
import {execFileSync, spawnSync} from 'node:child_process';

export function measureLufs(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {encoding: 'utf8'});
  const summary = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  return {
    I: parseFloat(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]),
    peak: parseFloat((summary.match(/Peak:\s+(-?[\d.]+) dBFS/) || [0, '0'])[1]),
  };
}

// Gain `input` so its integrated loudness hits `target` LUFS (pure gain, no compression).
export function normalizeTo(input, output, target, extra = []) {
  const {I} = measureLufs(input);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', input, '-af', `volume=${(target - I).toFixed(2)}dB`, ...extra, output]);
  return target - I;
}
