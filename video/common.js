// Shared by every scene: timing helpers, the two characters, speech bubbles and the close-up.
// A scene page loads this after its #measure and #stage elements, then defines setup() and scene().
// LINES (the scene's lines with their times and mouth envelopes) is declared by the scene page.
const FPS = 24, GROUND = 430;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const seg = (t, a, b) => ease((t - a) / (b - a));
const between = (t, a, b) => t >= a && t < b;

const measureEl = document.getElementById('measure');
function textWidth(s, size) {
  measureEl.setAttribute('font-size', size);
  measureEl.textContent = s;
  return measureEl.getComputedTextLength();
}
const draw = p => `pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - clamp(p, 0, 1)).toFixed(3)}"`;

// The dad. st.face: smile (default), grin, laugh, proud, brows, think, surprised, wink.
// st.arm (right arm): rest, talk, point, up, chin.  st.left (left arm): rest, shrug, hip.
// st.tilt: head tilt in degrees.  st.nod: 0..1 head dip.  st.mouth: loudness of his voice now.
function dad(x, t, st) {
  const s = 1.45;
  let bob = 0, legs = 'M0 100 L-18 165 M0 100 L18 165';
  if (st.walk) {
    const ph = Math.floor(t * 6) % 2;
    bob = ph ? -4 : 0;
    legs = ph ? 'M0 100 L-24 162 M0 100 L8 165' : 'M0 100 L-6 165 M0 100 L24 162';
  }
  const flap = Math.floor(t * 4) % 2;
  const arm = {
    rest: 'M0 42 L22 80',
    talk: flap ? 'M0 42 L26 60 L40 38' : 'M0 42 L27 58 L45 44',
    point: 'M0 42 L46 58',
    up: flap ? 'M0 42 L26 38 L38 6' : 'M0 42 L27 38 L42 9',
    chin: 'M0 42 L24 46 L12 30',
    shrug: 'M0 42 L22 50 L34 30',
  }[st.arm || 'rest'];
  const left = {
    rest: 'M0 42 L-22 80',
    shrug: 'M0 42 L-22 50 L-34 30',
    hip: 'M0 42 L-20 58 L-6 70',
  }[st.left || 'rest'];
  const face = st.face || 'smile';
  const m = st.mouth || 0;
  const talking = m > 0.12;
  let eyes = '<circle class="dot" cx="-5" cy="-1" r="2.2"/><circle class="dot" cx="11" cy="-1" r="2.2"/>';
  let brows = '', mouth, extra = '';
  if (face === 'laugh' || face === 'proud') eyes = '<path class="thin" d="M-9 0 Q-5 -5 -1 0 M7 0 Q11 -5 15 0"/>';
  if (face === 'wink') eyes = '<path class="thin" d="M-9 -1 H-1"/><circle class="dot" cx="11" cy="-1" r="2.2"/>';
  if (face === 'surprised') eyes = '<circle class="dot" cx="-5" cy="-1" r="3"/><circle class="dot" cx="11" cy="-1" r="3"/>';
  if (face === 'think') eyes = '<circle class="dot" cx="-3" cy="-4" r="2.2"/><circle class="dot" cx="13" cy="-4" r="2.2"/>';
  if (face === 'brows' || face === 'surprised') brows = 'M-10 -10 Q-5 -14 0 -11 M6 -11 Q11 -14 16 -10';
  if (face === 'think') brows = 'M-10 -8 L0 -10 M6 -12 L16 -9';
  if (face === 'wink') brows = 'M6 -11 Q11 -14 16 -10';
  if (face === 'laugh') {
    mouth = `<path class="dot" d="M-7 7 Q3 ${22 + 4 * m} 13 7 Z"/>`;
    extra = '<path class="hair" d="M-26 -14 L-32 -20 M-28 -4 H-36 M30 -14 L36 -20 M32 -4 H40"/>';
  } else if (talking) {
    mouth = `<ellipse class="dot" cx="3" cy="11" rx="${(4 + 2 * m).toFixed(2)}" ry="${(1.5 + 5 * m).toFixed(2)}"/>`;
  } else if (face === 'grin' || face === 'proud' || face === 'wink') {
    mouth = '<path class="dot" d="M-6 8 Q3 20 12 8 Z"/>';
  } else if (face === 'surprised') {
    mouth = '<circle class="thin" cx="3" cy="12" r="3.5"/>';
  } else if (face === 'think') {
    mouth = '<path class="thin" d="M-3 12 Q2 9 8 12"/>';
  } else {
    mouth = '<path class="thin" d="M-5 10 Q3 16 11 10"/>';
  }
  const tilt = (st.tilt || 0) + (st.nod ? 0 : 0);
  const dip = (st.nod || 0) * 5;
  return `<g class="ink" transform="translate(${x.toFixed(1)} ${GROUND - 165 * s + bob}) scale(${s})">
    <path d="M0 22 V100 ${left} ${arm} ${legs}"/>
    <polygon class="blue" points="0,25 -7,35 0,66 7,35"/>
    <g transform="translate(0 ${dip.toFixed(1)}) rotate(${tilt.toFixed(1)} 0 20)">
      <circle r="22" fill="#ffffff"/>
      <path class="dot" d="M-22 -5 Q-21 -27 0 -25 Q21 -27 22 -5 Q0 -17 -22 -5 Z"/>
      ${eyes}${brows ? `<path class="thin" d="${brows}"/>` : ''}
      ${mouth}${extra}
    </g>
  </g>`;
}

