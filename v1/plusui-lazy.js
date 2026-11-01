/* plusui-lazy v1 - built 2026-11-01 - dz-gsmdz.blogspot.com */
// plusui-lazy — owner settings read from the Layout
//
// The blog owner edits a single HTML widget named "Plus UI Settings" in Blogger -> Layout.
// Its content is lines of `key: value` (everything after a `#` is a comment). Nothing here
// needs the theme HTML, and the widget is only ever shown to him, never to visitors.
//
// This module must stay FIRST in the lazy bundle: related/download/consent/adsense/views read
// PU.cfg while they initialise, and this bundle is deferred, so the widget is already parsed.
//
// Two ways to control the same things, deliberately:
//   * Theme Designer (Customise) writes the values into the skin's `$(...)` variables, which
//     become the CSS custom properties listed below.
//   * This widget writes the same custom properties inline on <html>, which beats the
//     stylesheet, and also drives the behaviour keys that CSS cannot express.
(function () {
  'use strict';

  window.PU = window.PU || {};
  var cfg = PU.cfg = PU.cfg || {};

  // key -> how to validate/normalise it. Anything not listed is ignored with a warning.
  var INT = function (min, max) {
    return function (v) {
      var n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
      if (isNaN(n)) return null;
      return Math.min(max, Math.max(min, n));
    };
  };
  var LEN = function (v) {
    v = String(v).trim();
    return (/^-?(?:\d+\.?\d*|\.\d+)(px|%|em|rem|vw|vh|vmin|vmax)$/.test(v) || v === '0') ? v : null;
  };
  var BOOL = function (v) {
    v = String(v).trim().toLowerCase();
    if (v === 'true' || v === 'yes' || v === 'on' || v === '1') return true;
    if (v === 'false' || v === 'no' || v === 'off' || v === '0') return false;
    return null;
  };
  var FONT = function (v) {
    // Family names only; Blogger/Google font names never contain anything else we allow.
    v = String(v).trim().replace(/[;,]/g, ' ').replace(/\s+/g, ' ');
    return /^[A-Za-z0-9 ]{1,40}$/.test(v) ? v : null;
  };

  var CHOICE = function (allowed) {
    return function (v) {
      v = String(v).trim().toLowerCase();
      return allowed.indexOf(v) >= 0 ? v : null;
    };
  };

  var KEYS = {
    // Mobile drawer (the panel that slides in from the side)
    mobNavWidth:   { css: '--mobNavW',   check: LEN,   dflt: null },
    mobNavMax:     { css: '--mobNavMax', check: LEN,   dflt: null },
    mobNavInset:   { css: '--mobNavPad', check: LEN,   dflt: null },
    mobNavFont:    { css: '--mobNavFS',  check: LEN,   dflt: null },
    mobNavTopPad:  { css: '--mobNavTop', check: LEN,   dflt: null },
    // Bottom bar (the fixed row of icons at the foot of the screen)
    mobBarHeight:  { css: '--mobBarH',     check: LEN, dflt: null },
    mobBarInset:   { css: '--mobBarPad',   check: LEN, dflt: null },
    mobBarIcon:    { css: '--mobBarIcon',  check: LEN, dflt: null },
    mobBarFont:    { css: '--mobBarFS',    check: LEN, dflt: null },
    mobBarVisible: { css: null,            check: BOOL, dflt: true },
    // Behaviour
    relatedCount:     { css: null, check: INT(0, 20),   dflt: null },
    downloadSeconds:  { css: null, check: INT(0, 600),  dflt: null },
    rememberMinutes:  { css: null, check: INT(0, 1440), dflt: null },
    consentDays:      { css: null, check: INT(1, 3650), dflt: null },
    backToTopAfter:   { css: null, check: INT(0, 100000), dflt: 320 },
    showViews:        { css: null, check: BOOL, dflt: true },
    adBlockNotice:    { css: null, check: BOOL, dflt: true },
    // auto = wrap every binary link in a post; manual = only the cards he writes himself;
    // off = plain links as before.
    downloadCards:    { css: null, check: CHOICE(['auto', 'manual', 'off']), dflt: 'auto' },
    // Fonts (each key is one family name; the generic fallback and the Google request
    // are added for you)
    fontHeading: { css: '--fontH', check: FONT, dflt: null, google: true,  fallback: 'sans-serif' },
    fontBody:    { css: '--fontB', check: FONT, dflt: null, google: true,  fallback: 'sans-serif', also: ['--fontBa'] },
    fontMono:    { css: '--fontC', check: FONT, dflt: null, google: true,  fallback: 'monospace' },
    loadFonts:   { css: null,      check: BOOL, dflt: true }
  };

  var root = document.documentElement;
  var wanted = [];

  // The skin declares its custom properties on
  //   :root, :root .lgT:not(.drK), :root .theme0:not(.drK){--mobNavW: ...; ...}
  // and those theme classes sit on <body> (Blogger + mode.js put them there), so <body>
  // gets its OWN copy of every property. A value inherited from <html> loses to that,
  // no matter how it is set. Writing the override on <body> as well is what actually
  // reaches the elements - measured, not assumed.
  function setProp(name, value) {
    root.style.setProperty(name, value);
    if (document.body) document.body.style.setProperty(name, value);
  }

  function apply(name, value) {
    var spec = KEYS[name];
    cfg[name] = value;
    if (spec.css && value !== null) {
      var stack = spec.fallback ? value + ',' + spec.fallback : String(value);
      setProp(spec.css, stack);
      (spec.also || []).forEach(function (extra) { setProp(extra, stack); });
      if (spec.google) wanted.push(String(value));
    }
  }

  function parse(text) {
    var lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/#.*$/, '').trim();
      if (!line || line.indexOf(':') === -1) continue;
      var name = line.slice(0, line.indexOf(':')).trim();
      var raw = line.slice(line.indexOf(':') + 1).trim();
      var spec = KEYS[name];
      if (!spec) {
        if (window.console && console.warn) console.warn('[plusui] settings: unknown key "' + name + '"');
        continue;
      }
      var value = spec.check(raw);
      if (value === null) {
        if (window.console && console.warn) console.warn('[plusui] settings: bad value for "' + name + '": ' + raw);
        continue;
      }
      apply(name, value);
    }
  }

  function loadFonts() {
    if (!wanted.length || cfg.loadFonts === false) return;
    // Families the page already asks for must not be requested twice.
    var already = '';
    Array.prototype.forEach.call(document.querySelectorAll('link[href*="fonts.googleapis.com"]'), function (l) {
      already += l.href;
    });
    var add = [];
    wanted.forEach(function (fam) {
      if (already.indexOf('family=' + encodeURIComponent(fam)) === -1 && already.indexOf('family=' + fam) === -1) {
        add.push('family=' + encodeURIComponent(fam) + ':ital,wght@0,400;0,500;0,600;0,700;1,400');
      }
    });
    if (!add.length) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.setAttribute('data-pu-fonts', '1');
    l.href = 'https://fonts.googleapis.com/css2?' + add.join('&') + '&display=swap';
    document.head.appendChild(l);
  }

  function hideBar(hide) {
    if (!hide) return;
    var st = document.getElementById('pu-bar-off');
    if (st) return;
    st = document.createElement('style');
    st.id = 'pu-bar-off';
    // The footer reserves space for the bar, so remove that reservation too.
    st.textContent = '.mobMn{display:none!important}' +
      'body .blogCont{padding-bottom:0!important}' +
      '.bD:not(.MN-4) .mobMn:not(.no-items) + footer{padding-bottom:0!important}';
    document.head.appendChild(st);
  }

  var host = document.getElementById('plusui-settings');
  if (host) {
    parse(host.textContent);
    loadFonts();
    if (cfg.mobBarVisible === false) hideBar(true);
  } else if (window.console && console.warn) {
    console.warn('[plusui] settings: the "Plus UI Settings" section is not on this page');
  }

  // Defaults for anything the widget did not set, so consumers never test for undefined.
  Object.keys(KEYS).forEach(function (k) {
    if (cfg[k] === undefined) cfg[k] = KEYS[k].dflt;
  });

  window.puSettings = { raw: parse, values: cfg };
})();


