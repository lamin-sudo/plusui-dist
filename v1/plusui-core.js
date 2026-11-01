/* plusui-core v1 - built 2026-11-01 - dz-gsmdz.blogspot.com */
// plusui-core — storage helpers
// Replaces the cookie/localStorage parts of idnblogpro's AdditionalJavascript.min.js.
// Keys are unchanged on purpose (webMode, webTheme) so existing visitors keep their choice.
window.PU = window.PU || {};
PU.store = (function () {
  'use strict';

  function safeGet(store, key) {
    try { return store.getItem(key); } catch (e) { return null; }
  }
  function safeSet(store, key, value) {
    try { store.setItem(key, value); return true; } catch (e) { return false; }
  }
  function safeDel(store, key) {
    try { store.removeItem(key); } catch (e) { /* private mode / quota */ }
  }

  var local = {
    get: function (k) { return safeGet(localStorage, k); },
    set: function (k, v) { return safeSet(localStorage, k, v); },
    del: function (k) { safeDel(localStorage, k); }
  };
  var session = {
    get: function (k) { return safeGet(sessionStorage, k); },
    set: function (k, v) { return safeSet(sessionStorage, k, v); },
    del: function (k) { safeDel(sessionStorage, k); }
  };
  var cookie = {
    get: function (name) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    },
    // SameSite=Lax by default: the old code set no SameSite and no Secure at all.
    set: function (name, value, opts) {
      var o = Object.assign({ path: '/', 'max-age': 2592000, SameSite: 'Lax' }, opts || {});
      if (window.isSecureContext) o.Secure = true;
      var out = encodeURIComponent(name) + '=' + encodeURIComponent(value);
      Object.keys(o).forEach(function (k) { out += '; ' + k + (o[k] === true ? '' : '=' + o[k]); });
      document.cookie = out;
    },
    del: function (name) { cookie.set(name, '', { 'max-age': -1 }); }
  };

  return { local: local, session: session, cookie: cookie };
})();


// plusui-core — light / dark / system mode + theme colour
// Drop-in replacement for modeL / modeD / modeS / webTheme in AdditionalJavascript.min.js.
// Behaviour verified against the live site (see notes below), not guessed:
//   modeD()  -> body: ... themeN drK
//   modeL()  -> body: ... themeN lgT
//   modeS()  -> body: ... themeN syD drK   (syD kept so the "System Default" row stays highlighted)
//   webTheme -> swaps only the themeN class
// Fixes over the original: modeS() now restores the saved themeN, the media-query listener
// uses addEventListener with a Safari-safe fallback, and no scroll listener is installed here.
(function () {
  'use strict';

  var MODE_KEY = 'webMode';
  var THEME_KEY = 'webTheme';
  var THEME_RE = /^theme\d{1,2}$/;

  function body() { return document.getElementById('mainCont') || document.body; }
  function store() { return PU.store; }

  var pendingInit = false;
  function whenBody(fn) {
    // The bundle is loaded in <head>, so document.body may not exist yet.
    if (body()) { fn(); return; }
    pendingInit = true;
    var run = function () {
      if (!pendingInit) return;
      pendingInit = false;
      fn();
    };
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', run, { once: true, passive: true });
    }
    document.onreadystatechange = function () {
      if (document.readyState !== 'loading') run();
    };
  }

  function prefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function storedTheme() {
    var t = store().local.get(THEME_KEY);
    return THEME_RE.test(t || '') ? t : 'theme0';
  }
  function syncMetaColor() {
    // themeColor() is defined by the template: it copies a CSS custom property into
    // the three browser-chrome metas. Must run AFTER the class swap.
    if (typeof window.themeColor === 'function') { try { window.themeColor('themeC'); } catch (e) {} }
  }
  function apply(mode, theme) {
    var el = body();
    if (!el) { return null; }
    var eff = mode === 'syD' ? (prefersDark() ? 'drK' : 'lgT') : (mode === 'drK' ? 'drK' : 'lgT');
    var classes = el.className.split(/\s+/).filter(function (c) {
      return c && c !== 'drK' && c !== 'lgT' && c !== 'syD' && !THEME_RE.test(c);
    });
    classes.push(theme, eff);
    if (mode === 'syD') classes.push('syD');
    el.className = classes.join(' ');
    syncMetaColor();
    return eff;
  }

  function setMode(mode) {
    store().local.set(MODE_KEY, mode);
    if (typeof window.vibRate === 'function') { try { window.vibRate(50); } catch (e) {} }
    apply(mode, storedTheme());
  }

  window.modeL = function () { setMode('lgT'); };
  window.modeD = function () { setMode('drK'); };
  window.modeS = function () { setMode('syD'); };

  window.webTheme = function (n) {
    var theme = THEME_RE.test(String(n)) ? String(n) : 'theme0';
    store().local.set(THEME_KEY, theme);
    apply(store().local.get(MODE_KEY) || 'lgT', theme);
  };

  // Apply the stored choice as early as possible; if we are still in <head>,
  // the same call is retried the moment the body exists.
  whenBody(function () { apply(store().local.get(MODE_KEY) || 'lgT', storedTheme()); });

  // Follow the OS live while the visitor is on "System Default".
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      if (store().local.get(MODE_KEY) === 'syD') apply('syD', storedTheme());
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);   // Safari < 14
  }
})();


// plusui-core — back-to-top button, scroll ring, reading-progress bar
// Replaces topScroll() from AdditionalJavascript.min.js and the hand-written progress
// listener that used to sit at the end of <body>.
// Fixes over the original: one passive listener instead of two blocking ones, a single
// rAF-throttled read per frame (the old code forced layout on every scroll event),
// null-safe element lookup, and resize/load handling.
// Elements are resolved lazily because this bundle is loaded in <head>, before the
// body exists.
(function () {
  'use strict';

  var bar, top, ring, resolved = false;
  var ticking = false;
  var total = 0;

  function resolve() {
    if (resolved) return true;
    if (!document.body) return false;
    bar = document.getElementById('Progress-bar');
    top = document.getElementById('backTop');
    ring = top ? top.querySelector('.scrollProgress') : null;
    resolved = true;
    return true;
  }

  function measure() {
    if (!resolve()) return;
    var doc = document.documentElement;
    total = Math.max(
      document.body.scrollHeight, document.body.offsetHeight,
      doc.clientHeight, doc.scrollHeight, doc.offsetHeight
    ) - window.innerHeight;
  }

  function paint() {
    ticking = false;
    if (!resolve()) return;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var pct = total > 0 ? Math.min(100, Math.max(0, (y / total) * 100)) : 0;

    if (bar) bar.style.width = pct + '%';
    if (top) {
      var show = y > 320;
      if (show && top.className.indexOf('vsbl') === -1) top.classList.add('vsbl');
      else if (!show && top.className.indexOf('vsbl') !== -1) top.classList.remove('vsbl');
    }
    // r=15.92 makes the ring circumference ~100, so the offset is directly in percent.
    if (ring) ring.style.strokeDashoffset = String(100 - pct);
  }

  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
  }

  window.topScroll = function () { measure(); paint(); };

  measure();
  paint();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  window.addEventListener('load', function () { measure(); onScroll(); }, { passive: true });
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function () { measure(); onScroll(); }, { once: true, passive: true });
  }
})();