// Blue rings leaving a point in every direction. `blink` flickers them like a very fast code.
function rings(x, y, t, opts = {}) {
  const { max = 120, speed = 60, count = 4, blink = false, dashed = false } = opts;
  let out = '';
  for (let k = 0; k < count; k++) {
    const r = 10 + ((t * speed + k * (max / count)) % max);
    let o = clamp(1.1 - r / max, 0, 1);
    if (blink && Math.floor(t * 24 + k * 2) % 3 === 0) o = 0;
    out += `<circle class="wave" cx="${x}" cy="${y}" r="${r.toFixed(1)}" opacity="${o.toFixed(2)}" ${dashed ? 'stroke-dasharray="6 9"' : ''}/>`;
  }
  return out;
}

// When something happens to a character: a list of { from, to, ...pose } windows, latest wins.
function poseAt(windows, tRaw) {
  const out = {};
  windows.filter(w => w.from != null && tRaw >= w.from && tRaw < w.to).forEach(w => Object.assign(out, w));
  delete out.from; delete out.to;
  return out;
}

// A nod: the head dips and comes back once over `len` seconds.
const nod = (tRaw, at, len = 0.5) => (tRaw >= at && tRaw < at + len) ? Math.sin((tRaw - at) / len * Math.PI) : 0;

// Laughs heard in the recording (stored by import-audio.js), as { from, to } windows.
// A laugh inside one of her lines is hers; any other laugh is his.
let EVENTS = [];
function laughs(who) {
  const inKid = e => LINES.some(l => l.who === 'kid' && e.a > l.a + 0.2 && e.b < l.b);
  return EVENTS.filter(e => /laugh|chuckl|giggl/i.test(e.text) && (who === 'kid') === inKid(e))
    .map(e => ({ from: e.a, to: e.b + 0.15, face: 'laugh' }));
}