// plusui-lazy — Blogger's admin-only markup (.blog-admin)
//
// The theme hides every admin element with one plain rule inside <b:skin>:
//   .blog-admin, .bD .bmPs, ... , .cusW{display:none}
// and expects Blogger's per-viewer stylesheet to reveal it again:
//   https://www.blogger.com/dyn-css/authorization.css?targetBlogID=<blogID>
// That URL answers with CSS only for a requester who owns the blog, and with 0 bytes
// for everyone else (checked anonymously: 301 -> /dyncss/<blogID>/authorization.css
// -> 200, empty body).
//
// On this template the reveal never happens. The head is closed with the escaped-head
// trick (`<!--[ </head> close ]-->` followed by `<!--<head/><b:if cond='!data:blog.adsenseClientId'>...`),
// and because this blog IS linked to AdSense inside Blogger settings, the `-->` and the
// `</head>` on that line are suppressed. Everything Blogger then injects - the Roboto
// @font-face, the authorization.css <link>, the adsense metas - falls inside that still
// open HTML comment. Verified on the live post page: only two stylesheet links reach the
// DOM (Jost + plusui.css) and the authorization.css href sits in a comment node.
//
// What the owner loses is exactly what he reported: the in-post Quick Edit cluster (the
// gear that opens into New post / All posts / Comments / Stats / Settings / Edit this
// post), the "Edit" badges over post thumbnails, and the #admCk slot.
//
// Re-injecting the same URL restores them, and changes nothing for visitors because the
// response is empty for them. We deliberately do NOT add a local `.blog-admin{display:...}`
// rule: that would hand the admin shortcuts to every reader.
(function () {
  'use strict';

  var ENDPOINT = 'https://www.blogger.com/dyn-css/authorization.css?targetBlogID=';
  var MARK = 'data-pu-admin';

  function inject() {
    if (!window.PU || !PU.env) return;
    if (document.querySelector('link[' + MARK + ']')) return;
    var id = PU.env.blogID();
    if (!/^\d{5,}$/.test(id)) {
      if (window.console && console.warn) console.warn('[plusui] admin css: blogID not found');
      return;
    }
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.setAttribute(MARK, '1');
    // Appended last, so it wins the cascade against the theme's own display:none,
    // exactly the way Blogger places it in a normal theme.
    l.href = ENDPOINT + encodeURIComponent(id);
    (document.head || document.documentElement).appendChild(l);
  }

  // The bundle is deferred, so the template's consts and the .blog-admin markup are
  // already parsed here; the readyState check only covers a template that drops defer.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }

  // Exposed for the harness and for any widget added later.
  window.puAdminCss = inject;
})();


// plusui-lazy — Related Posts
// Replaces RelatedPosts.min.js. Same config object (relatedPostConfig) and the same
// markup/classes the theme CSS expects, so the look does not change.
// Fixed versus the original:
//   * no innerHTML built from post data  -> titles/summaries go through textContent
//     (the old code injected titles into attributes unescaped: broken cards + XSS surface)
//   * correct dates: old code used date.substring(9,10) so the 31st rendered as "3"
//   * the post being read is excluded from its own related list (by postID)
//   * fetch() instead of a JSONP <script> injection
//   * requests numPosts+5 entries so exclusion does not leave a short list
//   * summary decoded with DOMParser (the old regex left entities and nested tags behind)
(function () {
  'use strict';

  var cfg = window.relatedPostConfig;
  if (!cfg) return;

  var host = document.getElementById(cfg.containerId || 'rPst');
  if (!host) return;

  var STYLE = cfg.widgetStyle || 1;
  var C = (window.PU && PU.cfg) || {};      // Layout -> "Plus UI Settings" wins over the widget
  var WANT = (typeof C.relatedCount === 'number') ? C.relatedCount : (parseInt(cfg.numPosts, 10) || 4);
  if (WANT === 0) return;                   // 0 means: no related posts on this blog
  var SUM = parseInt(cfg.summaryLength, 10) || 0;
  var TITLE = (cfg.titleLength && cfg.titleLength !== 'auto') ? parseInt(cfg.titleLength, 10) : 0;
  var MORE = cfg.moreText || 'Read more';
  var THUMB = cfg.thumbnailSize === false ? false : (cfg.thumbnailSize || 300);
  var NOIMG = cfg.noImage || '';
  var NEWTAB = !!cfg.newTabLink;

  function text(html) {
    if (!html) return '';
    return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
  }
  function clip(value, max, ellipsis) {
    var s = String(value || '');
    return (max && s.length > max) ? s.slice(0, max).trim() + (ellipsis ? '\u2026' : '') : s;
  }
  function thumbUrl(entry) {
    if (!THUMB || !entry.media$thumbnail) return NOIMG;
    return entry.media$thumbnail.url
      .replace(/^https?:\/\//, '//')
      .replace(/\/s\d+(-c)?\//, '/s' + THUMB + '/')
      .replace(/=s\d+(-c)?/, '=s' + THUMB);
  }
  function dateAttr(entry) {
    var iso = (entry.published && entry.published.$t) || '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var mon = d.toLocaleString('en-US', { month: 'short' });
    var day = String(d.getDate());          // not substring() -> 31 stays 31
    return mon + ' ' + day + ', ' + d.getFullYear();
  }
  function linkOf(entry) {
    var links = entry.link || [];
    for (var i = 0; i < links.length; i++) if (links[i].rel === 'alternate') return links[i].href;
    return '#';
  }
  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    return node;
  }

  function card(entry) {
    var rawTitle = (entry.title && entry.title.$t) || '';
    var title = clip(rawTitle, TITLE, true);
    var href = linkOf(entry);
    var li = el('li');
    var inner = el('div', STYLE === 1 ? 'iF' : 'i');

    var thumb = el('div', 'pThmb');
    var a = el('a', 'thmb', { href: href, 'aria-label': rawTitle, title: rawTitle });
    var img = el('div', null, { style: 'background-image: url(' + JSON.stringify(thumbUrl(entry)).slice(1, -1) + ')' });
    a.appendChild(img); thumb.appendChild(a); inner.appendChild(thumb);

    if (STYLE === 1) {
      var content = el('div', 'pCtnt');
      var wrap = el('div', 'pInr');
      content.appendChild(wrap); inner.appendChild(content);
      var t1 = el('div', 'iTtl aTtl');
      var l1 = el('a', null, NEWTAB ? { href: href, target: '_blank', rel: 'noopener noreferrer' } : { href: href });
      l1.textContent = title; t1.appendChild(l1); wrap.appendChild(t1);
      addSnippet(wrap, entry); addDate(wrap, entry);
    } else if (STYLE === 2) {
      inner.appendChild(titleBlock(title, href, null));
    } else if (STYLE === 3) {
      inner.appendChild(titleBlock(title, href, { 'data-date': dateAttr(entry), 'data-text': MORE }));
    } else {
      inner.appendChild(titleBlock(title, href, null));
      addSnippet(inner, entry); addDate(inner, entry);
    }
    li.appendChild(inner);
    return li;
  }

  function titleBlock(title, href, extra) {
    var box = el('div', 'iTtl aTtl');
    var attrs = Object.assign({ href: href }, extra || {});
    if (NEWTAB) { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
    var link = el('a', null, attrs);
    link.textContent = title;
    box.appendChild(link);
    return box;
  }
  function addSnippet(parent, entry) {
    if (!SUM || !entry.summary) return;
    var box = el('div', 'pSnpt');
    box.textContent = clip(text(entry.summary.$t), SUM, true);
    parent.appendChild(box);
  }
  function addDate(parent, entry) {
    var d = dateAttr(entry);
    if (!d) return;
    parent.appendChild(el('div', 'pInf pSml', { 'data-date': d }));
  }

  function feedUrl() {
    var labels = (window.labelArray && window.labelArray.length)
      ? window.labelArray
      : null;
    var base = (cfg.homePage || '/').replace(/\/$/, '') + '/feeds/posts/summary';
    if (labels) {
      var label = labels[Math.floor(Math.random() * labels.length)];
      base += '/-/' + encodeURIComponent(label);
    }
    return base + '?alt=json&max-results=' + (WANT + 5) + '&orderby=published';
  }

  function currentPostId() {
    // blogID/postID are top-level const in the template, not window properties;
    // PU.env reads them the way the browser actually exposes them.
    return (window.PU && PU.env) ? PU.env.entryId() : null;
  }

  fetch(feedUrl(), { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('feed ' + r.status); return r.json(); })
    .then(function (data) {
      var entries = (data.feed && data.feed.entry) || [];
      var mine = currentPostId();
      var pick = entries.filter(function (e) {
        return !mine || !e.id || e.id.$t.indexOf(mine) === -1;
      }).slice(0, WANT);
      if (!pick.length) return;

      var wrap = el('div', 'rPst');
      if (cfg.widgetTitle) {
        // widgetTitle is authored in the template (Blogger messages), not visitor data.
        var head = el('div');
        head.innerHTML = cfg.widgetTitle;
        while (head.firstChild) wrap.appendChild(head.firstChild);
      }
      var ul = el('ul', 's-' + STYLE + ' scrlH');
      pick.forEach(function (e) { ul.appendChild(card(e)); });
      wrap.appendChild(ul);

      host.textContent = '';
      host.appendChild(wrap);
      if (typeof cfg.callBack === 'function') { try { cfg.callBack(); } catch (e) {} }
    })
    .catch(function (e) {
      /* no related posts is better than a broken page - but say why once */
      if (window.console && console.warn) console.warn('[plusui] related posts:', e.message);
    });
})();


// plusui-lazy — countdown download box
// Same entry point as the original: download(url, seconds, newTab, containerSelector)
// and the same hooks (.dldMe / .dldPg / .dldRt, .dldAlt / .dldRty), so existing post HTML
// keeps working untouched.
//
// The original was a fake gate: nothing was stored, so F5 restarted the countdown.
// This one remembers per-URL in localStorage for window.downloadBoxConfig.rememberMinutes
// (default 60). Within that window the box is shown already unlocked.
// Behaviour change on purpose: it no longer navigates by itself when the count ends;
// it reveals the button. Set downloadBoxConfig.autoOpen = true to get the old behaviour.
(function () {
  'use strict';

  var PREFIX = 'plusui.dl.';
  var running = {};

  function conf() {
    var c = Object.assign({ rememberMinutes: 60, autoOpen: false }, window.downloadBoxConfig || {});
    // Layout -> "Plus UI Settings" overrides both the wait and how long the unlock lasts,
    // so the number does not have to be re-typed in every post.
    var fromLayout = (window.PU && PU.cfg) ? PU.cfg : null;
    if (fromLayout && typeof fromLayout.rememberMinutes === 'number') c.rememberMinutes = fromLayout.rememberMinutes;
    if (fromLayout && typeof fromLayout.downloadSeconds === 'number') c.seconds = fromLayout.downloadSeconds;
    return c;
  }
  function hashKey(url) {
    var h = 5381, s = String(url);
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return PREFIX + (h >>> 0).toString(36);
  }
  function unlocked(url) {
    var raw = PU.store.local.get(hashKey(url));
    if (!raw) return false;
    var until = parseInt(raw, 10);
    if (!until || Date.now() > until) { PU.store.local.del(hashKey(url)); return false; }
    return true;
  }
  function lock(url) {
    var minutes = Math.max(0, parseInt(conf().rememberMinutes, 10) || 0);
    if (minutes) PU.store.local.set(hashKey(url), String(Date.now() + minutes * 60000));
  }
  function go(url, newTab) {
    if (newTab === true || newTab === 'true') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }
  function ready(box, link, url, newTab, seconds) {
    box.classList.remove('dldAlt');
    box.classList.add('dldRty');
    link.onclick = function () { lock(url); go(url, newTab); };
    if (conf().autoOpen) { setTimeout(function () { go(url, newTab); }, seconds > 0 ? 1000 : 0); }
  }

  window.download = function (url, seconds, newTab, selector) {
    var box = selector ? document.querySelector(selector) : null;
    if (!box) { go(url, newTab); return; }

    var label = box.querySelector('.dldMe');
    var ring = box.querySelector('.dldPg');
    var link = box.querySelector('.dldRt');

    if (running[selector]) { clearInterval(running[selector]); running[selector] = null; }

    if (unlocked(url)) {                       // already paid the wait in this browser
      if (label) label.textContent = 'Ready to download';
      ready(box, link, url, newTab, 0);
      return;
    }

    var forced = conf().seconds;
    if (typeof forced === 'number' && forced <= 0) {   // Layout said: no wait at all
      if (label) label.textContent = 'Ready to download';
      ready(box, link, url, newTab, 0);
      return;
    }

    var total = Math.max(1, parseInt((typeof forced === 'number' ? forced : seconds), 10) || 10);
    var left = total;
    if (typeof window.neonLight === 'function') { try { window.neonLight(total * 1000); } catch (e) {} }
    box.classList.add('dldAlt');
    box.classList.remove('dldRty');

    function render(final) {
      if (label) {
        label.textContent = final
          ? 'Click the button to download'
          : 'Preparing download - ' + left + ' second' + (left === 1 ? '' : 's') + ' left';
      }
      if (ring) ring.style.strokeDashoffset = String(Math.floor((left / total) * 100));
    }
    render(false);

    running[selector] = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(running[selector]); running[selector] = null;
        render(true);
        lock(url);
        ready(box, link, url, newTab, total);
      } else {
        render(false);
      }
    }, 1000);
  };
})();


