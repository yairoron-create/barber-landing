// Shared helpers for the public pages built from the app's API (b/index.html = one barber,
// b/shop.html = a whole shop). Exposes window.BPC. All user-supplied text is inserted with
// textContent (never innerHTML); numbers/prices/times are wrapped in dir="ltr" spans (bidi).
(function () {
  'use strict';

  var APP = 'https://barber-appointments-vimn.onrender.com';
  var DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var CATEGORY_ORDER = ['men', 'women', 'children', 'general'];
  var CATEGORY_LABELS = {
    barber: { men: 'גברים', women: 'נשים', children: 'ילדים', general: 'כללי' },
    'pet-grooming': { men: 'כלבים', women: 'חתולים', children: 'טיפוח', general: 'כללי' }
  };

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }
  function ltr(text) {
    var s = el('span', null, text);
    s.setAttribute('dir', 'ltr');
    return s;
  }
  function link(href, text, className) {
    var a = el('a', className, text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  function card(title) {
    var c = el('section', 'bp-card');
    if (title) c.appendChild(el('h2', null, title));
    return c;
  }

  // Cloudinary: keep delivery tiny (auto format/quality, capped width).
  function cld(url, transform) {
    if (typeof url !== 'string') return '';
    var marker = '/image/upload/';
    if (url.indexOf('https://res.cloudinary.com/') !== 0 || url.indexOf(marker) === -1) return url;
    return url.replace(marker, marker + transform + '/');
  }

  function minToTime(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function normalizePhone(raw) {
    var d = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
    if (d.indexOf('972') === 0) d = d.slice(3).replace(/^0+/, '');
    return d ? '972' + d : '';
  }
  function instagramHref(raw) {
    var v = String(raw || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return /^https?:\/\/(www\.)?instagram\.com\//i.test(v) ? v : '';
    var handle = v.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
    return handle ? 'https://instagram.com/' + handle : '';
  }

  // ---------- Shared sections ----------
  function renderHours(container, schedule) {
    var dl = el('dl', 'bp-hours');
    var today = new Date().getDay();
    schedule.slice().sort(function (a, b) { return a.day - b.day; }).forEach(function (d) {
      var dt = el('dt', d.day === today ? 'today' : null, 'יום ' + DAY_NAMES[d.day]);
      var dd = el('dd', d.day === today ? 'today' : null);
      if (d.active) dd.appendChild(ltr(minToTime(d.start) + '–' + minToTime(d.end)));
      else dd.textContent = 'סגור';
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    container.appendChild(dl);
  }

  function promoActive(text, expiry) {
    return !!text && (!expiry || new Date(expiry) >= new Date(new Date().toDateString()));
  }

  function renderServices(container, services, businessType) {
    var labels = CATEGORY_LABELS[businessType] || CATEGORY_LABELS.barber;
    var byCat = {};
    services.forEach(function (s) {
      var c = CATEGORY_ORDER.indexOf(s.category) === -1 ? 'general' : s.category;
      (byCat[c] = byCat[c] || []).push(s);
    });
    var used = CATEGORY_ORDER.filter(function (c) { return byCat[c] && byCat[c].length; });
    used.forEach(function (c) {
      if (used.length > 1) container.appendChild(el('div', 'bp-cat', labels[c]));
      byCat[c].sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'he'); });
      byCat[c].forEach(function (s) {
        var row = el('div', 'bp-svc');
        var left = el('div');
        left.appendChild(el('div', 'bp-svc-name', s.name));
        // Durations are never shown on these pages; a compound service just says so.
        if (s.hasBreak) left.appendChild(el('div', 'bp-svc-extra', 'כולל הפסקה באמצע'));
        var price;
        if (s.price != null && s.price !== '') {            // single barber: { price }
          price = el('div', 'bp-svc-price');
          price.appendChild(ltr('₪' + s.price));
        } else if (s.minPrice != null) {                    // shop: { minPrice, maxPrice }
          price = el('div', 'bp-svc-price');
          price.appendChild(ltr(s.maxPrice > s.minPrice ? '₪' + s.minPrice + '–₪' + s.maxPrice : '₪' + s.minPrice));
        } else if (s.priceNote) {
          price = el('div', 'bp-svc-price note', s.priceNote);
        } else {
          price = el('div', 'bp-svc-price note', 'המחיר ייקבע בהתאם לעבודה');
        }
        row.appendChild(left);
        row.appendChild(price);
        container.appendChild(row);
      });
    });
  }

  function renderContact(root, o) {
    var ig = instagramHref(o.instagramUrl);
    if (!(o.phone || o.address || ig)) return;
    var cc = card('יצירת קשר');
    var wrap = el('div', 'bp-contact');
    if (o.address) {
      var r = el('div', 'bp-row');
      r.appendChild(el('div', 'bp-row-label', '📍 ' + o.address));
      r.appendChild(link('https://waze.com/ul?q=' + encodeURIComponent(o.address) + '&navigate=yes', 'ניווט ב-Waze', 'bp-chip'));
      wrap.appendChild(r);
    }
    if (o.phone) {
      var pr = el('div', 'bp-row');
      var pl = el('div', 'bp-row-label', '📞 ');
      pl.appendChild(ltr(o.phone));
      pr.appendChild(pl);
      var intl = normalizePhone(o.phone);
      var call = el('a', 'bp-chip', 'התקשרו');
      call.href = 'tel:+' + intl;
      pr.appendChild(call);
      pr.appendChild(link('https://wa.me/' + intl, 'וואטסאפ', 'bp-chip'));
      wrap.appendChild(pr);
    }
    if (ig) {
      var ir = el('div', 'bp-row');
      ir.appendChild(link(ig, 'עקבו באינסטגרם', 'bp-chip'));
      wrap.appendChild(ir);
    }
    cc.appendChild(wrap);
    root.appendChild(cc);
  }

  // Lazy, small thumbnails only; no full-size load at all.
  function renderGallery(root, imgs, alt) {
    imgs = Array.isArray(imgs) ? imgs.filter(Boolean) : [];
    if (!imgs.length) return;
    var gc = card('גלריה');
    var g = el('div', 'bp-gallery');
    imgs.forEach(function (u) {
      var im = el('img');
      im.src = cld(u, 'w_480,c_limit,q_auto,f_auto');
      im.alt = alt;
      im.loading = 'lazy';
      im.decoding = 'async';
      im.width = 480; im.height = 360;
      g.appendChild(im);
    });
    gc.appendChild(g);
    root.appendChild(gc);
  }

  function heroAvatar(hero, url, alt) {
    if (!url) return;
    var av = el('img', 'bp-avatar');
    av.src = cld(url, 'w_240,h_240,c_fill,g_auto,q_auto,f_auto');
    av.alt = alt;
    av.width = 112; av.height = 112;
    av.decoding = 'async';
    hero.appendChild(av);
  }

  // ---------- Network ----------
  function getJson(url, timeoutMs) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, timeoutMs);
    return fetch(url, { signal: ctrl.signal }).then(function (res) {
      clearTimeout(t);
      if (res.status === 404) { var e = new Error('notfound'); e.notFound = true; throw e; }
      if (!res.ok) throw new Error('http ' + res.status);
      return res.json();
    }, function (err) { clearTimeout(t); throw err; });
  }

  // ---------- Page chrome: loading / error states ----------
  function showError(title, text, canRetry) {
    $('bpSkeleton').hidden = true;
    $('bpContent').hidden = true;
    $('bpCtaBar').hidden = true;
    $('bpErrorTitle').textContent = title;
    $('bpErrorText').textContent = text;
    $('bpRetry').hidden = !canRetry;
    $('bpError').hidden = false;
  }
  function showContent(ctaHref) {
    $('bpCta').href = ctaHref;
    $('bpCtaBar').hidden = false;
    $('bpSkeleton').hidden = true;
    $('bpError').hidden = true;
    $('bpContent').hidden = false;
  }
  // Starts a load; calls fetcher(), then onData(result). Handles the cold-start note and errors.
  function runLoad(fetcher, onData) {
    $('bpError').hidden = true;
    $('bpSkeleton').hidden = false;
    $('bpWake').hidden = true;
    var wakeTimer = setTimeout(function () { $('bpWake').hidden = false; }, 3000);
    fetcher().then(function (r) {
      clearTimeout(wakeTimer);
      onData(r);
    }).catch(function (err) {
      clearTimeout(wakeTimer);
      if (err && err.notFound) showError('העמוד לא נמצא', 'הקישור אינו תקין או שהעסק כבר לא פעיל.', false);
      else showError('לא הצלחנו לטעון את העמוד', 'נסו שוב בעוד רגע.', true);
    });
  }

  // Entry-click alert to the app owner (same beacon as the main site).
  function initBeacon(labelPrefix, pathSuffix) {
    document.addEventListener('click', function (e) {
      try {
        var a = e.target && e.target.closest ? e.target.closest('a[href^="' + APP + '"]') : null;
        if (!a) return;
        var label = (a.textContent || '').replace(/[^֐-׿a-zA-Z0-9 '"\-\/]/g, '').replace(/\s+/g, ' ').trim();
        var data = new URLSearchParams({
          label: labelPrefix + ': ' + label,
          path: location.pathname + pathSuffix,
          referrer: document.referrer || '',
          lang: navigator.language || ''
        });
        if (!(navigator.sendBeacon && navigator.sendBeacon(APP + '/api/landing-click', data))) {
          fetch(APP + '/api/landing-click', { method: 'POST', body: data, keepalive: true, mode: 'no-cors' }).catch(function () {});
        }
      } catch (err) { /* never block navigation */ }
    }, true);
  }

  window.BPC = {
    APP: APP, $: $, el: el, ltr: ltr, link: link, card: card, cld: cld,
    renderHours: renderHours, promoActive: promoActive, renderServices: renderServices,
    renderContact: renderContact, renderGallery: renderGallery, heroAvatar: heroAvatar,
    getJson: getJson, showError: showError, showContent: showContent, runLoad: runLoad, initBeacon: initBeacon
  };
})();
