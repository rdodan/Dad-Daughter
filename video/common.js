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
  }[st.arm];
  const m = st.mouth || 0;
  const mouth = m > 0.12
    ? `<ellipse class="dot" cx="3" cy="11" rx="${(4 + 2 * m).toFixed(2)}" ry="${(1.5 + 5 * m).toFixed(2)}"/>`
    : '<path class="thin" d="M-5 10 Q3 16 11 10"/>';
  return `<g class="ink" transform="translate(${x.toFixed(1)} ${GROUND - 165 * s + bob}) scale(${s})">
    <path d="M0 22 V100 M0 42 L-22 80 ${arm} ${legs}"/>
    <polygon class="blue" points="0,25 -7,35 0,66 7,35"/>
    <circle r="22" fill="#ffffff"/>
    <path class="dot" d="M-22 -5 Q-21 -27 0 -25 Q21 -27 22 -5 Q0 -17 -22 -5 Z"/>
    <circle class="dot" cx="-5" cy="-1" r="2.2"/><circle class="dot" cx="11" cy="-1" r="2.2"/>
    ${mouth}
  </g>`;
}

function kid(x, t, st) {
  const s = 1.45 * st.scale;
  const ox = st.look === 'left' ? -3 : 0;
  const m = st.mouth || 0, open = m > 0.12;
  let brows = '', mouth = '', extra = '', eyeR = 2;
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
    <circle class="dot" cx="${-6 + ox}" cy="-2" r="${eyeR}"/><circle class="dot" cx="${6 + ox}" cy="-2" r="${eyeR}"/>
    ${brows ? `<path class="thin" d="${brows}"/>` : ''}
    ${mouth}${extra}
  </g>`;
}

function bubble(lines, tipX, tipY, pop) {
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
  if (line && line.viewer && line.who === who && p > 0.95) {
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

window.renderFrame = function (f) {
  document.getElementById('grainNoise').setAttribute('seed', 24 + Math.floor(f / 3) % 3);
  document.getElementById('stage').innerHTML = scene(f / FPS);
};
