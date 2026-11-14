// Loudness of an audio file, one value per video frame (24 fps), scaled 0..1 so the line's
// loud syllables reach 1. Used to open the characters' mouths and to trim clips to the speech.
const { execFileSync } = require('child_process');

const FPS = 24, OPEN = 0.12;

function envelope(file) {
  const rate = 8000, per = rate / FPS;
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(rate), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  const n = Math.floor(pcm.length / 2), rms = [];
  for (let s = 0; s < n; s += per) {
    let sum = 0, c = 0;
    for (let i = Math.floor(s); i < Math.min(n, s + per); i++) { const v = pcm.readInt16LE(i * 2) / 32768; sum += v * v; c++; }
    rms.push(Math.sqrt(sum / Math.max(1, c)));
  }
  const loud = [...rms].sort((x, y) => x - y)[Math.floor(rms.length * 0.9)] || 1;
  const floor = loud * OPEN;
  return rms.map(v => +Math.min(1, Math.max(0, (v - floor) / (loud - floor))).toFixed(2));
}

// First and last frame where the mouth would be open.
function speechSpan(env) {
  const first = env.findIndex(v => v > OPEN);
  let last = env.length - 1;
  while (last > 0 && !(env[last] > OPEN)) last--;
  return first < 0 ? [0, env.length - 1] : [first, last];
}

module.exports = { envelope, speechSpan, FPS };