function kid(x, t, st) {
  const s = 1.45 * st.scale;
  const ox = st.look === 'left' ? -3 : 0;
  const m = st.mouth || 0, open = m > 0.12;
  let brows = '', mouth = '', extra = '', eyeR = 2, eyesSvg = '';
  if (st.face === 'lost') {
    brows = `M${-13 + ox} -10 L${-5 + ox} -7 M${5 + ox} -7 L${13 + ox} -10`;
    mouth = open ? `<ellipse class="dot" cx="${ox}" cy="9" rx="${(3.5 + 2 * m).toFixed(2)}" ry="${(1.5 + 5 * m).toFixed(2)}"/>` : `<path class="thin" d="M${-7 + ox} 9 Q${-4.5 + ox} 5 ${-2 + ox} 9 T${3 + ox} 9 T${8 + ox} 9"/>`;
  } else if (st.face === 'listen') {
    mouth = `<path class="thin" d="M${-4 + ox} 9 H${4 + ox}"/>`;
  } else if (st.face === 'curious') {
    brows = `M${-13 + ox} -9 H${-5 + ox} M${1 + ox} -11 L${9 + ox} -13`;
    mouth = open ? `<ellipse class="dot" cx="${ox}" cy="9" rx="${(3 + 1.5 * m).toFixed(2)}" ry="${(1.5 + 4 * m).toFixed(2)}"/>` : `<circle class="thin" cx="${ox}" cy="9" r="2.5"/>`;
  } else if (st.face === 'viewer') {
    brows = 'M-12 -11 H-4 M4 -11 H12';
    eyeR = 2.4;
    mouth = open ? `<ellipse class="dot" cx="0" cy="9" rx="${(3.5 + 1.5 * m).toFixed(2)}" ry="${(1.5 + 4 * m).toFixed(2)}"/>` : '<path class="thin" d="M-5 8 Q0 11 5 8"/>';
  } else if (st.face === 'flat') {
    brows = 'M-11 -5 H-3 M3 -5 H11';
    mouth = open ? `<ellipse class="dot" cx="0" cy="9" rx="${(3 + m).toFixed(2)}" ry="${(1 + 3 * m).toFixed(2)}"/>` : '<path class="thin" d="M-5 10 L6 8"/>';
  } else if (st.face === 'laugh') {
    eyesSvg = `<path class="thin" d="M${-10 + ox} -2 Q${-6 + ox} -7 ${-2 + ox} -2 M${2 + ox} -2 Q${6 + ox} -7 ${10 + ox} -2"/>`;
    mouth = `<path class="dot" d="M${-7 + ox} 6 Q${ox} ${19 + 3 * m} ${7 + ox} 6 Z"/>`;
  } else if (st.face === 'wow') {
    brows = `M${-12 + ox} -12 L${-4 + ox} -14 M${4 + ox} -14 L${12 + ox} -12`;
    eyeR = 2.8;
    mouth = `<ellipse class="dot" cx="${ox}" cy="9.5" rx="6" ry="${(6.5 + 3 * m).toFixed(2)}"/>`;
    extra = '<path class="thin" d="M26 -20 L33 -27 M29 -8 H38 M-26 -20 L-33 -27 M-29 -8 H-38"/>';
  }
  let arms, tablet;
  const spin = Math.floor(t * 8) * 45;
  const screen = (cx, cy) => `<path class="hair" transform="rotate(${spin} ${cx} ${cy})" d="M${cx + 6} ${cy} A6 6 0 1 1 ${cx} ${cy - 6}"/>`;
  if (st.arms === 'up') {
    const j = Math.floor(t * 6) % 2 ? 2 : 0;
    arms = `M0 30 L-27 ${10 - j} M0 30 L24 ${6 - j}`;
    tablet = `<g transform="translate(-42 ${-4 - j}) rotate(-24)"><rect x="-18" y="-14" width="36" height="27" rx="3" fill="#ffffff"/>${screen(0, 0)}</g>`;
  } else {
    arms = 'M0 30 L-24 40 M0 30 L-24 52';
    tablet = `<g transform="rotate(${st.shake || 0} -40 46)"><rect x="-58" y="32" width="36" height="27" rx="3" fill="#ffffff"/>${screen(-40, 45.5)}</g>`;
  }
  return `<g class="ink" transform="translate(${x.toFixed(1)} ${(GROUND - 92 * s).toFixed(1)}) scale(${s.toFixed(3)})">
    <path d="${arms} M-7 58 L-10 92 M7 58 L10 92"/>
    <polygon class="orange" points="0,17 -19,62 19,62"/>
    ${tablet}
    <circle r="19" fill="#ffffff"/>
    <polygon class="orange" points="0,-19 -13,-29 -13,-12"/><polygon class="orange" points="0,-19 13,-29 13,-12"/>
    ${eyesSvg || `<circle class="dot" cx="${-6 + ox}" cy="-2" r="${eyeR}"/><circle class="dot" cx="${6 + ox}" cy="-2" r="${eyeR}"/>`}
    ${brows ? `<path class="thin" d="${brows}"/>` : ''}
    ${mouth}${extra}
  </g>`;
}

