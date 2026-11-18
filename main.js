import * as THREE from 'three';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const burger = $('#burger'), menu = $('#menu');

/* ---------------- smooth scroll */
const lenis = (reduce || isTouch) ? null : new Lenis({ lerp: 0.1, smoothWheel: true });   // native scroll on touch = smoother on phones
ScrollTrigger.config({ ignoreMobileResize: true });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
function scrollToEl(el, offset = -20) {
  lenis ? lenis.scrollTo(el, { offset, duration: 1.4 }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href'); if (id.length < 2) return;
  const el = $(id); if (!el) return; e.preventDefault(); closeMenu();
  scrollToEl(el, id === '#top' ? 0 : -20);
}));

/* ---------------- THREE: hero (key visual + neon smoke + gold dust) */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100); cam.position.z = 5;
const uniforms = {
  uTex: { value: null }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uRes: { value: new THREE.Vector2(1, 1) },
  uImg: { value: new THREE.Vector2(1672, 941) }, uScroll: { value: 0 }, uIntro: { value: 0 },
};
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms, depthWrite: false, depthTest: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    precision highp float; varying vec2 vUv;
    uniform sampler2D uTex; uniform float uTime, uScroll, uIntro; uniform vec2 uMouse, uRes, uImg;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
    vec2 cover(vec2 uv){ float rs = uRes.x/uRes.y, ri = uImg.x/uImg.y;
      vec2 s = rs > ri ? vec2(1., ri/rs) : vec2(rs/ri, 1.); return (uv - .5) * s + .5; }
    void main(){
      vec2 uv = vUv;
      float zoom = 1.0 + uScroll * .18 + (1.0 - uIntro) * .12;
      vec2 m = (uMouse - .5);
      vec2 base = cover((uv - .5) / zoom + .5);
      vec4 pre = texture2D(uTex, base);
      float depth = smoothstep(.15, .85, dot(pre.rgb, vec3(.3,.5,.2)));      // brighter = closer (neon, statue)
      vec2 tuv = base + m * (.012 + depth * .022);
      float t = uTime * .05;
      vec2 sm = uv * vec2(uRes.x/uRes.y, 1.) * 2.2;
      float smoke = fbm(sm + vec2(t * 2., -t) + fbm(sm * .8 - t));
      tuv += (smoke - .5) * .006;
      vec2 asp = vec2(uRes.x/uRes.y, 1.);
      float md = distance(uv * asp, uMouse * asp);
      tuv += normalize(uv - uMouse + 1e-4) * sin(md * 38. - uTime * 3.) * .0035 * smoothstep(.35, 0., md);  // liquid ripple under the cursor
      tuv.x += sin(uv.y * 18. + uTime) * .004 * uScroll;                                                     // dream warp on scroll
      vec3 col;
      col.r = texture2D(uTex, tuv + vec2(.0016, 0.) * (1. + uScroll * 4.)).r;
      col.g = texture2D(uTex, tuv).g;
      col.b = texture2D(uTex, tuv - vec2(.0016, 0.) * (1. + uScroll * 4.)).b;
      col += max(col - .55, 0.) * 1.1;                                          // neon bloom
      vec3 haze = mix(vec3(.04,.12,.45), vec3(.25,.48,1.), smoke);
      col += haze * pow(smoke, 2.4) * .55;
      col += vec3(.22,.42,1.) * .22 * smoothstep(.55, 0., md);                // neon flashlight following the cursor
      col *= .55 + .45 * smoothstep(1.25, .25, length(uv - .5));             // vignette
      col *= mix(1., .35, uScroll);                                           // fade to night on scroll
      col *= uIntro;
      col += (hash(uv * uRes + uTime) - .5) * .035;                           // grain
      gl_FragColor = vec4(col, 1.);
    }`,
}));
quad.frustumCulled = false; scene.add(quad);

// gold dust
const N = isTouch ? 380 : 900;
const pg = new THREE.BufferGeometry(); const pos = new Float32Array(N * 3), seed = new Float32Array(N);
for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 9; pos[i * 3 + 1] = (Math.random() - .5) * 5.5; pos[i * 3 + 2] = Math.random() * 3 - 1.5; seed[i] = Math.random(); }
pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
const dust = new THREE.Points(pg, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: uniforms.uTime, uMouse: uniforms.uMouse, uPx: { value: renderer.getPixelRatio() }, uIntro: uniforms.uIntro },
  vertexShader: `attribute float aSeed; uniform float uTime, uPx; uniform vec2 uMouse; varying float vA;
    void main(){ vec3 p = position; float t = uTime * (.05 + aSeed * .08);
      p.y += mod(t + aSeed * 6., 6.) - 3.; p.x += sin(t * 3. + aSeed * 20.) * .25 + (uMouse.x - .5) * p.z * .35; p.y += (uMouse.y - .5) * p.z * .2;
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.2 + aSeed * 3.2) * uPx * (5. / -mv.z); vA = .25 + aSeed * .75; }`,
  fragmentShader: `uniform float uIntro; varying float vA; void main(){ float d = length(gl_PointCoord - .5); if(d > .5) discard;
      gl_FragColor = vec4(1., .82, .45, smoothstep(.5, .0, d) * vA * .85 * uIntro); }`,
}));
scene.add(dust);

// hero video (vertical on portrait screens, horizontal on landscape) with poster as instant fallback
const portrait = () => innerHeight > innerWidth;
let curMode = portrait() ? 'v' : 'h';
const vid = document.createElement('video');
Object.assign(vid, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto', crossOrigin: 'anonymous' });
vid.setAttribute('playsinline', ''); vid.setAttribute('muted', '');
const poster = new THREE.TextureLoader().load(`assets/hero/hero-${curMode}.jpg`, (t) => { t.colorSpace = THREE.SRGBColorSpace; uniforms.uImg.value.set(t.image.width, t.image.height); loaded(); });
uniforms.uTex.value = poster;
const vtex = new THREE.VideoTexture(vid); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter;
function setVideo(mode) { curMode = mode; vid.src = `assets/hero/hero-${mode}.mp4`; vid.play().catch(() => {}); }
vid.addEventListener('playing', () => { uniforms.uTex.value = vtex; uniforms.uImg.value.set(vid.videoWidth, vid.videoHeight); });
setVideo(curMode);
addEventListener('resize', () => { const m = portrait() ? 'v' : 'h'; if (m !== curMode) setVideo(m); });
addEventListener('pointerdown', () => vid.paused && heroVisible && vid.play().catch(() => {}), { once: true });

const target = new THREE.Vector2(.5, .5);
addEventListener('pointermove', (e) => target.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight));
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); uniforms.uRes.value.set(w, h); }
addEventListener('resize', resize); resize();
let heroVisible = true;
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; heroVisible ? vid.play().catch(() => {}) : vid.pause(); }).observe($('#hero'));
document.addEventListener('visibilitychange', () => { document.hidden ? vid.pause() : heroVisible && vid.play().catch(() => {}); });
const clock = new THREE.Clock();
gsap.ticker.add(() => {
  if (!heroVisible) return;
  uniforms.uTime.value = clock.getElapsedTime();
  uniforms.uMouse.value.lerp(target, .06);
  renderer.render(scene, cam);
});

/* ---------------- hero sound (off by default; fades with scroll) */
const snd = $('#sound');
let soundOn = false;
const heroVol = () => .9 * (1 - uniforms.uScroll.value);
function setSound(on) {
  soundOn = on;
  snd.setAttribute('aria-pressed', String(on));
  snd.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  if (on) {
    vid.muted = false; vid.volume = 0;
    if (heroVisible) vid.play().catch(() => {});
    gsap.to(vid, { volume: heroVol(), duration: 1.2, ease: 'power2.out', overwrite: true });
  } else {
    gsap.to(vid, { volume: 0, duration: .5, overwrite: true, onComplete: () => { vid.muted = true; } });
  }
}
snd.addEventListener('click', () => setSound(!soundOn));

/* ---------------- loader + age gate */
let assets = 0; const need = 2;
const bar = $('#loader-bar'), fill = $('#loader-fill'), count = $('#loader-count');
const lp = { v: 0 };
function setLoad(p) {
  gsap.to(lp, { v: p, duration: .7, ease: 'power2.out', overwrite: true, onUpdate: () => {
    bar.style.width = (lp.v * 100) + '%';
    fill.style.clipPath = `inset(${(1 - lp.v) * 100}% 0 0 0)`;
    count.textContent = String(Math.round(lp.v * 100)).padStart(2, '0');
  } });
}
function loaded() { assets++; setLoad(assets / need); if (assets === need) setTimeout(intro, 900); }
document.fonts.ready.then(loaded);

function intro() {
  gsap.to('#loader', { autoAlpha: 0, duration: .8, ease: 'power2.out' });
  let ok = false; try { ok = localStorage.getItem('tdh_age') === 'yes'; } catch (e) {}
  if (ok) { $('#gate').hidden = true; start(); }
  else { document.body.classList.add('gated'); gsap.from('.gate__inner > *', { y: 30, autoAlpha: 0, stagger: .08, duration: 1, ease: 'expo.out', delay: .3 }); }
}
$('#gate-yes').addEventListener('click', () => {
  try { localStorage.setItem('tdh_age', 'yes'); } catch (e) {}
  gsap.to('#gate', { autoAlpha: 0, duration: .7, ease: 'power2.inOut', onComplete: () => { $('#gate').hidden = true; document.body.classList.remove('gated'); start(); } });
});

/* ---------------- hero intro */
function start() {
  document.body.classList.remove('is-loading');
  lenis && lenis.start();
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to(uniforms.uIntro, { value: 1, duration: 2.2, ease: 'power2.out' }, 0);
  const st = new SplitText('.hero__title .split', { type: 'chars' });
  tl.from(st.chars, { yPercent: 115, rotate: 6, duration: 1.4, stagger: .035 }, .25)
    .from('.hero .reveal-up', { y: 30, autoAlpha: 0, duration: 1.2, stagger: .1 }, .7)
    .from('.seal', { scale: .4, rotate: -120, autoAlpha: 0, duration: 2, ease: 'expo.out' }, .8)
    .from('.nav', { yPercent: -150, autoAlpha: 0, duration: 1.2 }, .6);
  ScrollTrigger.refresh();
}

/* ---------------- brand seal: slow spin that speeds up with scroll velocity */
const spin = reduce ? null : gsap.to('.seal__spin', { rotation: 360, svgOrigin: '100 100', duration: 30, repeat: -1, ease: 'none' });

/* ---------------- scroll-driven motion */
ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => {
  uniforms.uScroll.value = s.progress;
  if (soundOn && !gsap.isTweening(vid)) vid.volume = Math.max(0, heroVol());
} });
gsap.to('.hero__content', { yPercent: -30, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 30%', scrub: true } });
gsap.to('.seal', { y: 170, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

// one global scroll listener: progress bar, nav hide, seal speed
const progress = $('#progress'), nav = $('#nav');
let lastY = 0;
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => {
  const y = s.scroll();
  progress.style.transform = `scaleX(${s.progress})`;
  nav.classList.toggle('is-hidden', y > lastY && y > 400 && !menu.classList.contains('is-open')); lastY = y;
  if (spin) {
    const v = Math.min(Math.abs(s.getVelocity()) / 220, 14);
    gsap.to(spin, { timeScale: 1 + v, duration: .25, overwrite: true, onComplete: () => gsap.to(spin, { timeScale: 1, duration: 1.4, ease: 'power2.out' }) });
  }
} });

// active section in the nav
$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href')); if (!sec) return;
  ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => a.classList.toggle('is-active', s.isActive) });
});

// marquee
gsap.to('.marquee__track', { xPercent: -50, ease: 'none', duration: 28, repeat: -1 });
ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: (s) => gsap.to('.marquee__track', { skewX: gsap.utils.clamp(-8, 8, s.getVelocity() / -300), duration: .4, overwrite: 'auto' }) });

// manifesto: words light up with scroll
const ms = new SplitText('#manifesto', { type: 'words', wordsClass: 'w' });
gsap.to(ms.words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top 75%', end: 'bottom 45%', scrub: true } });

// section titles: masked line reveal
$$('.sec-title').forEach((h) => {
  const s = new SplitText(h.querySelectorAll('.split'), { type: 'chars' });
  gsap.from(s.chars, { yPercent: 110, autoAlpha: 0, rotate: 4, stagger: .02, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
});

// cards & images rise
$$('.house, .weekly, .poster, .masonry img, .breakfast__body > *, .merch__body > p, .merch__body > .btn, .visit__cols > div, .find__sub').forEach((el, i) => {
  gsap.from(el, { y: 70, autoAlpha: 0, duration: 1.2, ease: 'expo.out', delay: (i % 4) * .06, scrollTrigger: { trigger: el, start: 'top 90%' } });
});
$$('.house__media img').forEach((img) => gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.house'), scrub: true } }));
$$('.parallax img').forEach((img) => gsap.fromTo(img, { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, scrub: true } }));
gsap.fromTo('.merch__bg img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.merch', scrub: true } });
gsap.from('.footer__big', { yPercent: 60, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
gsap.fromTo('.find__frame', { clipPath: 'inset(10% 6% 10% 6% round 34px)' }, { clipPath: 'inset(0% 0% 0% 0% round 34px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.find__frame', start: 'top 88%' } });
gsap.from('.find__panel', { y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', delay: .35, scrollTrigger: { trigger: '.find__frame', start: 'top 80%' } });

// reels: pinned horizontal scroll (desktop) / free swipe (mobile)
const reels = $('#reels');
ScrollTrigger.matchMedia({
  '(min-width: 981px)': () => {
    const dist = () => reels.scrollWidth - (innerWidth - reels.getBoundingClientRect().left) + 40;
    const tw = gsap.to(reels, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.inside', start: 'top top', end: () => '+=' + dist(), pin: '.inside__pin', scrub: 1, invalidateOnRefresh: true } });
    $$('.reel', reels).forEach((r) => gsap.from(r, { rotate: 4, scale: .9, ease: 'none', scrollTrigger: { trigger: r, containerAnimation: tw, start: 'left right', end: 'center center', scrub: true } }));
  },
  '(max-width: 980px)': () => { reels.style.overflowX = 'auto'; reels.style.scrollSnapType = 'x mandatory'; reels.style.width = '100%'; },
});
// lazy autoplay videos in view
const vio = new IntersectionObserver((es) => es.forEach(({ target: v, isIntersecting }) => {
  if (isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
}), { threshold: .25 });
$$('video[data-src]').forEach((v) => vio.observe(v));

/* ---------------- Ladies Night: next date in Amsterdam time */
(function nextLadies() {
  const el = $('#next-ladies'); if (!el) return;
  let ams;
  try { ams = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })); } catch (e) { ams = new Date(); }
  const diff = (3 - ams.getDay() + 7) % 7;               // 3 = Wednesday
  if (diff === 0) { el.textContent = 'Tonight at Marnixstraat 333'; el.classList.add('is-tonight'); return; }
  const next = new Date(ams); next.setDate(ams.getDate() + diff);
  const label = next.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  el.textContent = `Next one: ${label} · ${diff === 1 ? 'tomorrow' : `in ${diff} days`}`;
})();

/* ---------------- lightbox (reels + gallery) */
const lb = $('#lb'), lbMedia = $('#lb-media'), lbCap = $('#lb-cap'), lbIg = $('#lb-ig'), lbCount = $('#lb-count');
const groups = {
  reels: $$('.reel').map((f) => { const v = $('video', f); return { type: 'video', src: v.dataset.src, poster: v.getAttribute('poster'), cap: $('figcaption', f).textContent, ig: `https://www.instagram.com/p/${f.dataset.ig}/`, igTxt: 'Watch on Instagram ↗' }; }),
  gallery: $$('#masonry img').map((i) => { const code = i.getAttribute('src').split('/').pop().replace('.jpg', ''); return { type: 'img', src: i.getAttribute('src'), cap: i.alt, ig: `https://www.instagram.com/p/${code}/`, igTxt: 'View on Instagram ↗' }; }),
};
let lbGroup = 'gallery', lbIdx = 0, lastFocus = null;
function lbRender(dir = 0) {
  const it = groups[lbGroup][lbIdx];
  const el = it.type === 'video'
    ? Object.assign(document.createElement('video'), { src: it.src, poster: it.poster, muted: true, loop: true, autoplay: true, playsInline: true })
    : Object.assign(document.createElement('img'), { src: it.src, alt: it.cap });
  if (it.type === 'video') { el.setAttribute('playsinline', ''); el.setAttribute('muted', ''); }
  lbMedia.replaceChildren(el);
  lbCap.textContent = it.cap; lbIg.href = it.ig; lbIg.textContent = it.igTxt;
  lbCount.textContent = `${String(lbIdx + 1).padStart(2, '0')} / ${String(groups[lbGroup].length).padStart(2, '0')}`;
  if (dir) gsap.fromTo(el, { x: dir * 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .7, ease: 'expo.out' });
  if (it.type === 'video') el.play().catch(() => {});
}
function lbOpen(group, i) {
  lbGroup = group; lbIdx = i; lastFocus = document.activeElement;
  lb.hidden = false; lbRender();
  lenis ? lenis.stop() : (document.documentElement.style.overflow = 'hidden');
  gsap.fromTo(lb, { autoAlpha: 0 }, { autoAlpha: 1, duration: .45, ease: 'power2.out' });
  gsap.fromTo('.lb__stage', { y: 40, scale: .94 }, { y: 0, scale: 1, duration: .9, ease: 'expo.out' });
  $('.lb__close').focus();
}
function lbClose() {
  gsap.to(lb, { autoAlpha: 0, duration: .35, ease: 'power2.in', onComplete: () => {
    lb.hidden = true; lbMedia.replaceChildren();
    lenis ? lenis.start() : (document.documentElement.style.overflow = '');
    lastFocus && lastFocus.focus({ preventScroll: true });
  } });
}
function lbStep(d) { const n = groups[lbGroup].length; lbIdx = (lbIdx + d + n) % n; lbRender(d); }
$$('.reel').forEach((f, i) => {
  f.addEventListener('click', () => lbOpen('reels', i));
  f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen('reels', i); } });
});
$$('#masonry img').forEach((img, i) => {
  img.addEventListener('click', () => lbOpen('gallery', i));
  img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen('gallery', i); } });
});
$$('[data-close]', lb).forEach((b) => b.addEventListener('click', lbClose));
$('.lb__nav--prev').addEventListener('click', () => lbStep(-1));
$('.lb__nav--next').addEventListener('click', () => lbStep(1));
addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') lbClose();
  else if (e.key === 'ArrowRight') lbStep(1);
  else if (e.key === 'ArrowLeft') lbStep(-1);
  else if (e.key === 'Tab') {                                    // keep focus inside the dialog
    const f = $$('button, a[href]', lb).filter((x) => x.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
let sx = null;
lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
lb.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 50 && e.pointerType !== 'mouse') lbStep(e.clientX < sx ? 1 : -1); sx = null; });