// plusui-lazy — download cards
//
// The blog links to software hosted on OTHER people's servers. The owner only has a URL and
// cannot know whether the file is clean, so the card never claims anything: it names the file,
// shows the exact link, hands the visitor three no-login checks, and lets the visitor hash the
// file himself after download (WebCrypto SHA-1/256/384/512, MD5 loaded on demand from the MIT
// js-md5 package). The only security statements it can make are verifiable ones: a SHA-256 the
// owner published, and a VirusTotal ratio the owner copied out of a report, with its date.
//
// Two ways to create one, and both end in the same markup:
//   manual  <div class="pu-dl" data-file="https://..." data-name="..." data-version="..."
//                  data-size="..." data-source="..." data-sha256="..."
//                  data-scanned="3/72 on 2026-11-01 (VirusTotal)" data-seconds="10"
//                  data-mirrors="MediaFire|https://...,Drive|https://..."></div>
//   auto    Layout -> Plus UI Settings:  downloadCards: auto   (default)
//           every #postBody link ending in a known binary extension becomes a card.
//
// Everything is built with createElement/textContent - a file name taken from a URL is
// attacker-controlled text, and the upstream components this replaces were full of innerHTML.
(function () {
  'use strict';

  var EXT = ['apk', 'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'exe', 'msi', 'img', 'iso', 'obb', 'dex', 'bin'];
  var SKIP_inside = 'pre, code, blockquote, .dldCo, .dlc, .pu-dl, a[class*="btn"], .postTags, .labl';
  var created = 0;
  var done = [];
  var MD5_URL = 'https://cdn.jsdelivr.net/npm/js-md5@0.9.2/build/md5.min.js';

  function cfg() { return (window.PU && PU.cfg) ? PU.cfg : {}; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    return /^https?:\/\/\S+$/i.test(u) ? u : '';
  }
  function base64UrlNoPad(str) {
    var b = btoa(unescape(encodeURIComponent(str)));
    return b.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  function hostOf(u) { var m = String(u).match(/^https?:\/\/([^/]+)/i); return m ? m[1].replace(/^www\./, '') : ''; }
  function nameFromUrl(u) {
    var p = String(u).split('?')[0].split('#')[0];
    var last = p.substring(p.lastIndexOf('/') + 1);
    var out = last;
    try { out = decodeURIComponent(last); } catch (e) { /* keep the raw form */ }
    return out.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 120) || last.slice(0, 120);
  }
  function extOf(u) {
    var p = String(u).split('?')[0].split('#')[0];
    var m = p.match(/\.([a-z0-9]{2,4})$/i);
    return m ? m[1].toLowerCase() : '';
  }

  // Most of the owner's links are hosted on file services whose URLs carry no extension
  // (drive.google.com/uc, mediafire, GitHub releases...), so an extension list alone would
  // miss exactly the links that need a card.
  var HOST_PATTERNS = [
    /(^|[/.])drive\.google\.com\/(uc|file\/d|u\/\d+\/uc)/i,
    /(^|[/.])docs\.google\.com\/uc/i,
    /(^|[/.])mediafire\.com\//i,
    /(^|[/.])dropbox\.com\/s|(^|[/.])dl\.dropboxusercontent\.com/i,
    /github\.com\/[^/]+\/[^/]+\/releases\/(download|latest)/i,
    /(^|[/.])archive\.org\/(download|details)\//i,
    /(^|[/.])krakenfiles\.com\/download\//i,
    /(^|[/.])mega\.nz\/file\//i,
    /(^|[/.])1fichier\.com\/\?a\.file=/i,
    /(^|[/.])sourceforge\.net\/[^/]+\/files\//i,
    /(^|[/.])androidfilehost\.com\/\?fid=/i,
    /(^|[/.])apkpure\.com|(^|[/.])apkcombo\.com\/.*download/i
  ];

  function looksLikeDownload(u) {
    if (EXT.indexOf(extOf(u)) !== -1) return true;
    for (var i = 0; i < HOST_PATTERNS.length; i++) if (HOST_PATTERNS[i].test(u)) return true;
    return /[?&](download|dl)=1(&|$)/i.test(u) || /\/download\/?(\?|$|#)/i.test(u);
  }

  // ---------- small building blocks ----------
  function linkButton(href, label, cls) {
    var a = el('a', 'dlcB ' + (cls || ''), label);
    a.href = href; a.target = '_blank'; a.rel = 'nofollow noopener noreferrer';
    return a;
  }

  function checkRow(fileUrl) {
    var row = el('div', 'dlcRow dlcScan');
    row.appendChild(el('span', 'dlcLbl', 'Check this link before installing:'));
    row.appendChild(linkButton('https://www.virustotal.com/gui/url/' + base64UrlNoPad(fileUrl), 'VirusTotal'));
    row.appendChild(linkButton('https://transparencyreport.google.com/safe-browsing/search?url=' + encodeURIComponent(fileUrl), 'Google Safe Browsing'));
    var host = hostOf(fileUrl);
    if (host) row.appendChild(linkButton('https://www.urlvoid.com/scan/' + encodeURIComponent(host) + '/', 'Domain blacklist'));
    row.appendChild(linkButton('https://www.virustotal.com/gui/home/urls', 'Scan a new URL'));
    return row;
  }

  function copyRow(fileUrl) {
    var row = el('div', 'dlcRow dlcUrlRow');
    var code = el('code', 'dlcUrl', fileUrl);
    row.appendChild(code);
    var btn = el('button', 'dlcB dlcCopy', 'Copy link');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      var doneBtn = function (ok) {
        btn.textContent = ok ? 'Copied' : 'Select and copy';
        setTimeout(function () { btn.textContent = 'Copy link'; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fileUrl).then(function () { doneBtn(true); }, function () { doneBtn(false); });
      } else { doneBtn(false); }
    });
    row.appendChild(btn);
    return row;
  }

  // ---------- verify the file you downloaded ----------
  var ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

  function verifyPanel(published) {
    var box = el('div', 'dlcVerify');
    var head = el('button', 'dlcB dlcToggle', 'Verify the file you downloaded');
    head.type = 'button';
    var panel = el('div', 'dlcPanel hidden');
    var pick = document.createElement('input');
    pick.type = 'file'; pick.className = 'dlcFile';
    var out = el('div', 'dlcOut');
    var note = el('p', 'dlcHint',
      'Nothing is uploaded. The file stays on your device and the hash is computed in your browser.');

    head.addEventListener('click', function () {
      panel.classList.toggle('hidden');
      head.textContent = panel.classList.contains('hidden') ? 'Verify the file you downloaded' : 'Hide verification';
    });

    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      out.textContent = '';
      if (!f) return;
      var sizeLine = el('div', 'dlcHash', '');
      sizeLine.textContent = 'File: ' + f.name + ' (' + (f.size >= 1048576
        ? (f.size / 1048576).toFixed(2) + ' MB'
        : (f.size >= 1024 ? (f.size / 1024).toFixed(1) + ' KB' : f.size + ' bytes')) + ')';
      out.appendChild(sizeLine);

      var reading = f.arrayBuffer ? f.arrayBuffer() : Promise.reject(new Error('FileReader missing'));
      reading.then(function (buf) {
        var jobs = [];
        if (window.crypto && crypto.subtle) {
          ALGOS.forEach(function (a) {
            jobs.push(crypto.subtle.digest(a, buf).then(function (d) {
              var hex = [].map.call(new Uint8Array(d), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
              addHash(a, hex, buf);
            })['catch'](function (e) { out.appendChild(el('div', 'dlcErr', a + ' failed: ' + e.message)); }));
          });
        } else {
          out.appendChild(el('div', 'dlcErr', 'This browser has no WebCrypto, so SHA hashes are unavailable.'));
        }
        return Promise.all(jobs);
      })['catch'](function (e) { out.appendChild(el('div', 'dlcErr', 'Could not read the file: ' + e.message)); });
    });

    function addHash(algo, hex, buf) {
      var line = el('div', 'dlcHash');
      line.appendChild(el('b', null, algo + ': '));
      line.appendChild(el('span', 'dlcHex', hex));
      line.appendChild(linkButton('https://www.virustotal.com/gui/file/' + hex, 'Look up on VirusTotal', 'dlcMini'));
      out.appendChild(line);
      if (published && algo === 'SHA-256') {
        var want = String(published).trim().toLowerCase();
        var match = hex === want;
        out.appendChild(el('div', 'dlcMatch ' + (match ? 'ok' : 'no'),
          match ? 'Matches the SHA-256 published above - this is the same file.'
                : 'Does NOT match the SHA-256 published above. Delete it and get it from the source page.'));
      }
      // MD5 only on request: it is the one algorithm WebCrypto does not ship.
      if (algo === 'SHA-256' && !window.md5) {
        var s = document.createElement('script');
        s.src = MD5_URL; s.async = true;
        s.onload = function () {
          if (typeof window.md5 !== 'function') return;
          var line2 = el('div', 'dlcHash');
          line2.appendChild(el('b', null, 'MD5: '));
          line2.appendChild(el('span', 'dlcHex', window.md5(buf)));
          out.appendChild(line2);
        };
        s.onerror = function () { /* MD5 is optional; the SHA row is already there */ };
        document.head.appendChild(s);
      }
    }

    box.appendChild(head); box.appendChild(panel);
    panel.appendChild(pick); panel.appendChild(note); panel.appendChild(out);
    return box;
  }

  // ---------- the card itself ----------
  function card(data) {
    var fileUrl = safeUrl(data.file);
    if (!fileUrl) return null;
    var id = 'dlc-' + (++created);
    var ext = (data.ext || extOf(fileUrl) || 'file').toUpperCase();
    var name = data.name || nameFromUrl(fileUrl);
    var host = hostOf(fileUrl);

    var box = el('div', 'dlc');
    box.id = id;
    box.setAttribute('data-pu-card', '1');

    var top = el('div', 'dlcHead');
    top.appendChild(el('span', 'dlcEx', ext));
    var titles = el('div', 'dlcTitles');
    titles.appendChild(el('div', 'dlcNm', name));
    var meta = [];
    if (data.version) meta.push('v' + data.version);
    if (data.size) meta.push(data.size);
    if (host) meta.push(host);
    titles.appendChild(el('div', 'dlcMt', meta.join('  ·  ')));
    top.appendChild(titles);
    box.appendChild(top);

    if (data.source) {
      var src = el('div', 'dlcRow');
      src.appendChild(el('span', 'dlcLbl', 'Source page:'));
      src.appendChild(linkButton(safeUrl(data.source) || '#', data['source-name'] || hostOf(data.source), 'dlcMini'));
      box.appendChild(src);
    }
    if (data.sha256) {
      var sh = el('div', 'dlcRow');
      sh.appendChild(el('span', 'dlcLbl', 'SHA-256 published:'));
      sh.appendChild(el('code', 'dlcHex', String(data.sha256).slice(0, 64)));
      box.appendChild(sh);
    }
    if (data.scanned) {
      var sc = el('div', 'dlcRow dlcScanned');
      sc.appendChild(el('span', 'dlcLbl', 'Last report:'));
      sc.appendChild(el('span', null, data.scanned));
      box.appendChild(sc);
    }

    box.appendChild(copyRow(fileUrl));

    // mirrors
    if (data.mirrors) {
      var mr = el('div', 'dlcRow dlcMirrors');
      mr.appendChild(el('span', 'dlcLbl', 'Mirrors:'));
      String(data.mirrors).split(',').forEach(function (part) {
        var kv = part.split('|');
        var u = safeUrl(kv[1] || kv[0]);
        if (!u) return;
        mr.appendChild(linkButton(u, (kv[1] ? kv[0] : hostOf(u)), 'dlcMini'));
      });
      if (mr.children.length > 1) box.appendChild(mr);
    }

    box.appendChild(checkRow(fileUrl));
    box.appendChild(verifyPanel(data.sha256));

    var gate = el('div', 'dldCo');
    gate.appendChild(el('span', 'dldMe', 'Download'));
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 34 34');
    var c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c1.setAttribute('class', 'dldPg'); c1.setAttribute('cx', '17'); c1.setAttribute('cy', '17'); c1.setAttribute('r', '15.92');
    svg.appendChild(c1);
    gate.appendChild(svg);
    var btn = el('a', 'dldRt', 'Download');
    btn.href = fileUrl; btn.rel = 'nofollow noopener noreferrer';
    gate.appendChild(btn);
    box.appendChild(gate);

    var note = el('p', 'dlcNote',
      'Not hosted or tested by this blog. Download from the source page, scan the file, and verify its hash before installing.');
    box.appendChild(note);

    var seconds = data.seconds !== undefined && data.seconds !== null && data.seconds !== ''
      ? parseInt(data.seconds, 10) : null;
    if (isNaN(seconds)) seconds = null;
    var forced = cfg().downloadSeconds;
    if (seconds === null && typeof forced === 'number') seconds = forced;
    if (seconds === null) seconds = 10;

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (typeof window.download === 'function') { window.download(fileUrl, seconds, false, '#' + id); }
      else { window.open(fileUrl, '_blank', 'noopener,noreferrer'); }
    });
    return box;
  }

  // ---------- discovery ----------
  function fromManualNodes(root) {
    var nodes = (root && root.querySelectorAll ? root : document).querySelectorAll('.pu-dl[data-file]');
    Array.prototype.forEach.call(nodes, function (n) {
      if (n.dataset.puDone) return;
      n.dataset.puDone = '1';
      var data = {
        file: n.getAttribute('data-file'),
        name: n.getAttribute('data-name'), version: n.getAttribute('data-version'),
        size: n.getAttribute('data-size'), source: n.getAttribute('data-source'),
        'source-name': n.getAttribute('data-source-name'),
        sha256: n.getAttribute('data-sha256'), scanned: n.getAttribute('data-scanned'),
        seconds: n.getAttribute('data-seconds'), mirrors: n.getAttribute('data-mirrors')
      };
      var box = card(data);
      if (box) n.appendChild(box);
      else { n.appendChild(el('div', 'dlcNote', 'This download link is not usable.')); }
    });
  }

  function fromLinks(root) {
    if (cfg().downloadCards === 'off' || cfg().downloadCards === 'manual') return;
    var scope = (root && root.querySelectorAll) ? root : document;
    var links = scope.querySelectorAll('#postBody a[href]');
    Array.prototype.forEach.call(links, function (a) {
      if (a.dataset.puCard) return;
      // never wrap the links a card of ours already prints (checks, mirrors, lookup buttons)
      if (a.closest && a.closest('.dlc')) { a.dataset.puCard = 'inner'; return; }
      var url = safeUrl(a.href);
      if (!url) return;
      if (a.closest && a.closest(SKIP_inside)) { a.dataset.puCard = 'skipped'; return; }
      if (a.querySelector('img') || a.getElementsByTagName('img').length) { a.dataset.puCard = 'skipped'; return; }
      if (!looksLikeDownload(url)) { a.dataset.puCard = 'skipped'; return; }
      var text = (a.textContent || '').trim();
      var guess = nameFromUrl(url);
      var name = (text.length >= 4 && text.length <= 120 && !/^https?:/i.test(text)) ? text : guess;
      var box = card({
        file: url,
        name: name,
        source: '', seconds: null
      });
      if (!box) return;
      a.dataset.puCard = '1';
      a.parentNode.replaceChild(box, a);
    });
  }

  function scan(root) { fromManualNodes(root); fromLinks(root); }

  window.puDownloadCards = scan;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(document); });
  } else { scan(document); }

  // Blogger's infinite scroll adds posts after the fact; watch the post list only.
  var host = document.getElementById('main-widget') || document.getElementById('blogPosts') || document.body;
  var timer = null;
  if (host && window.MutationObserver) {
    new MutationObserver(function (muts) {
      var worth = muts.some(function (m) { return m.addedNodes && m.addedNodes.length; });
      if (!worth) return;
      clearTimeout(timer);
      timer = setTimeout(function () { scan(host); }, 400);
    }).observe(host, { childList: true, subtree: true });
  }

  done.push(created);
})();


