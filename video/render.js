// Renders cold-open.html frame by frame, adds the voices, and encodes a 480p MP4.
// Usage: node render.js <font.woff2> <frames-dir> <out.mp4> [options]
//        node render.js <font.woff2> <frames-dir> --stills 1.5,8,19 [options]
// Options: --scene cold-open.html  --lines lines.json  --track audio/cold-open.flac
//          --height 1080   output height (480 by default; 1080 gives 1920x1080 for YouTube).
//          At any height the picture is the same drawing, rendered sharper; frames stream
//          straight into the encoder, so nothing large is written to disk.
//
// Without --track it uses the per-line clips in audio/<id>.mp3 and spaces them itself.
// With --track it uses one recording made elsewhere (see import-audio.js) and keeps its timing.
const { chromium } = require('playwright');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { envelope, loudness, scale, FPS } = require('./envelope');

(async () => {
  const argv = process.argv.slice(2);
  const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : dflt; };
  const trackArg = opt('--track', null);
  const trackFile = trackArg ? path.resolve(trackArg) : null;
  const sceneFile = path.resolve(__dirname, opt('--scene', 'cold-open.html'));
  const linesFile = path.resolve(__dirname, opt('--lines', 'lines.json'));
  const height = parseInt(opt('--height', '480'), 10);
  const width = Math.round(height * 16 / 9 / 2) * 2;   // 1920 for 1080
  // --paper plates (default when plates/<height> exists): read the paper from images made once
  // by make-plates.js. --paper live: compute it every frame (slow; the original method).
  const platesDir = path.join(__dirname, 'plates', String(height));
  const paper = opt('--paper', fs.existsSync(platesDir) ? 'plates' : 'live');
  // --frames a-b: render only those frames, picture only (for parallel chunks; see render-episode.js)
  const range = opt('--frames', null);
  const muted = range != null;
  const [fontPath, framesDir, outArg, stillsArg] = argv;
  fs.mkdirSync(framesDir, { recursive: true });
  const audio = id => path.join(__dirname, 'audio', `${id}.mp3`);
  const lines = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
  let opts = {};
  if (trackFile) {
    const info = JSON.parse(fs.readFileSync(trackFile.replace(/\.[a-z0-9]+$/i, '.json'), 'utf8'));
    const rms = loudness(trackFile);
    for (const l of lines) {
      const t = info.lines.find(x => x.id === l.id);
      l.a = t.a; l.b = t.b; l.tok = t.tok; l.lineTok = t.lineTok;
      l.env = scale(rms.slice(Math.floor(t.a * FPS), Math.ceil(t.b * FPS)));
    }
    opts = { track: true, duration: info.duration, events: info.events || [] };
  } else {
    for (const l of lines) {
      l.dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio(l.id)]).toString());
      l.env = envelope(audio(l.id));
    }
  }

  const font = fs.readFileSync(fontPath).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 854, height: 480 }, deviceScaleFactor: height / 480 });
  const plateNames = ['crease', 'light', 'grain-0', 'grain-1', 'grain-2'];
  if (paper === 'plates') {
    const plates = {};
    plateNames.forEach(n => { plates[n] = 'data:image/png;base64,' + fs.readFileSync(path.join(platesDir, `${n}.png`)).toString('base64'); });
    await page.addInitScript(p => { window.PAPER_PLATES = p; }, plates);
  }
  await page.goto('file://' + sceneFile);
  if (paper === 'plates') {
    // make sure every plate is decoded before the first frame is captured
    await page.evaluate(async () => {
      await Promise.all(Object.values(window.PAPER_PLATES).map(src => { const i = new Image(); i.src = src; return i.decode(); }));
    });
  }
  await page.addStyleTag({ content: `@font-face { font-family: "Patrick Hand"; src: url(data:font/woff2;base64,${font}) format("woff2"); }` });
  await page.evaluate(async () => { await document.fonts.load('27px "Patrick Hand"'); await document.fonts.ready; });
  const timeline = await page.evaluate(([ls, o]) => { window.setup(ls, o); return window.TIMELINE; }, [lines, opts]);
  console.log(JSON.stringify(timeline));

  if (outArg === '--stills') {
    for (const s of stillsArg.split(',')) {
      await page.evaluate(f => window.renderFrame(f), Math.round(parseFloat(s) * 24));
      await page.screenshot({ path: path.join(framesDir, `still-${s.padStart(5, '0')}.png`) });
    }
    await browser.close();
    return;
  }

  const total = await page.evaluate(() => window.TOTAL_FRAMES);
  const [first, last] = range ? range.split('-').map(Number) : [0, total - 1];
  const end = Math.min(last, total - 1);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '24', '-i', '-'];
  const toSize = `[0:v]scale=${width}:${height}:flags=lanczos,setsar=1[vout]`;
  if (muted) {
    args.push('-filter_complex', toSize);
  } else if (trackFile) {
    // The recording plays from the first frame, exactly as it was made.
    args.push('-i', trackFile, '-filter_complex', `${toSize};[1:a]apad[aout]`);
  } else {
    // Each voice clip is delayed to its start time, then all are mixed under the picture.
    timeline.lines.forEach(l => args.push('-i', audio(l.id)));
    const delays = timeline.lines.map((l, i) => `[${i + 1}:a]adelay=${Math.round(l.a * 1000)}:all=1[a${i}]`).join(';');
    const mix = timeline.lines.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${timeline.lines.length}:normalize=0,apad[aout]`;
    args.push('-filter_complex', `${toSize};${delays};${mix}`);
  }
  args.push('-map', '[vout]');
  if (!muted) args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-t', (total / 24).toFixed(3));
  args.push('-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-crf', height > 480 ? '20' : '21',
    '-r', '24', '-movflags', '+faststart', outArg);
  const enc = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => enc.on('close', c => (c === 0 ? ok() : fail(new Error('ffmpeg exited with ' + c)))));
  for (let f = first; f <= end; f++) {
    await page.evaluate(n => window.renderFrame(n), f);
    // JPEG at high quality is several times quicker to capture than PNG, and looks the same
    const shot = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!enc.stdin.write(shot)) await new Promise(r => enc.stdin.once('drain', r));
    if ((f - first) % 240 === 0) console.error(`${path.basename(outArg)}: frame ${f} of ${first}-${end}`);
  }
  enc.stdin.end();
  await done;
  await browser.close();
  console.log('wrote', outArg, end - first + 1, 'frames');
})();