/* ---------------- FIND THE HOUSE: branded MapLibre map with logo pins */
const HOUSES = {
  marnix: { name: 'Marnixstraat 333', tag: 'Flagship', ll: [4.8761179, 52.3726966], cam: { zoom: 17.1, pitch: 62, bearing: -32 },
    dir: 'https://www.google.com/maps/dir/?api=1&destination=Marnixstraat+333,+1016+TC+Amsterdam' },
  oude: { name: 'Oudebrugsteeg 26', tag: 'Old centre', ll: [4.8959932, 52.3759804], cam: { zoom: 17.4, pitch: 60, bearing: 28 },
    dir: 'https://www.google.com/maps/dir/?api=1&destination=Oudebrugsteeg+26,+1012+JP+Amsterdam' },
};
const LANDMARKS = [['Dam Square', [4.892635, 52.373095], 'left'], ['Centraal Station', [4.900541, 52.378901], 'right']];
const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const ML = 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min';
const mapEl = $('#map'), dirLink = $('#dir-link');
let map = null, mapReady = false, findInView = false, pendingFly = null, introDone = false, mapVisible = false;
const wide = () => innerWidth > 980;

function arc(a, b, k = .2, n = 90) {                     // gentle curved route between the two houses
  const kx = Math.cos(52.374 * Math.PI / 180);
  const ax = a[0] * kx, bx = b[0] * kx, mx = (ax + bx) / 2, my = (a[1] + b[1]) / 2, dx = bx - ax, dy = b[1] - a[1];
  const cx = mx - dy * k, cy = my + dx * k, pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([(u * u * ax + 2 * u * t * cx + t * t * bx) / kx, u * u * a[1] + 2 * u * t * cy + t * t * b[1]]); }
  return pts;
}
const ROUTE = arc(HOUSES.marnix.ll, HOUSES.oude.ll);

