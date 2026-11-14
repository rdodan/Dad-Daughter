// Renders video/wifi-intro.html frame by frame and encodes a 480p MP4.
// Usage: node render.js <font.woff2> <frames-dir> <out.mp4>
//        node render.js <font.woff2> <frames-dir> --stills 1.5,8,19   (PNG stills at those seconds)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const [fontPath, framesDir, outArg, stillsArg] = process.argv.slice(2);
  fs.mkdirSync(framesDir, { recursive: true });
  const font = fs.readFileSync(fontPath).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 854, height: 480 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'wifi-intro.html'));
  await page.addStyleTag({ content: `@font-face { font-family: "Patrick Hand"; src: url(data:font/woff2;base64,${font}) format("woff2"); }` });
  await page.evaluate(async () => { await document.fonts.load('27px "Patrick Hand"'); await document.fonts.ready; });

  if (outArg === '--stills') {
    for (const s of stillsArg.split(',')) {
      await page.evaluate(f => window.renderFrame(f), Math.round(parseFloat(s) * 24));
      await page.screenshot({ path: path.join(framesDir, `still-${s}.png`) });
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
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', path.join(framesDir, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-movflags', '+faststart', outArg]);
  console.log('wrote', outArg, total, 'frames');
})();
