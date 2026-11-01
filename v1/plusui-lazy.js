/* plusui-lazy v1 - built 2026-11-01 - dz-gsmdz.blogspot.com */
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
  var WANT = parseInt(cfg.numPosts, 10) || 4;
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
    // the template exposes postID/blogID next to the license key
    return (window.postID && window.blogID)
      ? 'blog-' + window.blogID + '.post-' + window.postID : null;
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
    .catch(function () { /* no related posts is better than a broken page */ });
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
    return Object.assign({ rememberMinutes: 60, autoOpen: false }, window.downloadBoxConfig || {});
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

    var total = Math.max(1, parseInt(seconds, 10) || 10);
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