// plusui-lazy — Table of contents
// Same public API as upstream (new TableOfContents({from, to}).generateToc()) so the
// template keeps working, but it also self-starts: it finds #postToc / #autoToc and the
// article body by itself, which is what lets us drop the obfuscated loader later.
//
// Fixed versus upstream:
//   * heading ids are slugified and de-duplicated (upstream used raw text with spaces
//     turned into "_", so two identical headings produced the same id and the second
//     anchor never worked)
//   * no headings -> nothing happens (upstream called appendChild(null) and threw)
//   * ids are capped and ASCII-folded so they stay valid in a URL fragment
//   * the active entry is tracked with one IntersectionObserver instead of nothing,
//     so long posts show where the reader is
(function () {
  'use strict';

  var BODY_SELECTORS = ['#postBody', '.postBody', '.entry-content'];

  function slugify(text, used) {
    var base = String(text || '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60)
      .toLowerCase();
    if (!base) base = 'section';
    var id = base, n = 2;
    while (used[id]) { id = base + '-' + (n++); }
    used[id] = true;
    return id;
  }

  function levelOf(el) {
    var n = parseInt(el.tagName.slice(1), 10);
    return (n >= 1 && n <= 6) ? n : 1;
  }

  function TableOfContents(opts) {
    this.fromElement = opts.from;
    this.toElement = opts.to;
    if (!this.fromElement) return;
    this.headingElements = this.fromElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  }

  TableOfContents.prototype.generateToc = function () {
    var headings = this.headingElements;
    if (!this.toElement || !headings || !headings.length) return;

    var used = {};
    var headings = Array.prototype.slice.call(this.headingElements);
    var baseLevel = 6;
    headings.forEach(function (h) { baseLevel = Math.min(baseLevel, levelOf(h)); });

    var root = document.createElement('ol');
    var lists = { 0: root };          // relative depth -> the <ol> that holds its items
    var currentList = root;
    var lastRel = 0;
    var links = [];

    for (var i = 0; i < headings.length; i++) {
      var heading = headings[i];
      if (!heading.id) heading.id = slugify(heading.textContent, used);
      else if (!used[heading.id]) used[heading.id] = true;

      var rel = levelOf(heading) - baseLevel;

      if (rel > lastRel) {                       // go one level deeper per step
        for (var d = lastRel + 1; d <= rel; d++) {
          var holder = document.createElement('li');
          var nested = document.createElement('ol');
          holder.appendChild(nested);
          currentList.appendChild(holder);
          currentList = nested;
          lists[d] = nested;
        }
      } else if (rel < lastRel) {                // come back up to an existing list
        currentList = lists[rel] || root;
      }

      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.className = 'tocLink';
      if (typeof window.vibRate === 'function') {
        link.addEventListener('click', function () { try { window.vibRate(50); } catch (e) {} });
      }
      item.appendChild(link);
      currentList.appendChild(item);
      lastRel = rel;
      links.push({ link: link, heading: heading });
    }

    this.toElement.textContent = '';
    this.toElement.appendChild(root);
    trackActive(links);
  };

  function trackActive(links) {
    if (!('IntersectionObserver' in window) || !links.length) return;
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = null;
      for (var i = 0; i < links.length; i++) {
        var on = visible[links[i].heading.id];
        if (on) { current = links[i]; break; }
      }
      links.forEach(function (l) { l.link.classList.remove('tocActive'); });
      if (current) current.link.classList.add('tocActive');
    }, { rootMargin: '-64px 0px -70% 0px' });
    links.forEach(function (l) { io.observe(l.heading); });
  }

  window.TableOfContents = TableOfContents;

  function autoStart() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', autoStart, { once: true }); return; }
    var body = null;
    for (var i = 0; i < BODY_SELECTORS.length; i++) {
      body = document.querySelector(BODY_SELECTORS[i]);
      if (body) break;
    }
    if (!body) return;
    ['#postToc', '#autoToc'].forEach(function (sel) {
      var target = document.querySelector(sel);
      if (!target) return;
      try { new TableOfContents({ from: body, to: target }).generateToc(); } catch (e) {}
    });
  }
  autoStart();
})();


