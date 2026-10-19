/* Page viewer: tiles are reassembled on a canvas, only while a page is near the viewport. */
(() => {
  'use strict';
  const D = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(window.D), c => c.charCodeAt(0))));
  const G = D.g, B = D.b, X = D.x;
  const L = Object.assign({ blog: '', post: '', libros: '' }, D.l);
  const qs = new URLSearchParams(location.search);
  const n = D.e[qs.get('e')] ? qs.get('e') : '1';
  const E = D.e[n];
  const total = E.h;
  const enMarco = window.self !== window.top;
  const de = document.documentElement;
  const $ = id => document.getElementById(id);
  const barra = $('barra'), hojasEl = $('hojas'), inputNum = $('numero');
  const bAnterior = $('anterior'), bSiguiente = $('siguiente'), bAlejar = $('alejar'), bAcercar = $('acercar');
  const bAjustar = $('ajustar'), bCompleta = $('completa');
  const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function fnv1a(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(a) {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mezcla(k, semilla) {
    const r = mulberry32(semilla), p = Array.from({ length: k }, (_, i) => i);
    for (let i = k - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    const giros = Array.from({ length: k }, () => Math.floor(r() * 4));
    return [p, giros];
  }
  async function recomponer(src, geo, semilla) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = geo.w; c.height = geo.h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const k = geo.c * geo.f, [perm, giros] = mezcla(k, semilla);
    for (let i = 0; i < k; i++) {
      const d = perm[i], fx = giros[i] & 1 ? -1 : 1, fy = giros[i] & 2 ? -1 : 1;
      const dx = (d % geo.c) * geo.tw, dy = Math.floor(d / geo.c) * geo.th;
      g.setTransform(fx, 0, 0, fy, dx + (fx < 0 ? geo.tw : 0), dy + (fy < 0 ? geo.th : 0));
      g.drawImage(img, (i % geo.c) * geo.tw, Math.floor(i / geo.c) * geo.th, geo.tw, geo.th, 0, 0, geo.tw, geo.th);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    return c;
  }

  document.title = `${D.t}. ${X.serie} ${E.p}: ${E.s} · ${X.lectura}`;
  $('serie').textContent = `${X.serie} ${E.p} · ${D.t}`;
  $('nombre').textContent = E.s;
  $('total').textContent = total;

  const paginas = [];
  for (let i = 1; i <= total; i++) {
    const el = document.createElement('div');
    el.className = 'hoja'; el.dataset.n = i;
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', `${i} / ${total}`);
    const tapa = document.createElement('div'); tapa.className = 'tapa';
    el.append(tapa); hojasEl.append(el);
    paginas.push({ n: i, el, estado: null, lienzo: null });
  }
  async function pintar(p) {
    if (p.estado) return;
    p.estado = 'cargando'; p.el.classList.remove('error');
    try {
      const c = await recomponer(`p/${n}/${String(p.n).padStart(3, '0')}.jpg?v=${D.v}`, G, fnv1a(`${D.s}|p|${n}|${p.n}`));
      if (p.estado !== 'cargando') { c.width = 0; return; }
      p.el.prepend(c); p.lienzo = c; p.estado = 'lista'; p.el.classList.add('lista');
    } catch (e) {
      p.estado = null; p.el.classList.add('error');
    }
  }
  function soltar(p) {
    if (p.estado !== 'lista') { p.estado = null; return; }
    p.lienzo.width = 0; p.lienzo.height = 0; p.lienzo.remove();
    p.lienzo = null; p.estado = null; p.el.classList.remove('lista');
  }
  const cerca = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) pintar(paginas[e.target.dataset.n - 1]); }, { rootMargin: '150% 0px' });
  const lejos = new IntersectionObserver(es => { for (const e of es) if (!e.isIntersecting) soltar(paginas[e.target.dataset.n - 1]); }, { rootMargin: '500% 0px' });
  for (const p of paginas) { cerca.observe(p.el); lejos.observe(p.el); }

  const final = document.createElement('section');
  final.className = 'final';
  const otras = Object.entries(D.e).filter(([k]) => k !== n)
    .map(([k, x]) => `<a href="?e=${k}">${x.p > E.p ? 'Siga con la' : 'Lea la'} ${esc(X.serie.toLowerCase())} ${x.p}: ${esc(x.s)}</a>`);
  if (!enMarco && (L.post || L.blog)) otras.push(`<a href="${esc(L.post || L.blog)}">Volver al blog</a>`);
  final.innerHTML = `
    <div class="libros"></div>
    <h2>${esc(X.libros_titulo)}</h2>
    <p>${esc(X.libros_texto)}</p>
    <a class="boton" href="${esc(L.libros)}" target="_blank" rel="noopener">${esc(X.libros_boton)}</a>
    <p class="otras">${otras.join('')}</p>
    <p class="derechos">${esc(X.derechos)}</p>`;
  hojasEl.append(final);
  let librosListos = false;
  new IntersectionObserver(async (es, obs) => {
    if (librosListos || !es.some(e => e.isIntersecting)) return;
    librosListos = true; obs.disconnect();
    const caja = final.querySelector('.libros');
    for (let t = 1; t <= 4; t++) {
      try {
        const c = await recomponer(`x/${t}.jpg?v=${D.v}`, B, fnv1a(`${D.s}|x|${t}`));
        c.setAttribute('role', 'img'); c.setAttribute('aria-label', `${X.libros_alt} ${t}`);
        caja.append(c);
      } catch (e) { /* sin portada */ }
    }
  }, { rootMargin: '100% 0px' }).observe(final);

  const PASOS = [0.5, 0.67, 0.8, 1, 1.2, 1.45, 1.7, 2, 2.5, 3];
  let paso = 3, modo = 'ancho';
  function base() {
    const w = de.clientWidth, h = window.innerHeight - barra.offsetHeight;
    if (modo === 'hoja') return Math.max(200, (h - 28) * G.w / G.h);
    return Math.max(200, Math.min(w - (w < 640 ? 16 : 24), 980));
  }
  function posicion() {
    const a = actual(), r = paginas[a - 1].el.getBoundingClientRect();
    return { n: a, f: (barra.offsetHeight - r.top) / r.height, cx: (window.scrollX + de.clientWidth / 2) / de.scrollWidth };
  }
  function restaurar(ref) {
    const el = paginas[ref.n - 1].el;
    window.scrollTo(ref.cx * de.scrollWidth - de.clientWidth / 2, el.offsetTop + ref.f * el.offsetHeight - barra.offsetHeight);
  }
  function aplicarTamano(conservar) {
    const ref = conservar ? posicion() : null;
    de.style.setProperty('--ancho', `${Math.round(base() * PASOS[paso])}px`);
    if (ref) restaurar(ref);
    bAlejar.disabled = paso === 0; bAcercar.disabled = paso === PASOS.length - 1;
    bAjustar.classList.toggle('activo', modo === 'hoja');
    bAjustar.title = modo === 'hoja' ? 'Ajustar al ancho' : 'Ver la hoja entera';
  }
  function zoom(d) { const q = Math.min(PASOS.length - 1, Math.max(0, paso + d)); if (q !== paso) { paso = q; aplicarTamano(true); } }
  bAlejar.addEventListener('click', () => zoom(-1));
  bAcercar.addEventListener('click', () => zoom(1));
  bAjustar.addEventListener('click', () => { modo = modo === 'hoja' ? 'ancho' : 'hoja'; paso = 3; aplicarTamano(true); });
  let tRes = 0;
  window.addEventListener('resize', () => { clearTimeout(tRes); const ref = posicion(); tRes = setTimeout(() => { de.style.setProperty('--ancho', `${Math.round(base() * PASOS[paso])}px`); restaurar(ref); }, 120); });

  function actual() {
    const y = barra.offsetHeight + (window.innerHeight - barra.offsetHeight) * 0.35;
    let a = 1;
    for (const p of paginas) { if (p.el.getBoundingClientRect().top <= y) a = p.n; else break; }
    return a;
  }
  function irA(a, animar = true) {
    a = Math.min(total, Math.max(1, a | 0));
    window.scrollTo({ top: paginas[a - 1].el.offsetTop - barra.offsetHeight - 10, behavior: animar && suave ? 'smooth' : 'auto' });
  }
  function actualizarContador() {
    const a = actual();
    if (document.activeElement !== inputNum) inputNum.value = a;
    bAnterior.disabled = a <= 1; bSiguiente.disabled = a >= total;
  }
  let pendiente = false;
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; actualizarContador(); }); } }, { passive: true });
  bAnterior.addEventListener('click', () => irA(actual() - 1));
  bSiguiente.addEventListener('click', () => irA(actual() + 1));
  inputNum.addEventListener('focus', () => inputNum.select());
  inputNum.addEventListener('keydown', e => { if (e.key === 'Enter') { irA(parseInt(inputNum.value, 10) || 1); inputNum.blur(); } });
  inputNum.addEventListener('change', () => irA(parseInt(inputNum.value, 10) || 1));

  const puedeFS = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const enFS = () => document.fullscreenElement || document.webkitFullscreenElement;
  bCompleta.addEventListener('click', () => {
    if (puedeFS) {
      if (enFS()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
    } else {
      const u = new URL(location.href); u.searchParams.set('h', actual());
      window.open(u.href, '_blank', 'noopener');
    }
  });
  if (!puedeFS && !enMarco) bCompleta.hidden = true;
  if (!puedeFS && enMarco) bCompleta.title = 'Abrir en una pestaña nueva';

  const avisoEl = $('aviso');
  let tAviso = 0;
  function avisar(t) { avisoEl.textContent = t; avisoEl.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => { avisoEl.hidden = true; }, 2600); }
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && /^[sp]$/i.test(e.key)) { e.preventDefault(); avisar('Solo lectura en línea.'); return; }
    if (e.target === inputNum || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); irA(actual() + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); irA(actual() - 1); }
    else if (e.key === 'Home') { e.preventDefault(); irA(1); }
    else if (e.key === 'End') { e.preventDefault(); irA(total); }
    else if (e.key === '+' || e.key === '=') zoom(1);
    else if (e.key === '-') zoom(-1);
  });
  hojasEl.addEventListener('contextmenu', e => { if (e.target.closest('.hoja, .libros')) { e.preventDefault(); avisar('Solo lectura en línea.'); } });
  hojasEl.addEventListener('dragstart', e => { if (e.target.closest('.hoja, .libros')) e.preventDefault(); });

  aplicarTamano(false);
  actualizarContador();
  const inicio = parseInt(qs.get('h'), 10);
  if (inicio > 1) requestAnimationFrame(() => irA(inicio, false));
})();