function loadMapLib() {
  return new Promise((res, rej) => {
    if (window.maplibregl) return res();
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ML + '.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = ML + '.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
}

function brand(m) {
  const P = (id, k, v) => { try { m.setPaintProperty(id, k, v); } catch (e) {} };
  const hide = (id) => { try { m.setLayoutProperty(id, 'visibility', 'none'); } catch (e) {} };
  for (const { id, type } of m.getStyle().layers) {
    if (type === 'background') P(id, 'background-color', '#040A1C');
    else if (type === 'fill') {
      if (id === 'water') P(id, 'fill-color', '#0B2270');
      else if (id === 'water_shadow') P(id, 'fill-color', '#06123F');
      else if (id.startsWith('building')) hide(id);
      else if (/park|landcover/.test(id)) P(id, 'fill-color', '#061336');
      else P(id, 'fill-color', '#050D27');
    } else if (type === 'line') {
      if (id === 'waterway') P(id, 'line-color', '#0B2270');
      else if (id.startsWith('boundary')) P(id, 'line-color', 'rgba(154,166,200,.2)');
      else if (/rail/.test(id)) P(id, 'line-color', 'rgba(154,166,200,.22)');
      else if (/_case/.test(id)) P(id, 'line-color', '#040A1C');
      else if (/path/.test(id)) P(id, 'line-color', 'rgba(110,140,230,.22)');
      else if (/(mot|trunk|pri)/.test(id)) P(id, 'line-color', '#2C5BE0');
      else if (/sec/.test(id)) P(id, 'line-color', '#1F44B0');
      else if (/aeroway/.test(id)) P(id, 'line-color', '#0D1B4A');
      else P(id, 'line-color', '#183488');
    } else if (type === 'symbol') {
      if (/housenumber|poi_stadium|place_city|place_capital|place_country|place_state|place_continent/.test(id)) { hide(id); continue; }
      P(id, 'text-color', /^place_/.test(id) ? '#C9D2EE' : /water/.test(id) ? '#6E8CE6' : '#7F8DB8');
      P(id, 'text-halo-color', '#040A1C');
    }
  }
}

function addLayers(m) {
  const firstSymbol = m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  const H = ['coalesce', ['get', 'height'], ['get', 'render_height'], 12];
  m.addLayer({ id: 'b3d', type: 'fill-extrusion', source: 'protomaps', 'source-layer': 'buildings', minzoom: 13.5,
    filter: ['>=', ['coalesce', ['get', 'layer'], 0], 0],
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], H, 0, '#081236', 18, '#0C1C52', 40, '#132A78'],
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 15, H],
      'fill-extrusion-base': ['coalesce', ['get', 'min_height'], ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': .94, 'fill-extrusion-vertical-gradient': true,
    } }, firstSymbol);
  const pts = { type: 'FeatureCollection', features: Object.entries(HOUSES).map(([k, h]) => ({ type: 'Feature', properties: { k }, geometry: { type: 'Point', coordinates: h.ll } })) };
  m.addSource('houses', { type: 'geojson', data: pts });
  m.addLayer({ id: 'house-glow', type: 'circle', source: 'houses', paint: {
    'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 12, 26, 18, 900], 'circle-color': '#E3B84F',
    'circle-opacity': .2, 'circle-blur': 1, 'circle-pitch-alignment': 'map' } }, 'b3d');
  m.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ROUTE } } });
  m.addLayer({ id: 'route-glow', type: 'line', source: 'route', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#E3B84F', 'line-width': 12, 'line-blur': 10, 'line-opacity': .35 } }, firstSymbol);
  m.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#F6D98B', 'line-width': 2.6, 'line-dasharray': [0, 4, 3] } }, firstSymbol);
  m.setLight({ anchor: 'viewport', color: '#7F9BFF', intensity: .28, position: [1.4, 200, 35] });
  try { m.setSky({ 'sky-color': '#050B1F', 'horizon-color': '#0E2A8A', 'fog-color': '#050B1F', 'sky-horizon-blend': .6, 'horizon-fog-blend': .7, 'fog-ground-blend': .55 }); } catch (e) {}
}

// marching gold dashes along the route (only while the map is on screen)
const DASH = [[0, 4, 3], [.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, .5], [3, 4, 0], [0, .5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, .5]];
let dashStep = -1;
function march(ts) {
  if (!mapVisible || reduce) return;
  const s = Math.floor(ts / 70) % DASH.length;
  if (s !== dashStep && map.getLayer('route')) { map.setPaintProperty('route', 'line-dasharray', DASH[s]); dashStep = s; }
  requestAnimationFrame(march);
}

function addMarkers(ml) {
  for (const [k, h] of Object.entries(HOUSES)) {
    const el = document.createElement('div');
    el.className = 'pin'; el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${h.name}, ${h.tag}. Fly to this house`);
    el.innerHTML = `<div class="pin__in"><span class="pin__pulse"></span><span class="pin__pulse pin__pulse--2"></span><span class="pin__badge"><i></i></span><span class="pin__stem"></span><span class="pin__dot"></span><span class="pin__label"><b>${h.tag}</b>${h.name}</span></div>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); fly(k); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fly(k); } });
    h.el = el;
    new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat(h.ll).addTo(map);
  }
  for (const [name, ll, side] of LANDMARKS) {
    const el = document.createElement('div'); el.className = 'mark' + (side === 'right' ? ' mark--r' : ''); el.textContent = name;
    new ml.Marker({ element: el, anchor: side }).setLngLat(ll).addTo(map);
  }
  const mid = ROUTE[Math.floor(ROUTE.length / 2)], km = document.createElement('div');
  km.className = 'mark mark--km'; km.textContent = '1.4 km';
  new ml.Marker({ element: km, anchor: 'bottom', offset: [0, -8] }).setLngLat(mid).addTo(map);
}

