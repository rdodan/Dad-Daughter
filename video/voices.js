// Voices the whole scene in one ElevenLabs dialogue call (eleven_v3), so every line is acted
// in context instead of in isolation, then cuts the result into one clip per line.
//
// Usage: node voices.js                      -> a new take, cut into audio/<id>.mp3 for every line in lines.json
//        node voices.js --recut              -> re-cut the existing take (audio/take.mp3 + take.json)
//        node voices.js --audition <out-dir> -> a short sample of each dad candidate voice
//
// The API key is supplied by the environment's network proxy; set ELEVENLABS_API_KEY to run elsewhere.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { envelope, speechSpan, FPS } = require('./envelope');

const VOICES = {
  kid: '5IB29Bdix2wYPY3mVRaK', // Bonnie
  dad: 'iP95p4xoKVk53GoZ742B', // Chris - Charming, Down-to-Earth
};
const DAD_CANDIDATES = {
  chris: 'iP95p4xoKVk53GoZ742B',
  roger: 'CwhRBWXzGAHq8TQ4Fs17',
  will: 'bIHbv24MWmeRgasZH58o',
  eric: 'cjVigY5qzO86Huf0OWal',
  brian: 'nPczCjzI2devNBz1zQrb',
};

function dialogue(inputs, outMp3) {
  const tmp = path.join(os.tmpdir(), `dialogue-${process.pid}.json`);
  const code = execFileSync('curl', ['-sS', '-m', '300', '-o', tmp, '-w', '%{http_code}',
    '-H', `xi-api-key: ${process.env.ELEVENLABS_API_KEY || 'proxy-injected'}`,
    '-H', 'Content-Type: application/json',
    'https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128',
    '-d', JSON.stringify({ model_id: 'eleven_v3', inputs })]).toString();
  const body = fs.readFileSync(tmp, 'utf8');
  fs.unlinkSync(tmp);
  if (code !== '200') throw new Error(`dialogue request failed (${code}): ${body.slice(0, 300)}`);
  const res = JSON.parse(body);
  fs.writeFileSync(outMp3, Buffer.from(res.audio_base64, 'base64'));
  return res.voice_segments;
}

// Cut [a, b] out of the full take, then trim it to the speech: the pause before a character
// answers (and any breath in it) is removed, keeping 2 frames before the first open-mouth frame
// and 4 after the last. The animation adds its own pauses between lines and pops each speech
// bubble at the start of the clip, so the bubble and the voice arrive together.
function cut(src, a, b, out) {
  const raw = out.replace(/\.mp3$/, '.raw.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', src, raw]);
  const [first, last] = speechSpan(envelope(raw));
  const s = Math.max(0, (first - 2) / FPS), e = Math.min(b - a, (last + 5) / FPS);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', s.toFixed(3), '-t', (e - s).toFixed(3), '-i', raw,
    '-af', `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, e - s - 0.05).toFixed(3)}:d=0.05`,
    '-c:a', 'libmp3lame', '-b:a', '128k', out]);
  fs.unlinkSync(raw);
}

const lines = JSON.parse(fs.readFileSync(path.join(__dirname, 'lines.json'), 'utf8'));

if (process.argv[2] === '--audition') {
  const outDir = process.argv[3];
  fs.mkdirSync(outDir, { recursive: true });
  const pick = ['k3', 'd2', 'k6', 'd3', 'k7'].map(id => lines.find(l => l.id === id));
  for (const [name, id] of Object.entries(DAD_CANDIDATES)) {
    dialogue(pick.map(l => ({ text: l.say, voice_id: l.who === 'dad' ? id : VOICES.kid })), path.join(outDir, `dad-${name}.mp3`));
    console.log('audition', name, 'ok');
  }
  process.exit(0);
}

const dir = path.join(__dirname, 'audio');
fs.mkdirSync(dir, { recursive: true });
const take = path.join(dir, 'take.mp3'), segFile = path.join(dir, 'take.json');
// `node voices.js --recut` re-cuts the existing take instead of asking for a new performance.
const segs = process.argv[2] === '--recut'
  ? JSON.parse(fs.readFileSync(segFile, 'utf8'))
  : dialogue(lines.map(l => ({ text: l.say, voice_id: VOICES[l.who] })), take);
fs.writeFileSync(segFile, JSON.stringify(segs, null, 1));
const total = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', take]).toString());

lines.forEach((l, i) => {
  const s = segs.filter(x => x.dialogue_input_index === i);
  if (!s.length) throw new Error(`no audio segment came back for line ${l.id}`);
  const a = Math.min(...s.map(x => x.start_time_seconds));
  const b = Math.min(total, Math.max(...s.map(x => x.end_time_seconds)));
  cut(take, a, b, path.join(dir, `${l.id}.mp3`));
  console.log(l.id, a.toFixed(2), '->', b.toFixed(2));
});