// plusui-lazy — bookmarked posts
// Replaces BookmarkPosts.min.js (which was packed twice over). Same storage key
// (Bookmark_Post) so existing visitors keep their saved list, same DOM classes the
// component CSS expects, same bkMrk() entry point the template calls after
// infinite-scroll loads more posts.
//
// Fixed versus upstream:
//   * post titles/urls never go through innerHTML or inline onclick - they become
//     text nodes and addEventListener handlers (upstream built
//     onclick="delBmPs('ID')" and background-image:url('IMG') from raw values)
//   * links and images are validated: only http(s)/relative URLs survive
//   * the saved map is capped and pruned, and corrupt JSON no longer bricks the panel
//   * the badge count is derived from the map instead of drifting from it
(function () {
  'use strict';

  var KEY = 'Bookmark_Post';
  var MAX = 60;
  var cfg = Object.assign({
    bmTitle: 'Bookmarks', closeText: 'Close', noBmMes: 'No bookmarks yet',
    noBmLink: '/search', noBmAll: 'View all posts', addedNtf: 'Bookmarked',
    removedNtf: 'Removed', noBmIcon: '', delIcon: ''
  }, (window.PuSet && window.PuSet.bookmark) || {});

  function read() {
    var raw = PU.store.local.get(KEY);
    if (!raw) return {};
    try {
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
      return obj;
    } catch (e) { PU.store.local.del(KEY); return {}; }
  }
  function write(map) {
    var ids = Object.keys(map);
    if (ids.length > MAX) {
      ids.slice(0, ids.length - MAX).forEach(function (k) { delete map[k]; });  // oldest first
    }
    PU.store.local.set(KEY, JSON.stringify(map));
  }
  function safeUrl(url) {
    var u = String(url || '');
    return (/^(https?:)?\/\//i.test(u) || /^\//.test(u)) ? u : '';
  }
  function notify(html) {
    if (typeof window.toastNotif === 'function') { try { window.toastNotif(html); } catch (e) {} }
  }
  function buzz() { if (typeof window.vibRate === 'function') { try { window.vibRate(50); } catch (e) {} } }
  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k]) node.setAttribute(k, attrs[k]); });
    return node;
  }

  /* ---- panel ---- */
  var panel, list;
  function buildPanel() {
    if (panel) return panel;
    var host = document.getElementById('header-icon') || document.body;
    var box = el('div', 'cBkPs');
    var check = el('input', 'bkmI hidden', { type: 'checkbox', id: 'offBkm' });
    var wrap = el('div', 'wBkm');
    var head = el('div', 'bkmH');
    var title = el('span', 'bkmTtl'); title.textContent = cfg.bmTitle;
    var close = el('label', 'c', { 'for': 'offBkm' }); close.textContent = cfg.closeText;
    head.appendChild(title); head.appendChild(close);
    list = el('div', 'bkmC', { id: 'dBmPs' });
    wrap.appendChild(head); wrap.appendChild(list);
    var backdrop = el('label', 'bkmCls', { 'for': 'offBkm' });
    box.appendChild(check); box.appendChild(wrap); box.appendChild(backdrop);
    host.appendChild(box);
    panel = box;
    return box;
  }

  function render() {
    if (!list) return;
    var map = read();
    var ids = Object.keys(map);
    list.textContent = '';

    var badge = document.querySelector('.tBkmt');
    if (badge) {
      badge.setAttribute('data-text', String(ids.length));
      badge.classList.toggle('n', ids.length === 0);
    }

    if (!ids.length) {
      var empty = el('div', 'n');
      if (cfg.noBmIcon) {
        var icon = el('span');
        icon.innerHTML = cfg.noBmIcon;            // theme-authored SVG, not visitor data
        while (icon.firstChild) empty.appendChild(icon.firstChild);
      }
      var msg = el('span'); msg.textContent = cfg.noBmMes;
      var all = el('a', null, { href: safeUrl(cfg.noBmLink) || '#' });
      all.textContent = cfg.noBmAll;
      empty.appendChild(msg); empty.appendChild(all);
      list.appendChild(empty);
      return;
    }

    ids.forEach(function (id) {
      var post = map[id] || {};
      var href = safeUrl(post.link);
      var item = el('div', 'item', { 'data-id': id });

      var thumb = el('div', 'pThmb');
      var tlink = el('a', 'thmb', href ? { href: href } : null);
      var img = el('span', 'bkmImg');
      var pic = safeUrl(post.image);
      if (pic) img.style.backgroundImage = 'url("' + pic.replace(/"/g, '%22') + '")';
      tlink.appendChild(img); thumb.appendChild(tlink);

      var ttl = el('div', 'itmTtl');
      var tanchor = el('a', 'aTtl', href ? { href: href } : null);
      tanchor.textContent = post.title || id;
      ttl.appendChild(tanchor);

      var del = el('span', 'del', { role: 'button', tabindex: '0', 'aria-label': 'Remove' });
      if (cfg.delIcon) { var s = el('span'); s.innerHTML = cfg.delIcon; while (s.firstChild) del.appendChild(s.firstChild); }
      var remove = function () {
        buzz();
        item.classList.add('d');
        setTimeout(function () {
          var m = read(); delete m[id]; write(m); render(); mark();
        }, 350);
        notify(cfg.removedNtf);
      };
      del.addEventListener('click', remove);
      del.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remove(); } });

      item.appendChild(thumb); item.appendChild(ttl); item.appendChild(del);
      list.appendChild(item);
    });
  }

  /* ---- save buttons ---- */
  function mark() {
    var map = read();
    Array.prototype.forEach.call(document.querySelectorAll('.bmPs'), function (btn) {
      var id = btn.getAttribute('bm-id');
      btn.classList.toggle('a', !!(id && map[id]));
    });
  }

  function save(btn) {
    var id = btn.getAttribute('bm-id');
    if (!id) return;
    var map = read();
    if (map[id]) {
      delete map[id];
      notify(cfg.removedNtf);
    } else {
      map[id] = {
        id: id,
        title: btn.getAttribute('bm-ttl') || '',
        image: btn.getAttribute('bm-img') || '',
        link: btn.getAttribute('bm-url') || location.href
      };
      notify(cfg.addedNtf);
    }
    write(map);
    buzz();
    mark();
    render();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.bmPs') : null;
    if (btn) { e.preventDefault(); save(btn); }
  });

  // Called by the template after infinite-scroll injects more posts.
  window.bkMrk = function () { buildPanel(); mark(); render(); };

  function start() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', start, { once: true }); return; }
    if (!document.querySelector('.bmPs') && !document.querySelector('.isBkm')) return;
    window.bkMrk();
  }
  start();
})();