function bothBounds() {
  const lngs = ROUTE.map((p) => p[0]), lats = ROUTE.map((p) => p[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}
function idleOrbit() {                                    // slow cinematic drift until someone touches the map
  if (reduce || !map) return;
  map.easeTo({ bearing: map.getBearing() + 24, duration: 40000, easing: (t) => t });
}
function fly(k) {
  pendingFly = null;
  if (k !== 'both') {
    $$('.spot').forEach((b) => b.classList.toggle('is-active', b.dataset.fly === k));
    Object.entries(HOUSES).forEach(([key, h]) => h.el && h.el.classList.toggle('is-active', key === k));
  }
  if (!mapReady) { pendingFly = k; return; }
  if (k === 'both') {
    map.fitBounds(bothBounds(), { padding: wide() ? { top: 150, bottom: 110, left: 460, right: 170 } : { top: 140, bottom: 40, left: 72, right: 72 },
      pitch: 52, bearing: -14, duration: reduce ? 0 : 2800, essential: true });
    map.once('moveend', idleOrbit);
    return;
  }
  const h = HOUSES[k];
  dirLink.href = h.dir;
  map.flyTo({ center: h.ll, ...h.cam, offset: wide() ? [170, 70] : [0, 60], duration: reduce ? 0 : 3200, curve: 1.5, essential: true });
}
$$('[data-fly]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.fly;
  if (b.tagName === 'A') { pendingFly = k; setTimeout(() => mapReady && fly(k), lenis ? 1100 : 700); }  // scroll to the map, then fly
  else fly(k);
}));

