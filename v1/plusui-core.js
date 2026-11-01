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


// plusui-core — the template's own page facts (blogID, postID, blogUrl, isPost, ...)
//
// Blogger renders the theme's globals as one line of top-level `const` inside a classic
// <script> (right next to the license key). Top-level const/let live in the *global
// lexical environment*, which is NOT `window` — so `window.blogID` is always undefined
// on the real blog. Reading them through `window` is what silently killed the view
// counter, the chapter prev/next and the "exclude the post you are reading" filter,
// because the local harness happened to declare them as `window.blogID = ...`.
// These accessors read the identifiers themselves, keep a DOM fallback, and never
// assume anything is on `window`.
(function () {
  'use strict';
  window.PU = window.PU || {};

  // `typeof X` is safe for an undeclared name; it only throws for a const still in its
  // temporal dead zone (a script that runs before the template's own declaration).
  var LEX = {
    blogUrl:       function () { return typeof blogUrl       !== 'undefined' ? blogUrl       : ''; },
    blogID:        function () { return typeof blogID        !== 'undefined' ? blogID        : ''; },
    postID:        function () { return typeof postID        !== 'undefined' ? postID        : ''; },
    blogTitle:     function () { return typeof blogTitle     !== 'undefined' ? blogTitle     : ''; },
    analyticsID:   function () { return typeof analyticsID   !== 'undefined' ? analyticsID   : ''; },
    caPubAdsense:  function () { return typeof caPubAdsense  !== 'undefined' ? caPubAdsense  : ''; },
    isPreview:     function () { return typeof isPreview     !== 'undefined' ? isPreview     : ''; },
    isHomepage:    function () { return typeof isHomepage    !== 'undefined' ? isHomepage    : ''; },
    isSearch:      function () { return typeof isSearch      !== 'undefined' ? isSearch      : ''; },
    isPost:        function () { return typeof isPost        !== 'undefined' ? isPost        : ''; },
    isPage:        function () { return typeof isPage        !== 'undefined' ? isPage        : ''; },
    isSingleItem:  function () { return typeof isSingleItem  !== 'undefined' ? isSingleItem  : ''; },
    isMobile:      function () { return typeof isMobile      !== 'undefined' ? isMobile      : ''; },
    isPrivateBlog: function () { return typeof isPrivateBlog !== 'undefined' ? isPrivateBlog : ''; }
  };

  function str(name) {
    var v = '';
    if (LEX[name]) { try { v = LEX[name](); } catch (e) { v = ''; } }
    if (v === '' || v === null || v === undefined) v = window[name];   // var-style global
    return (v === undefined || v === null) ? '' : String(v);
  }

  // The template emits e.g. const postID='false' on views that have no post.
  function id(name) {
    var v = str(name);
    return (v === 'false' || v === 'null' || v === '0') ? '' : v;
  }

  // Last resort: the admin shortcuts the theme prints on every view contain both ids,
  // e.g. https://www.blogger.com/blog/post/edit/<blogID>/<postID>
  function fromMarkup(what) {
    var nodes = document.querySelectorAll(".blog-admin a, .qeBtn a, a[href*='blogger.com/blog/']");
    for (var i = 0; i < nodes.length; i++) {
      var href = nodes[i].getAttribute('href') || '';
      var both = href.match(/blogger\.com\/blog\/(?:post|page)\/edit\/(\d+)\/(\d+)/);
      if (both) return what === 'postID' ? both[2] : both[1];
      if (what === 'blogID') {
        var one = href.match(/blogger\.com\/blog\/(?:settings|comments|posts|pages|stats)\/(?:week\/)?(\d+)/);
        if (one) return one[1];
      }
    }
    return '';
  }

  function global(what) {
    return id(what) || fromMarkup(what);
  }

  PU.env = {
    str: str,
    flag: function (name) { return str(name) === 'true'; },
    blogID: function () { return global('blogID'); },
    postID: function () { return global('postID'); },
    // The id the Blogger feed uses for an entry, or null when there is no current post.
    entryId: function () {
      var b = PU.env.blogID(), p = PU.env.postID();
      return (b && p) ? 'blog-' + b + '.post-' + p : null;
    }
  };
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
