// Makes a vertical YouTube Short (1080x1920) from part of an episode scene.
// The scene is drawn exactly as in the episode, full width in the middle of the frame, with the
// hook question written large above it and big word-by-word captions below (in his blue and her
// orange; the speech bubbles are switched off). Picture and voice are sped up together.
//
// Usage:
//   node short.js <font.woff2> <out.mp4> --scene cartoon-and-stuck.html --lines lines-cartoon-and-stuck.json \
//     --track audio/cartoon-and-stuck.flac --from k18 --to k20 --hook "Why does Wi-Fi|get STUCK|in your room?" \
//     [--speed 1.17] [--stills 1,5,9]
//   --from/--to   first and last line of the Short (ids from the lines file)
//   --hook        the question shown on top; "|" breaks the line
//   --speed       on top of the recording's own speed (the owner records at 1.11x; 1.17 more is ~1.3x)
const { chromium } = require('playwright');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loudness, scale, FPS } = require('./envelope');

const W = 854, H = 1518, TOP = -460;          // page units of the vertical frame
// The scene's own 854x480 picture, trimmed of empty margin at the sides and zoomed to fill the width:
const CROP = { x: 115, w: 640 }, ZOOM = W / CROP.w, SCENE_Y = -40;   // shown at y -40..600
const OUT_W = 1080, OUT_H = 1920;