async function initMap() {
  try { await loadMapLib(); } catch (e) { return; }
  const ml = window.maplibregl;
  try {
    map = new ml.Map({
      container: mapEl, style: STYLE, center: [4.8862, 52.3744], zoom: 13.2, pitch: 0, bearing: 0,
      cooperativeGestures: true, attributionControl: { compact: true }, minZoom: 11.5, maxZoom: 18.6,
      maxBounds: [[4.72, 52.29], [5.06, 52.45]], pixelRatio: Math.min(devicePixelRatio, 2), fadeDuration: 0,
    });
  } catch (e) { return; }                                   // no WebGL: the panel + directions still work
  map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right');
  map.on('style.load', () => { brand(map); addLayers(map); });
  map.on('load', () => {
    mapReady = true; mapEl.classList.add('is-ready'); addMarkers(ml);
    if (mapVisible) requestAnimationFrame(march);
    if (pendingFly) fly(pendingFly);
    else if (findInView) runIntro();
  });
  ['mousedown', 'touchstart', 'wheel'].forEach((ev) => map.on(ev, () => map.stop()));
}
function runIntro() {
  if (introDone || !mapReady) return;
  introDone = true;
  if (pendingFly) return fly(pendingFly);
  fly('both');
  HOUSES.marnix.el.classList.add('is-active');
}
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); initMap(); } }, { rootMargin: '900px 0px' }).observe($('#find'));
new IntersectionObserver(([e]) => { const was = mapVisible; mapVisible = e.isIntersecting; if (mapVisible && !was && mapReady) requestAnimationFrame(march); }).observe(mapEl);
ScrollTrigger.create({ trigger: '.find__frame', start: 'top 70%', once: true, onEnter: () => { findInView = true; runIntro(); } });