function bubble(lines, tipX, tipY, pop) {
  if (window.NO_BUBBLES) return '';   // Shorts show big captions instead
  const size = 27, lh = 32;
  const w = Math.max(...lines.map(l => textWidth(l, size))) + 40;
  const h = lines.length * lh + 22;
  const cx = clamp(tipX, w / 2 + 14, 854 - w / 2 - 14);
  const x0 = cx - w / 2, x1 = cx + w / 2, y1 = tipY - 28, y0 = y1 - h, r = 16;
  const tx = clamp(tipX, x0 + r + 14, x1 - r - 14);
  const d = `M${x0 + r} ${y0} H${x1 - r} A${r} ${r} 0 0 1 ${x1} ${y0 + r} V${y1 - r} A${r} ${r} 0 0 1 ${x1 - r} ${y1} H${tx + 12} L${tipX} ${tipY} L${tx - 12} ${y1} H${x0 + r} A${r} ${r} 0 0 1 ${x0} ${y1 - r} V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`;
  const k = 0.85 + 0.15 * pop;
  const text = lines.map((l, i) => `<text class="txt" x="${cx}" y="${y0 + 36 + i * lh}" font-size="${size}" text-anchor="middle">${l}</text>`).join('');
  return `<g transform="translate(${tipX} ${tipY}) scale(${k.toFixed(3)}) translate(${-tipX} ${-tipY})"><path class="ink thin" fill="#ffffff" d="${d}"/>${text}</g>`;
}

// How open a character's mouth is right now, from the loudness of their voice clip.
// `env` is one value per video frame (0..1), measured from the audio in render.js.
function mouthLevel(who, tRaw) {
  const l = LINES.find(x => x.who === who && between(tRaw, x.a, x.b));
  if (!l || !l.env) return 0;
  return l.env[Math.floor((tRaw - l.a) * FPS)] || 0;
}

const CLOSE_UP = 2.5;   // how far the camera pushes in for a to-viewer line

// Push the camera in on one character so only they are in frame (p: 0 = wide, 1 = close-up).
// While a to-viewer line plays in the close-up, its words are written beside the character.
function closeUp(out, p, who, x, line) {
  if (p <= 0) return out;
  const focus = who === 'dad' ? { x: x - 10, y: 232, sx: 560 } : { x: x - 22, y: 312, sx: 250 };
  const z = 1 + (CLOSE_UP - 1) * p;
  const cx = 427 + (focus.x - 427) * p, cy = 240 + (focus.y - 240) * p, sx = 427 + (focus.sx - 427) * p;
  let shot = `<g style="--k:${Math.pow(z, -0.45).toFixed(3)}" transform="translate(${sx.toFixed(1)} 240) scale(${z.toFixed(3)}) translate(${(-cx).toFixed(1)} ${(-cy).toFixed(1)})">${out}</g>`;
  if (line && line.viewer && line.who === who && p > 0.95 && !window.NO_BUBBLES) {
    const capX = who === 'dad' ? 640 : 630, size = 36, lh = 44;
    const y0 = 240 - (line.show.length - 1) * lh / 2 + 12;
    shot += line.show.map((s, i) => `<text class="txt" x="${capX}" y="${y0 + i * lh}" font-size="${size}" text-anchor="middle">${s}</text>`).join('');
  }
  return shot;
}

// When a word of a line is spoken (its nth occurrence), from the word times found in the recording.
function wordTime(line, word, nth = 0) {
  const hits = (line.tok || []).filter(x => x.w === word && x.a != null);
  return hits.length ? hits[Math.min(nth, hits.length - 1)].a : null;
}