(async () => {
  const argv = process.argv.slice(2);
  const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : dflt; };
  const sceneFile = path.resolve(__dirname, opt('--scene', 'cold-open.html'));
  const linesFile = path.resolve(__dirname, opt('--lines', 'lines.json'));
  const trackFile = path.resolve(opt('--track', 'audio/cold-open.flac'));
  const from = opt('--from'), to = opt('--to');
  const hook = opt('--hook', '').split('|');
  const speed = parseFloat(opt('--speed', '1.17'));
  const stills = opt('--stills', null);
  const [fontPath, outFile] = argv;

  const info = JSON.parse(fs.readFileSync(trackFile.replace(/\.[a-z0-9]+$/i, '.json'), 'utf8'));
  const lines = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
  const rms = loudness(trackFile);
  for (const l of lines) {
    const t = info.lines.find(x => x.id === l.id);
    Object.assign(l, { a: t.a, b: t.b, tok: t.tok, lineTok: t.lineTok });
    l.env = scale(rms.slice(Math.floor(t.a * FPS), Math.ceil(t.b * FPS)));
  }
  const L = id => info.lines.find(x => x.id === id);
  const a = Math.max(0, L(from).a - 0.15), b = Math.min(info.duration, L(to).b + 0.35);
  const frames = Math.round((b - a) / speed * FPS);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: OUT_H / H });
  const platesDir = path.join(__dirname, 'plates', `short-${OUT_H}`);
  const plates = {};
  ['crease', 'light', 'grain-0', 'grain-1', 'grain-2'].forEach(n => { plates[n] = 'data:image/png;base64,' + fs.readFileSync(path.join(platesDir, `${n}.png`)).toString('base64'); });
  await page.addInitScript(([p, size]) => { window.PAPER_PLATES = p; window.PAPER_SIZE = size; window.NO_BUBBLES = true; }, [plates, [W, H]]);
  await page.goto('file://' + sceneFile);
  await page.evaluate(async () => { await Promise.all(Object.values(window.PAPER_PLATES).map(s => { const i = new Image(); i.src = s; return i.decode(); })); });
  const font = fs.readFileSync(fontPath).toString('base64');
  await page.addStyleTag({ content: `@font-face { font-family: "Patrick Hand"; src: url(data:font/woff2;base64,${font}) format("woff2"); }
    #stage { width: ${W}px !important; height: ${H}px !important; }` });
  await page.evaluate(async () => { await document.fonts.load('27px "Patrick Hand"'); await document.fonts.ready; });
  await page.evaluate(([ls, o]) => window.setup(ls, o), [lines, { track: true, duration: info.duration, events: info.events || [] }]);

  // The vertical frame: hook on top, the scene in its own window, captions underneath.
  await page.evaluate(([cfg]) => {
    const stage = document.getElementById('stage');
    stage.setAttribute('viewBox', `0 ${cfg.TOP} ${cfg.W} ${cfg.H}`);
    const colour = { dad: '#2457d6', kid: '#d96d0c' };

    function hookText(tOut) {
      const size = 84, lh = 94, y0 = cfg.TOP + 140;
      const p = Math.min(1, tOut / 0.6);                          // writes itself in over the first 0.6 s
      const all = cfg.hook.join(' ').length;
      let shown = Math.round(all * p);
      return cfg.hook.map((s, i) => {
        const part = s.slice(0, Math.max(0, shown)); shown -= s.length + 1;
        return `<text class="txt" x="427" y="${y0 + i * lh}" font-size="${size}" text-anchor="middle">${part}</text>`;
      }).join('') + (p >= 1 ? `<path class="wave" style="stroke-width:6px" d="M170 ${y0 + (cfg.hook.length - 1) * lh + 26} Q300 ${y0 + (cfg.hook.length - 1) * lh + 16} 427 ${y0 + (cfg.hook.length - 1) * lh + 23} T684 ${y0 + (cfg.hook.length - 1) * lh + 20}"/>` : '');
    }

    // The displayed line being spoken right now, with the current word in the speaker's colour.
    function caption(t) {
      const l = LINES.find(x => t >= x.a && t < x.b + 0.25);
      if (!l || !l.tok) return '';
      let k = -1;
      l.tok.forEach((x, i) => { if (x.a != null && x.a <= t) k = i; });
      let start = 0, row = 0;
      for (; row < l.show.length; row++) { if (k < start + l.lineTok[row]) break; start += l.lineTok[row]; }
      row = Math.min(Math.max(row, 0), l.show.length - 1);
      if (k < 0) { row = 0; start = 0; }
      const words = l.show[row].split(' ');
      const cur = k - start;
      let size = 86;
      while (size > 48 && textWidth(l.show[row], size) > 800) size -= 4;
      const spans = words.map((w, i) => `<tspan style="fill:${i === cur ? colour[l.who] : '#050505'}">${w}</tspan>`).join(' ');
      return `<text class="txt" x="427" y="${cfg.SCENE_Y + 480 * cfg.ZOOM + 130}" font-size="${size}" text-anchor="middle">${spans}</text>`;
    }

    window.renderShort = function (f) {
      const t = cfg.a + f * cfg.speed / FPS;
      stage.style.filter = `url(#onpaper${Math.floor(f / 3) % 3})`;
      stage.innerHTML = `<rect x="0" y="${cfg.TOP}" width="${cfg.W}" height="${cfg.H}" fill="#ffffff"/>
        <defs><clipPath id="win"><rect x="${cfg.CROP.x}" y="0" width="${cfg.CROP.w}" height="480"/></clipPath></defs>
        <g transform="translate(0 ${cfg.SCENE_Y}) scale(${cfg.ZOOM}) translate(${-cfg.CROP.x} 0)"><g clip-path="url(#win)">${scene(t)}</g></g>
        ${hookText(f / FPS)}${caption(t)}`;
    };
  }, [{ W, H, TOP, a, speed, hook, CROP, ZOOM, SCENE_Y }]);

  if (stills) {
    for (const s of stills.split(',')) {
      await page.evaluate(f => window.renderShort(f), Math.round(parseFloat(s) * FPS));
      await page.screenshot({ path: outFile.replace(/\.mp4$/, '') + `-still-${s}.png` });
    }
    await browser.close();
    return;
  }

  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', trackFile,
    '-filter_complex', `[0:v]scale=${OUT_W}:${OUT_H}:flags=lanczos,setsar=1[v];[1:a]atempo=${speed},apad[aud]`,
    '-map', '[v]', '-map', '[aud]', '-t', (frames / FPS).toFixed(3),
    '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-crf', '20', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', outFile];
  const enc = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => enc.on('close', c => (c === 0 ? ok() : fail(new Error('ffmpeg exited with ' + c)))));
  for (let f = 0; f < frames; f++) {
    await page.evaluate(n => window.renderShort(n), f);
    const shot = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!enc.stdin.write(shot)) await new Promise(r => enc.stdin.once('drain', r));
  }
  enc.stdin.end();
  await done;
  await browser.close();
  console.log('wrote', outFile, frames, 'frames,', (frames / FPS).toFixed(1), 's');
})();