/* ---------------- cursor (with labels), magnetic buttons, tilt */
if (!isTouch && !reduce) {
  const c = $('#cursor'), cl = $('#cursor-label');
  const qx = gsap.quickTo(c, 'x', { duration: .35, ease: 'power3' }), qy = gsap.quickTo(c, 'y', { duration: .35, ease: 'power3' });
  addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); });
  $$('a, button, .poster').forEach((el) => { el.addEventListener('pointerenter', () => c.classList.add('is-hover')); el.addEventListener('pointerleave', () => c.classList.remove('is-hover')); });
  $$('[data-cursor]').forEach((el) => {
    el.addEventListener('pointerenter', () => { cl.textContent = el.dataset.cursor; c.classList.add('has-label'); });
    el.addEventListener('pointerleave', () => c.classList.remove('has-label'));
  });
  $$('.magnetic').forEach((b) => {
    const mx = gsap.quickTo(b, 'x', { duration: .5, ease: 'elastic.out(1,.4)' }), my = gsap.quickTo(b, 'y', { duration: .5, ease: 'elastic.out(1,.4)' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .4); });
    b.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
  $$('.tilt').forEach((el) => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'power3' }), ry = gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'power3' });
    gsap.set(el, { transformPerspective: 1100 });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 6); rx(-((e.clientY - r.top) / r.height - .5) * 6); });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ---------------- mobile menu */
function closeMenu() { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); }
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-hidden', String(!open));
  open ? lenis && lenis.stop() : lenis && lenis.start();
});

window.__tdh = { lenis, uniforms, vid, get map() { return map; }, fly };