// A long line is shown two displayed lines at a time; each page turns when its first word is spoken
// (or, without word times, after a share of the line's length proportional to its letters).
function page(line, tRaw) {
  const n = line.show.length;
  if (n <= 2) return { lines: line.show, start: line.a };
  const pages = [];
  for (let i = 0; i < n; i += 2) pages.push(i);
  const startOf = i => {
    if (i === 0) return line.a;
    if (line.tok && line.lineTok) {
      const k = line.lineTok.slice(0, i).reduce((s, x) => s + x, 0);
      const hit = line.tok.slice(k).find(x => x.a != null);
      if (hit) return hit.a;
    }
    const chars = s => s.reduce((c, x) => c + x.length, 0);
    return line.a + (line.b - line.a) * chars(line.show.slice(0, i)) / chars(line.show);
  };
  let cur = 0;
  pages.forEach((i, k) => { if (tRaw >= startOf(i)) cur = k; });
  const i = pages[cur];
  return { lines: line.show.slice(i, i + 2), start: startOf(i) };
}

// Speech bubble over whoever is talking, in the wide shot.
function speech(line, dadX, kidX, tRaw) {
  if (!line || line.viewer) return '';
  const pg = page(line, tRaw);
  const pop = seg(tRaw, pg.start, pg.start + 0.15);
  return line.who === 'dad'
    ? bubble(pg.lines, dadX + 14, GROUND - 165 * 1.45 - 44, pop)
    : bubble(pg.lines, kidX - 4, GROUND - 92 * 1.45 - 50, pop);
}

// Fast paper. When render.js sets window.PAPER_PLATES (the plates made once by make-plates.js),
// the creases, their lighting and the ink grain are read from images instead of being computed
// for every frame; only bending and inking the drawing is done per frame. Same look, much faster.
function installPlates(dir) {
  const old = document.getElementById('onpaper');
  // dir is a map of plate name -> data: URL. (A plate loaded from a file is refused as a
  // displacement map by the browser's security rules; embedded data is allowed.)
  const [pw, ph] = window.PAPER_SIZE || [854, 480], py = window.PAPER_TOP || 0;
  const img = (name, res) => `<feImage href="${dir[name]}" x="0" y="${py}" width="${pw}" height="${ph}" preserveAspectRatio="none" result="${res}"/>`;
  let defs = '';
  for (let n = 0; n < 3; n++) {
    defs += `<filter id="onpaper${n}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      ${img('crease', 'crease')}${img(`grain-${n}`, 'grainRaw')}
      <feColorMatrix in="grainRaw" type="matrix" values="2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  0 0 0 0 1" result="grain"/>
      <feDisplacementMap in="SourceGraphic" in2="crease" scale="10" xChannelSelector="R" yChannelSelector="G" result="bent"/>
      <feDisplacementMap in="bent" in2="grainRaw" scale="2.2" xChannelSelector="G" yChannelSelector="B" result="roughRaw"/>
      <feFlood flood-color="#ffffff" result="white"/>
      <feComposite in="roughRaw" in2="white" operator="over" result="rough"/>
      <feComposite in="rough" in2="grain" operator="arithmetic" k1="-0.2" k2="1" k3="0.2" k4="0" result="inked"/>
      ${img('light', 'light')}
      <feBlend in="light" in2="inked" mode="hard-light"/>
    </filter>`;
  }
  old.insertAdjacentHTML('afterend', defs);
}
if (window.PAPER_PLATES) installPlates(window.PAPER_PLATES);

window.renderFrame = function (f) {
  if (window.PAPER_PLATES) document.getElementById('stage').style.filter = `url(#onpaper${Math.floor(f / 3) % 3})`;
  else document.getElementById('grainNoise').setAttribute('seed', 24 + Math.floor(f / 3) % 3);
  document.getElementById('stage').innerHTML = scene(f / FPS);
};
