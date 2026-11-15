// Renders the paper once, as images ("plates"), so video frames don't recompute it.
// The wrinkled-paper filter needs four things that never change from frame to frame:
//   crease.png   the crease pattern (bends the lines; also the source of the lighting)
//   light.png    the light and shadow of the creases
//   grain-0/1/2  the fine ink grain (the video cycles through three, every 3 frames)
// Each is made with exactly the same filter primitives as the live filter, at the video's
// pixel size, so frames drawn with the plates look the same as frames computed live.
//
// Usage: node make-plates.js [height=1080]              -> plates/<height>/*.png  (16:9 video)
//        node make-plates.js 1920 short               -> plates/short-1920/*.png (9:16 Shorts)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const height = parseInt(process.argv[2] || '1080', 10);
const vertical = process.argv[3] === 'short';
const [cssW, cssH] = vertical ? [854, 1518] : [854, 480];        // the stage's size in page units
const out = path.join(__dirname, 'plates', (vertical ? 'short-' : '') + String(height));
fs.mkdirSync(out, { recursive: true });

const crease = '<feTurbulence type="turbulence" baseFrequency="0.006 0.008" numOctaves="5" seed="17" result="crease"/>';
const plates = {
  crease: { filter: crease, transparent: true },
  light: { filter: crease + `<feDiffuseLighting in="crease" surfaceScale="5" diffuseConstant="1" lighting-color="white" result="lightRaw"><feDistantLight azimuth="40" elevation="30"/></feDiffuseLighting>
    <feComponentTransfer in="lightRaw"><feFuncR type="linear" slope="0.8" intercept="0.12"/><feFuncG type="linear" slope="0.8" intercept="0.12"/><feFuncB type="linear" slope="0.8" intercept="0.12"/></feComponentTransfer>` },
};
[0, 1, 2].forEach(n => { plates[`grain-${n}`] = { filter: `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${24 + n}"/>`, transparent: true }; });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: cssW, height: cssH }, deviceScaleFactor: height / cssH });
  for (const [name, p] of Object.entries(plates)) {
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}
      #stage{display:block;width:${cssW}px;height:${cssH}px;filter:url(#f)}</style></head><body>
      <svg width="0" height="0" style="position:absolute"><defs><filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">${p.filter}</filter></defs></svg>
      <svg id="stage" viewBox="0 0 ${cssW} ${cssH}"><rect width="${cssW}" height="${cssH}" fill="#ffffff"/></svg></body></html>`);
    await page.screenshot({ path: path.join(out, `${name}.png`), omitBackground: !!p.transparent });
    console.log('plate', name);
  }
  await browser.close();
})();
