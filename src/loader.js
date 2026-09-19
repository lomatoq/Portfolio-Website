/* NOCTURNE R15 — BOOT SEQUENCE
 * Everything is preloaded behind full darkness. The scene is never shown
 * half-built: the counter reports real readiness, then dissolves and the
 * intro rises out of black.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  // Native touch scroll is composited independently of WebGL presentation.
  // Keep moving card materials in the same DOM layer as their live text.
  window.NocturnePlatform=Object.freeze({attachedGlass:matchMedia('(pointer: coarse)').matches});
  root.classList.toggle('touch-compositor',window.NocturnePlatform.attachedGlass);
  const host = document.getElementById('bootLoader');
  if (!host) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('booting');
  try { history.scrollRestoration = 'manual'; } catch { }
  window.scrollTo(0, 0);

  let loaderArt=true;try{loaderArt=JSON.parse(localStorage.getItem('nocturne-lab-flags')||'{}').loaderV2!==false;}catch{}
  try{if(localStorage.getItem('nocturne-blue')==='on')document.body.classList.add('mx-blue');}catch{}
  if(loaderArt){
    const colors=[['#9beaff','#286aaa'],['#ffb5e7','#813665'],['#ffe6a3','#986632'],['#c7b7ff','#5842aa'],['#d6ffc0','#4c885b']];
    const forms=[
      '<path d="M100 13 118 68 175 40 144 91 189 112 133 127 151 181 103 147 63 186 67 133 14 112 66 92 35 40 86 65Z"/>',
      '<path fill-rule="evenodd" d="M100 20a80 80 0 1 1 0 160 80 80 0 0 1 0-160Zm0 43a37 37 0 1 0 0 74 37 37 0 0 0 0-74Z"/>',
      '<path d="M100 12 174 60 188 120 132 185 58 172 13 98 47 38Z"/><path d="m47 38 85 147L174 60 13 98 188 120 100 12 58 172Z" fill="none" stroke="#ffffff77" stroke-width="2"/>',
      '<path d="M30 63Q36 12 80 45Q110 5 135 48Q185 27 169 80Q208 113 162 133Q163 183 119 162Q83 202 64 153Q14 170 34 122Q-2 84 30 63Z"/>',
      '<path fill-rule="evenodd" d="M39 36Q91 0 151 40Q207 80 161 141Q110 206 52 157Q-5 109 39 36ZM68 63Q32 106 80 137Q119 169 140 112Q160 66 110 59Q86 42 68 63Z"/>'
    ];
    const slots=[0,1].map(side=>{const slot=document.createElement('div');slot.className='mx-loader-slot';slot.dataset.side=side?'right':'left';host.querySelector('.boot-stage').append(slot);return slot});
    for(let pair=0;pair<5;pair++)for(let side=0;side<2;side++){
      const e=document.createElement('div'),id='boot-object-'+pair+'-'+side;e.className='mx-loader-art';e.dataset.side=side?'right':'left';e.dataset.pair=pair;
      e.style.setProperty('--delay',(pair*1.35)+'s');e.style.setProperty('--object-rotate',(side?1:-1)*(pair*6+9)+'deg');
      const c=colors[(pair+side*2)%5];
      e.innerHTML=`<svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c[1]}"/><stop offset=".28" stop-color="${c[0]}"/><stop offset=".44" stop-color="${c[1]}"/><stop offset=".51" stop-color="#fbffff"/><stop offset=".59" stop-color="${c[0]}"/><stop offset=".83" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></linearGradient></defs><g fill="url(#${id})" stroke="${c[0]}" stroke-width=".8">${forms[(pair+side)%5]}</g></svg>`;
      slots[side].append(e);
      // Normalize visible artwork, not just the SVG canvas. All swaps share a centre.
      const g=e.querySelector('svg>g'),b=g.getBBox(),k=156/Math.max(b.width,b.height);
      g.setAttribute('transform',`translate(100 100) scale(${k}) translate(${-b.x-b.width/2} ${-b.y-b.height/2})`);
    }
  }
  const digits = [...host.querySelectorAll('.boot-count > i')];
  const rule = host.querySelector('.boot-rule > i');
  const label = host.querySelector('.boot-label b');

  // ---- real readiness ------------------------------------------------------
  const signals = [];
  const add = (weight, promise) => { const s = { weight, done: 0 }; signals.push(s); Promise.resolve(promise).then(() => { s.done = 1; }, () => { s.done = 1; }); return s; };
  const after = (ms) => new Promise(r => setTimeout(r, ms));
  const race = (p, ms) => Promise.race([p, after(ms)]);

  add(3, document.readyState === 'complete' ? null : new Promise(r => addEventListener('load', r, { once: true })));
  add(2, race(document.fonts ? document.fonts.ready : null, 6000));
  add(2, race(Promise.all([...document.images].map(img => img.complete ? null
    : new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }))), 8000));
  // The live scene counts as loaded only once it has actually produced frames.
  const scene = add(3, race(new Promise(r => {
    const poll = () => {
      const d = window.Nocturne && window.Nocturne.diagnostics && window.Nocturne.diagnostics();
      if (d && (d.frames > 2 || d.mode === 'poster' || d.mode === 'canvas2d')) r();
      else setTimeout(poll, 90);
    };
    poll();
  }), 9000));

  const totalWeight = () => signals.reduce((a, s) => a + s.weight, 0);
  const readiness = () => signals.reduce((a, s) => a + s.weight * s.done, 0) / Math.max(1, totalWeight());

  // ---- counter -------------------------------------------------------------
  const MIN_MS = reduced ? 320 : 1500;
  const start = performance.now();
  let shown = 0, settled = false, raf = 0;

  function paint(v) {
    const n = Math.max(0, Math.min(100, Math.round(v)));
    const text = String(n).padStart(3, '0');
    for (let i = 0; i < digits.length; i++) {
      const ch = text[i];
      if (digits[i].textContent !== ch) digits[i].textContent = ch;
      // Leading zeros stay as a dim frame rather than disappearing.
      const lead = n < 10 ? 2 : n < 100 ? 1 : 0;
      digits[i].style.setProperty('--d-on', i < lead ? '.16' : '1');
    }
    if (rule) rule.style.setProperty('--p', (n / 100).toFixed(4));
    host.style.setProperty('--boot-in', (Math.min(1, n / 55)).toFixed(3));
    host.style.setProperty('--boot-glow', (0.25 + 0.75 * Math.sin(Math.min(1, n / 100) * Math.PI * 0.85)).toFixed(3));
  }
  paint(0);

  function step(now) {
    raf = 0;
    const elapsed = now - start;
    const paced = Math.min(1, elapsed / MIN_MS);
    // The bar never runs ahead of the truth, and never stalls at a dead number.
    const ceiling = Math.min(readiness(), paced) * 100;
    const drift = shown < ceiling ? Math.max(0.45, (ceiling - shown) * 0.085) : 0;
    shown = Math.min(100, shown + drift);
    if (shown < 99.4 && ceiling >= 99.99) shown = Math.min(100, shown + 1.6);
    paint(shown);
    if (shown >= 99.99 && ceiling >= 99.99 && elapsed >= MIN_MS) return finish();
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  // Hard ceiling: a stalled asset can never keep a visitor in the dark.
  setTimeout(() => { if (!settled) { signals.forEach(s => s.done = 1); } }, 11000);

  function finish() {
    if (settled) return;
    settled = true;
    cancelAnimationFrame(raf);
    paint(100);
    if (label) label.textContent = 'READY';

    const exit = reduced ? 1 : 900;
    const veil = reduced ? 1 : 1150;
    // Let the intro restart from zero so the name truly rises out of black.
    try {
      window.scrollTo(0, 0);
      window.Nocturne && window.Nocturne.restartIntro && window.Nocturne.restartIntro();
    } catch { }

    const t0 = performance.now();
    const ease = p => 1 - Math.pow(1 - p, 3);
    function out(now) {
      const p = Math.min(1, (now - t0) / exit);
      host.style.setProperty('--boot-out', ease(p).toFixed(4));
      if (p < 1) requestAnimationFrame(out);
    }
    requestAnimationFrame(out);

    // The scene is uncovered slightly before the loader has fully gone, so the
    // two cross-fade instead of cutting.
    setTimeout(() => {
      root.classList.remove('booting');
      root.classList.add('boot-reveal');
      window.scrollTo(0, 0);
      window.portfolioWake && window.portfolioWake();
      window.Nocturne && window.Nocturne.layout && window.Nocturne.layout();
      window.NocturneR14 && window.NocturneR14.invalidate && window.NocturneR14.invalidate();
      dispatchEvent(new CustomEvent('nocturne:booted'));
    }, reduced ? 0 : exit * 0.46);

    setTimeout(() => {
      host.remove();
      root.classList.remove('boot-reveal');
      try { history.scrollRestoration = 'auto'; } catch { }
    }, veil + 260);
  }
})();