// plusui-lazy — offline / online notice
// Replaces NoInternetWidget.min.js. Same #noInternet popup and the same
// PuSet.noInternet messages, but it also reads the state on load (upstream only
// reacted to a change, so a visitor who arrived already offline saw nothing) and
// builds the toast with nodes instead of concatenating HTML.
(function () {
  'use strict';

  var cfg = Object.assign({ enablePopup: 'true', enableToast: 'true', offlineMes: 'You are Offline', onlineMes: 'You are Online' },
    (window.PuSet && window.PuSet.noInternet) || {});

  function popup() { return document.getElementById('noInternet'); }

  function show(isOnline) {
    var box = popup();
    // The notice is for the offline case: show it when the connection is lost,
    // hide it again when the connection comes back.
    if (box && cfg.enablePopup === 'true') box.classList.toggle('visible', !isOnline);
    if (cfg.enableToast === 'true' && typeof window.toastNotif === 'function') {
      var wrap = document.createElement('span');
      var icon = document.createElement('i');
      icon.className = isOnline ? 'onWifi' : 'offWifi';
      wrap.appendChild(icon);
      wrap.appendChild(document.createTextNode(isOnline ? cfg.onlineMes : cfg.offlineMes));
      try { window.toastNotif(wrap.innerHTML); } catch (e) {}
    }
    if (typeof window.vibRate === 'function') { try { window.vibRate(isOnline ? 40 : 90); } catch (e) {} }
  }

  window.addEventListener('offline', function () { show(false); });
  window.addEventListener('online', function () { show(true); });

  function start() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', start, { once: true }); return; }
    if (typeof navigator.onLine === 'boolean' && navigator.onLine === false) show(false);
  }
  start();
})();


// plusui-lazy — double-click a code block to copy it
// Replaces CopyPreContent.min.js. Same behaviour and the same PuSet.preCopy message, but:
//   * navigator.clipboard with an execCommand fallback (the old code used only the
//     deprecated execCommand path, which Chrome is removing for non-user-gesture calls)
//   * event delegation, so code blocks added later (infinite scroll, TOC re-render) work
//   * it copies the block's text, and leaves an existing selection inside the block alone
(function () {
  'use strict';

  var cfg = Object.assign({ copiedMes: 'Copied to Clipboard' }, (window.PuSet && window.PuSet.preCopy) || {});

  function notify() {
    if (typeof window.toastNotif === 'function') { try { window.toastNotif(cfg.copiedMes); } catch (e) {} }
    if (typeof window.vibRate === 'function') { try { window.vibRate(75); } catch (e) {} }
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(notify, function () { legacy(text); });
    } else {
      legacy(text);
    }
  }

  function legacy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(area);
    if (ok) notify();
  }

  document.addEventListener('dblclick', function (e) {
    var pre = e.target.closest ? e.target.closest('pre') : null;
    if (!pre) return;
    var sel = window.getSelection ? window.getSelection() : null;
    var selected = sel ? String(sel) : '';
    var selectionInside = selected.length > 2 && sel.anchorNode && pre.contains(sel.anchorNode);
    var code = selectionInside
      ? selected
      : (pre.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    if (code) copy(code);
  });
})();


