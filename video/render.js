// Renders cold-open.html frame by frame, mixes the voice clips in, and encodes a 480p MP4.
// Usage: node render.js <font.woff2> <frames-dir> <out.mp4>
//        node render.js <font.woff2> <frames-dir> --stills 1.5,8,19   (PNG stills at those seconds)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const [fontPath, framesDir, outArg, stillsArg] = process.argv.slice(2);
  fs.mkdirSync(framesDir, { recursive: true });
  const audio = id => path.join(__dirname, 'audio', `${id}.mp3`);
  const lines = JSON.parse(fs.readFileSync(path.join(__dirname, 'lines.json'), 'utf8'));
  for (const l of lines) {
    l.dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio(l.id)]).toString());
  }

  const font = fs.readFileSync(fontPath).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 854, height: 480 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'cold-open.html'));
  await page.addStyleTag({ content: `@font-face { font-family: "Patrick Hand"; src: url(data:font/woff2;base64,${font}) format("woff2"); }` });
  await page.evaluate(async () => { await document.fonts.load('27px "Patrick Hand"'); await document.fonts.ready; });
  const timeline = await page.evaluate(ls => { window.setup(ls); return window.TIMELINE; }, lines);
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
  for (let f = 0; f < total; f++) {
    await page.evaluate(n => window.renderFrame(n), f);
    await page.screenshot({ path: path.join(framesDir, `f${String(f).padStart(4, '0')}.png`) });
  }
  await browser.close();

  // Each voice clip is delayed to its start time, then all are mixed under the picture.
  const args = ['-y', '-loglevel', 'error', '-framerate', '24', '-i', path.join(framesDir, 'f%04d.png')];
  timeline.lines.forEach(l => args.push('-i', audio(l.id)));
  const delays = timeline.lines.map((l, i) => `[${i + 1}:a]adelay=${Math.round(l.a * 1000)}:all=1[a${i}]`).join(';');
  const mix = timeline.lines.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${timeline.lines.length}:normalize=0,apad[aout]`;
  args.push('-filter_complex', `${delays};${mix}`, '-map', '0:v', '-map', '[aout]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-t', (total / 24).toFixed(3), '-movflags', '+faststart', outArg);
  execFileSync('ffmpeg', args);
  console.log('wrote', outArg, total, 'frames');
})();
