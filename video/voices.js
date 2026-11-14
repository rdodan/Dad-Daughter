// Generates one MP3 per line in lines.json with ElevenLabs (eleven_v3, which understands [tags]).
// Usage: node voices.js [id ...]   (no ids = every line that has no audio yet)
// The API key is supplied by the environment's network proxy; set ELEVENLABS_API_KEY to run elsewhere.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VOICES = { kid: '5IB29Bdix2wYPY3mVRaK' /* Bonnie */, dad: '8Gy3iEFLvSNCApni00Yl' /* Robert */ };
const lines = JSON.parse(fs.readFileSync(path.join(__dirname, 'lines.json'), 'utf8'));
const only = process.argv.slice(2);
const dir = path.join(__dirname, 'audio');
fs.mkdirSync(dir, { recursive: true });

for (const l of lines) {
  const out = path.join(dir, `${l.id}.mp3`);
  if (only.length ? !only.includes(l.id) : fs.existsSync(out)) continue;
  const code = execFileSync('curl', ['-sS', '-m', '120', '-o', out, '-w', '%{http_code}',
    '-H', `xi-api-key: ${process.env.ELEVENLABS_API_KEY || 'proxy-injected'}`,
    '-H', 'Content-Type: application/json',
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICES[l.who]}?output_format=mp3_44100_128`,
    '-d', JSON.stringify({ text: l.say, model_id: 'eleven_v3' })]).toString();
  if (code !== '200') { console.error(l.id, 'failed', code, fs.readFileSync(out, 'utf8').slice(0, 300)); fs.unlinkSync(out); process.exit(1); }
  console.log(l.id, 'ok');
}