// plusui-lazy — cookie consent (real)
// The theme already ships the bar markup (#ckWrap with .ckH/.ckD/.ckF and one Accept
// button). Upstream CookieConsent.min.js only ever accepted, so it was not consent:
// there was no way to refuse, no way to withdraw, and the cookie carried no SameSite.
//
// This one:
//   * Accept / Decline, both remembered in the CookiePolicy cookie
//   * consent expires and the bar comes back after CONSENT_TTL_DAYS (change one line)
//   * a decline hides the ad slots and stops our own AdSense loader (adsense.js asks
//     PU.consent.granted() before it injects anything)
//   * cookie is SameSite=Lax and Secure where the page is https
//   * window.cookieSettings() re-opens the bar, and any [data-cookie-settings] element
//     on the page is wired to it, so a footer link can offer withdrawal
(function () {
  'use strict';

  var CONSENT_TTL_DAYS = 180;               // <- the only line to edit to change the period
  var COOKIE = 'CookiePolicy';
  var cfg = Object.assign({ consentMaxAge: String(CONSENT_TTL_DAYS * 24 * 3600) },
    (window.PuSet && window.PuSet.cookieCon) || {});

  function days() {
    var fromLayout = (window.PU && PU.cfg) ? PU.cfg.consentDays : null;
    if (typeof fromLayout === 'number' && fromLayout > 0) return fromLayout;   // Layout wins
    var fromTemplate = parseInt(cfg.consentMaxAge, 10);
    // the template ships 2592000 (30 days); we keep our own default unless the owner
    // sets cookieCon.consentMaxAge deliberately to something else
    return (fromTemplate && fromTemplate !== 2592000) ? Math.max(1, Math.round(fromTemplate / 86400)) : CONSENT_TTL_DAYS;
  }

  function answer() { return PU.store.cookie.get(COOKIE); }

  function setChoice(value) {
    PU.store.cookie.set(COOKIE, value, { 'max-age': days() * 24 * 3600 });
  }

  function hideAds(hide) {
    var style = document.getElementById('plusui-consent-ads');
    if (!hide) { if (style) style.remove(); return; }
    if (style) return;
    style = document.createElement('style');
    style.id = 'plusui-consent-ads';
    style.textContent = '.adsbygoogle,.blogAd,.ancrA{display:none !important}';
    document.head.appendChild(style);
  }

  function bar() { return document.getElementById('ckWrap'); }

  function openBar() {
    var box = bar();
    if (!box) return;
    box.classList.remove('a');
    box.classList.add('v');
  }
  function closeBar() {
    var box = bar();
    if (!box) return;
    box.classList.add('a');
    box.classList.remove('v');
  }

  function declineButton(box) {
    var actions = box.querySelector('.ckF');
    if (!actions || document.getElementById('ckDecline')) return;
    var btn = document.createElement('button');
    btn.className = 'ckB';
    btn.id = 'ckDecline';
    btn.type = 'button';
    btn.textContent = 'No, thanks';
    actions.insertBefore(btn, actions.lastElementChild);
  }

  function decide(value) {
    setChoice(value);
    if (value === 'Declined') hideAds(true); else hideAds(false);
    closeBar();
    // adsense.js waits for this so an ad tag is never injected before an answer
    document.dispatchEvent(new CustomEvent('pu:consent', { detail: value }));
  }

  function wire() {
    var box = bar();
    if (!box) return;
    declineButton(box);
    var accept = document.getElementById('ckAccept');
    var decline = document.getElementById('ckDecline');
    if (accept && !accept.dataset.bound) {
      accept.dataset.bound = '1';
      accept.addEventListener('click', function () { decide('Accepted'); });
    }
    if (decline && !decline.dataset.bound) {
      decline.dataset.bound = '1';
      decline.addEventListener('click', function () { decide('Declined'); });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-cookie-settings]'), function (link) {
      if (link.dataset.bound) return;
      link.dataset.bound = '1';
      link.addEventListener('click', function (e) { e.preventDefault(); window.cookieSettings(); });
    });
  }

  window.cookieSettings = function () {
    PU.store.cookie.del(COOKIE);
    openBar();
  };

  // Public answer for the other modules (adsense.js uses this before loading anything).
  window.PU = window.PU || {};
  PU.consent = {
    granted: function () { return answer() === 'Accepted'; },
    refused: function () { return answer() === 'Declined'; },
    decided: function () { return answer() === 'Accepted' || answer() === 'Declined'; },
    value: answer,
    ttlDays: days            // what Layout -> consentDays resolves to (also used by the harness)
  };

  function start() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', start, { once: true }); return; }
    if (!bar()) return;
    wire();
    var choice = answer();
    if (choice === 'Declined') { hideAds(true); closeBar(); return; }
    if (choice === 'Accepted') { hideAds(false); closeBar(); return; }
    openBar();
  }
  start();
})();


