// Imports a recording of the whole scene made outside this pipeline (one continuous file, any
// common format) and works out where each line of lines.json sits in it, so the animation can
// follow that recording's own timing.
//
// Usage: node import-audio.js <recording> [--lines lines.json] [--out cold-open]
//   -> audio/<out>.flac  the recording, as used for the video
//   -> audio/<out>.json  start and end of every line, in seconds
// Then render with:  node render.js <font> <frames-dir> <out.mp4> --track audio/<out>.flac
//                    (plus --scene and --lines for any scene other than the cold open)
//
// How it finds the lines: ElevenLabs speech-to-text gives every spoken word with its time; those
// words are aligned with the script's words (tolerating small differences and ad-libs), and each
// line runs from its first matched word to its last. A sound effect such as a gasp just before a
// line is counted as part of that line.
// The API key is supplied by the environment's network proxy; set ELEVENLABS_API_KEY to run elsewhere.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : dflt; };
const linesFile = path.resolve(__dirname, opt('--lines', 'lines.json'));
const outName = opt('--out', 'cold-open');
const src = argv[0];
if (!src || !fs.existsSync(src)) { console.error('usage: node import-audio.js <recording> [--lines lines.json] [--out cold-open]'); process.exit(1); }
const dir = path.join(__dirname, 'audio');
fs.mkdirSync(dir, { recursive: true });
const track = path.join(dir, `${outName}.flac`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vn', '-ac', '1', '-ar', '44100', track]);
const duration = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', track]).toString());

// 1. Transcribe with word times.
const stt = JSON.parse(execFileSync('curl', ['-sS', '-m', '300',
  '-H', `xi-api-key: ${process.env.ELEVENLABS_API_KEY || 'proxy-injected'}`,
  '-F', 'model_id=scribe_v1', '-F', 'timestamps_granularity=word', '-F', 'tag_audio_events=true',
  '-F', `file=@${track}`, 'https://api.elevenlabs.io/v1/speech-to-text'], { maxBuffer: 1 << 26 }).toString());
if (!stt.words) { console.error('speech-to-text failed:', JSON.stringify(stt).slice(0, 300)); process.exit(1); }
const words = stt.words.filter(w => w.type === 'word');
const events = stt.words.filter(w => w.type === 'audio_event');

// 2. Align the transcript's words with the script's words.
const norm = s => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean);
const lines = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
const script = [];                                  // { tok, line }
lines.forEach((l, li) => norm(l.show.join(' ').replace(/-/g, '')).forEach(tok => script.push({ tok, line: li })));
const heard = words.map(w => norm(w.text.replace(/-/g, '')).join(''));

const same = (a, b) => {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  let d = 0;                                        // allow one letter of difference in longer words
  for (let i = 0, j = 0; i < a.length || j < b.length; i++, j++) {
    if (a[i] !== b[j]) { d++; if (a.length > b.length) j--; else if (b.length > a.length) i--; }
    if (d > 1) return false;
  }
  return true;
};
const n = script.length, m = heard.length;
const cost = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
  cost[i][j] = Math.min(cost[i - 1][j - 1] + (same(script[i - 1].tok, heard[j - 1]) ? 0 : 1), cost[i - 1][j] + 1, cost[i][j - 1] + 1);
}
const at = new Array(n).fill(-1);                   // transcript word index for each script word
for (let i = n, j = m; i > 0 && j > 0;) {
  if (cost[i][j] === cost[i - 1][j - 1] + (same(script[i - 1].tok, heard[j - 1]) ? 0 : 1)) { at[i - 1] = j - 1; i--; j--; }
  else if (cost[i][j] === cost[i - 1][j] + 1) i--;
  else j--;
}

// 3. Each line runs from its first matched word to its last.
const out = lines.map((l, li) => {
  const idx = script.map((s, k) => (s.line === li ? at[k] : -1)).filter(k => k >= 0);
  if (!idx.length) throw new Error(`could not find line ${l.id} ("${l.show.join(' ')}") in the recording`);
  // Every script word of the line with its time in the recording (null if it was not heard),
  // and how many of those words each displayed line holds. Scenes use these to time bubble pages
  // and to make things happen on a particular word.
  const tok = script.map((s, k) => ({ s, k })).filter(x => x.s.line === li)
    .map(({ s, k }) => ({ w: s.tok, a: at[k] >= 0 ? words[at[k]].start : null, b: at[k] >= 0 ? words[at[k]].end : null }));
  const lineTok = l.show.map(sl => norm(sl.replace(/-/g, '')).length);
  return { id: l.id, a: words[Math.min(...idx)].start, b: words[Math.max(...idx)].end, tok, lineTok };
});
out.forEach((o, k) => {
  const prevEnd = k ? out[k - 1].b : 0;
  const ev = events.filter(e => e.start >= prevEnd && e.end <= o.a + 0.05);
  if (ev.length) o.a = Math.min(o.a, ev[0].start);  // e.g. a gasp before "It FLIES?!"
  o.a = Math.max(prevEnd, o.a - 0.08);
  o.b = Math.min(duration, o.b + 0.12);
});
out.forEach((o, k) => { if (k < out.length - 1) o.b = Math.min(o.b, out[k + 1].a); });

fs.writeFileSync(path.join(dir, `${outName}.json`), JSON.stringify({ duration, lines: out, events: events.map(e => ({ text: e.text, a: e.start, b: e.end })) }, null, 1));
console.log('heard:', stt.text);
out.forEach(o => console.log(o.id.padEnd(3), o.a.toFixed(2), '->', o.b.toFixed(2), '|', lines.find(l => l.id === o.id).show.join(' ')));
const missed = script.filter((s, k) => at[k] < 0 || !same(s.tok, heard[at[k]]));
if (missed.length) console.log('words not heard as written:', missed.map(s => s.tok).join(', '));