// plusui-lazy — AdSense loader + ad-blocker notice
// Replaces AdsenseAds.min.js. Same hooks (#antiAdB and its .fxPuCl close button, the
// antiAB_ign cookie, PuSet.adsenseAds) but:
//   * it never touches ads unless consent says so: refused = stay hidden, undecided = wait
//     for the decision (consent.js fires pu:consent)
//   * the block detection uses the script's own onerror, not a timeout, so a slow
//     connection is no longer reported as an ad blocker
//   * the hiding stylesheet has an id and is removed if a slot turns out to be filled
//     after load, so a false positive is not permanent
//   * every element lookup is null-guarded (upstream called addCt(null) and threw when
//     #antiAdB was not in the template)
(function () {
  'use strict';

  var cfg = Object.assign({ publisherId: '', antiAdBClose: 'true', ignoreMaxAge: '86400', loadType: 'defer' },
    (window.PuSet && window.PuSet.adsenseAds) || {});

  var pubId = String(cfg.publisherId || '').replace(/^ca-pub-/, '');
  var loaded = false, hidden = false;

  function consent() { return window.PU && PU.consent ? PU.consent : null; }

  function hideSlots(on) {
    var id = 'plusui-ads-blocked';
    var style = document.getElementById(id);
    if (on && !style) {
      style = document.createElement('style');
      style.id = id;
      style.textContent = '.adsbygoogle,.blogAd,.ancrA{display:none !important}';
      document.head.appendChild(style);
      hidden = true;
    } else if (!on && style) {
      style.remove();
      hidden = false;
    }
  }

  function notice() { return document.getElementById('antiAdB'); }

  function showNotice() {
    var box = notice();
    if (!box) return;                                  // template has no notice: say nothing
    if (window.PU && PU.cfg && PU.cfg.adBlockNotice === false) return;  // turned off in Layout
    if (PU.store.cookie.get('antiAB_ign')) return;     // visitor already dismissed it
    box.classList.add('visible');
    var close = box.querySelector('.fxPuCl');
    if (close && cfg.antiAdBClose === 'true') {
      close.classList.remove('hidden');
      if (!close.dataset.bound) {
        close.dataset.bound = '1';
        close.addEventListener('click', function () {
          PU.store.cookie.set('antiAB_ign', '1', { 'max-age': parseInt(cfg.ignoreMaxAge, 10) || 86400 });
          box.classList.remove('visible');
        });
      }
    }
  }

  function anySlotFilled() {
    return Array.prototype.some.call(document.querySelectorAll('.adsbygoogle'), function (slot) {
      return slot.getBoundingClientRect().height > 20;
    });
  }

  function load() {
    if (loaded) return;
    if (!pubId) return;
    var c = consent();
    if (c && !c.granted()) {
      if (c.refused()) hideSlots(true);
      return;                                          // wait for an explicit yes
    }
    loaded = true;
    var tag = document.createElement('script');
    tag.async = true;
    tag.id = 'adtrs-js';
    tag.crossOrigin = 'anonymous';
    tag.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-' + pubId;
    tag.onerror = function () { hideSlots(true); showNotice(); };
    document.head.appendChild(tag);

    // Second look after everything settled: if a real slot has height, the first
    // verdict was wrong, so undo it instead of leaving the visitor with a blank page.
    window.addEventListener('load', function () {
      setTimeout(function () { if (hidden && anySlotFilled()) hideSlots(false); }, 2500);
    }, { passive: true });
  }

  function start() {
    var c = consent();
    if (!c || c.decided()) { load(); return; }
    document.addEventListener('pu:consent', function (e) {
      if (e.detail === 'Accepted') load();
      else if (e.detail === 'Declined') hideSlots(true);
    });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();


// plusui-lazy — previous / next chapter
// Replaces AutoChapters.min.js. Same #aChp container, same .chpN markup the theme CSS
// already styles, same autoChapterConfig, but the choice is deterministic:
// upstream picked a RANDOM post from the label feed for "previous chapter", so the
// navigation shuffled on every reload and could point at the post you were reading.
// This one reads the label feed once, finds the current post by id and takes the
// neighbours by publication order.
(function () {
  'use strict';

  var cfg = Object.assign({ homePage: '/', titleLength: 60, newTabLink: false, callBack: null },
    window.autoChapterConfig || {});
  var host = document.getElementById('aChp');
  if (!host) return;

  var labels = window.labelArray || [];
  var MAX = 150;

  function clip(text, max) {
    var s = String(text || '');
    return (max > 0 && s.length > max) ? s.slice(0, max).trim() + '\u2026' : s;
  }
  function linkOf(entry) {
    var links = entry.link || [];
    for (var i = 0; i < links.length; i++) if (links[i].rel === 'alternate') return links[i].href;
    return '';
  }
  function isCurrent(entry) {
    // The template declares blogID/postID as top-level const, so window.* is undefined.
    var mine = (window.PU && PU.env) ? PU.env.entryId() : null;
    if (!mine || !entry.id) return false;
    return entry.id.$t.indexOf(mine) !== -1;
  }
  function feedUrl(label) {
    return (cfg.homePage || '/').replace(/\/$/, '') + '/feeds/posts/summary' +
      (label ? '/-/' + encodeURIComponent(label) : '') +
      '?alt=json&max-results=' + MAX + '&orderby=published';
  }

  function build(prev, next) {
    var wrap = document.createElement('div');
    wrap.className = 'chpN' + (prev && !next ? ' p' : (next && !prev ? ' n' : ''));
    [prev, next].forEach(function (post) {
      if (!post) return;
      var a = document.createElement('a');
      a.href = linkOf(post) || '#';
      a.setAttribute('data-text', clip(post.title && post.title.$t, parseInt(cfg.titleLength, 10)));
      a.title = (post.title && post.title.$t) || '';
      if (cfg.newTabLink) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      if (typeof window.vibRate === 'function') {
        a.addEventListener('click', function () { try { window.vibRate(50); } catch (e) {} });
      }
      wrap.appendChild(a);
    });
    host.textContent = '';
    host.appendChild(wrap);
    if (typeof cfg.callBack === 'function') { try { cfg.callBack(); } catch (e) {} }
  }

  function run(label) {
    fetch(feedUrl(label), { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('feed ' + r.status); return r.json(); })
      .then(function (data) {
        var entries = (data.feed && data.feed.entry) || [];
        var at = -1;
        for (var i = 0; i < entries.length; i++) { if (isCurrent(entries[i])) { at = i; break; } }
        if (at === -1) return;                       // not in this feed: no chapters
        // feed is newest first: the older chapter sits at at+1, the newer one at at-1
        build(entries[at + 1], entries[at - 1]);
      })
      .catch(function (e) {
        // a silent catch hides real bugs; warn once without disturbing the reader
        if (window.console && console.warn) console.warn('[plusui] chapters:', e.message);
      });
  }

  if (labels.length) {
    // use the post's first label; it is the series the chapters belong to
    run(labels[0]);
  } else {
    run('');
  }
})();


// plusui-lazy — real view counts (Firebase RTDB)
// Replaces the counter that lived inside the template's obfuscated eval block.
// Same database, same paths, same numbers: BlogID_<blogID>/PostID_<id> (and
// BlogID_<blogID>/WebsiteStats), so nothing has to be migrated.
//
// Two things are better than the original:
//   * firebase.database().transaction() instead of read-then-write. The old code did
//     once('value') -> set(n+1), so two tabs, or a fast reader, silently lose counts.
//   * a failed write no longer hides the number: the last known value is still shown.
//
// The elements come from the template:
//   <span class="pVws hidden pu-views" data-add="true" data-id="<postID>">  -> count + show
//   <span class="pV hidden pu-views" data-id="<postID>">                    -> show only
//   <span class="pu-views" data-add="true" data-id="WebsiteStats">          -> site total
// The visible number is written to data-text, which the theme CSS prints with ::after.
(function () {
  'use strict';

  var rv = (window.PuSet && window.PuSet.realViews) || {};
  var url = rv.databaseUrl;
  var abbreviate = rv.abbreviation === 'true';
  // blogID is a top-level const in the template, not a window property (see core/globals.js).
  var blogID = (window.PU && PU.env) ? PU.env.blogID() : '';
  if (!blogID || (PU.cfg && PU.cfg.showViews === false)) {
    if (window.console && console.warn) console.warn('[plusui] real views: ' + (blogID ? 'switched off in Layout' : 'no blogID'));
    return;
  }
  if (!url) {
    if (window.console && console.warn) console.warn('[plusui] real views: no databaseUrl');
    return;
  }

  var SDK = {
    app: 'https://www.gstatic.com/firebasejs/8.4.2/firebase-app.js',
    db: 'https://www.gstatic.com/firebasejs/8.4.2/firebase-database.js'
  };

  function abv(n) {
    var v = Number(n) || 0;
    if (v < 1000) return String(v);
    if (v < 1000000) return (Math.round((v / 1000) * 10) / 10).toString().replace(/\.0$/, '') + 'K';
    return (Math.round((v / 1000000) * 10) / 10).toString().replace(/\.0$/, '') + 'M';
  }
  function show(node, value) {
    node.setAttribute('data-text', abbreviate ? abv(value) : String(value || 0));
    node.classList.remove('hidden');
  }
  function load(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('blocked: ' + src)); };
      document.head.appendChild(s);
    });
  }

  // If the page already carries the compat SDK, do not fetch it a second time.
  var ready = (window.firebase && firebase.database)
    ? Promise.resolve()
    : load(SDK.app).then(function () { return load(SDK.db); });

  ready
    .then(function () {
      if (!window.firebase || !firebase.database) throw new Error('firebase compat SDK missing');
      if (!firebase.apps.length) firebase.initializeApp({ databaseURL: url });
      var db = firebase.database();

      function process(node) {
        if (node.dataset.puDone) return;
        node.dataset.puDone = '1';
        var raw = node.getAttribute('data-id') || '';
        // The template prints data-id="<post id>" as a bare number, while the database
        // keys are BlogID_<blog>/PostID_<post> (checked with ?shallow=true: 59 children,
        // every one of them named PostID_*). 'WebsiteStats' is already a key name, so
        // only a purely numeric id gets the prefix - otherwise we would create a second,
        // parallel counter per post and show 1 where the real number is hundreds.
        var id = /^\d+$/.test(raw) ? 'PostID_' + raw : raw;
        if (!id) return;
        var ref = db.ref('BlogID_' + blogID + '/' + id);
        var shouldAdd = node.getAttribute('data-add') === 'true';

        if (!shouldAdd) {
          ref.once('value').then(function (snap) { show(node, snap.val() || 0); }, function () {});
          return;
        }

        ref.transaction(function (current) { return (current || 0) + 1; })
          .then(function (res) { show(node, res.snapshot.val() || 0); })
          // write refused or offline: still print what we know instead of hiding it
          .catch(function () { ref.once('value').then(function (s) { show(node, s.val() || 0); }, function () {}); });
      }

      function processAll() {
        Array.prototype.forEach.call(document.querySelectorAll('.pu-views'), process);
      }

      // The template calls puViews() after infinite-scroll adds more posts.
      window.puViews = processAll;
      processAll();
    })
    .catch(function (e) {
      if (window.console && console.warn) console.warn('[plusui] real views:', e.message);
    });
})();


// plusui-lazy — Google Analytics (gtag.js)
// The template's obfuscated block used to load gtag with PuSet.analytics.propertyID,
// which is Blogger's data:blog.analyticsAccountNumber. Keeping that behaviour, but:
//   * it does nothing until the visitor answers the cookie bar (Blogger stats are not
//     affected - they are server side and need no script at all)
//   * the id is read straight from the constant the template already defines, so an
//     empty "Settings -> Analytics for Bloggers" field simply means no request
//   * one guard instead of a silent failure: a refused load warns once
(function () {
  'use strict';

  // PuSet is a `var` (so it is on window), but the analyticsID it points at is a
  // top-level const, so the fallback has to go through PU.env.
  var id = String((window.PuSet && window.PuSet.analytics && window.PuSet.analytics.propertyID) ||
    (window.PU && PU.env ? PU.env.str('analyticsID') : '') || '').trim();
  if (!id || id === 'false' || id === 'null') return;
  if (document.getElementById('gtag-js')) return;

  function load() {
    if (document.getElementById('gtag-js')) return;
    var s = document.createElement('script');
    s.id = 'gtag-js';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    s.onerror = function () {
      if (window.console && console.warn) console.warn('[plusui] analytics could not load');
    };
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  var consent = window.PU && PU.consent;
  if (!consent || consent.granted()) { load(); return; }
  if (consent.refused()) return;                      // never send without an answer
  document.addEventListener('pu:consent', function (e) {
    if (e.detail === 'Accepted') load();
  });
})();
