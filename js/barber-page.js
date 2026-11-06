// Public barber page (barber-app.com/b/?id=<barberId>).
// Pulls everything live from the app's public API, so the barber edits in one place (the app) and
// this page follows. All user-supplied text is inserted via textContent (never innerHTML).
(function () {
  'use strict';

  var APP = 'https://barber-appointments-vimn.onrender.com';
  var DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var CATEGORY_ORDER = ['men', 'women', 'children', 'general'];
  var CATEGORY_LABELS = {
    barber: { men: 'גברים', women: 'נשים', children: 'ילדים', general: 'כללי' },
    'pet-grooming': { men: 'כלבים', women: 'חתולים', children: 'טיפוח', general: 'כללי' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var barberId = (new URLSearchParams(location.search).get('id') || '').trim();

  // ---------- Small DOM helpers ----------
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }
  function ltr(text) { // numbers / times / prices must not be bidi-reordered inside RTL text
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

  // ---------- Cloudinary: keep delivery tiny (auto format/quality, capped width) ----------
  function cld(url, transform) {
    if (typeof url !== 'string') return '';
    var marker = '/image/upload/';
    if (url.indexOf('https://res.cloudinary.com/') !== 0 || url.indexOf(marker) === -1) return url;
    return url.replace(marker, marker + transform + '/');
  }

  // ---------- Formatting ----------
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

  // ---------- Rendering ----------
  function renderServices(container, services, info) {
    var labels = CATEGORY_LABELS[info.businessType] || CATEGORY_LABELS.barber;
    var byCat = {};
    services.forEach(function (s) {
      var c = CATEGORY_ORDER.indexOf(s.category) === -1 ? 'general' : s.category;
      (byCat[c] = byCat[c] || []).push(s);
    });
    var usedCats = CATEGORY_ORDER.filter(function (c) { return byCat[c] && byCat[c].length; });
    usedCats.forEach(function (c) {
      if (usedCats.length > 1) container.appendChild(el('div', 'bp-cat', labels[c]));
      byCat[c].sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'he'); });
      byCat[c].forEach(function (s) {
        var row = el('div', 'bp-svc');
        var left = el('div');
        left.appendChild(el('div', 'bp-svc-name', s.name));
        // Durations are never shown on this page (marketing view); a compound service just says so.
        if (s.hasBreak) left.appendChild(el('div', 'bp-svc-extra', 'כולל הפסקה באמצע'));
        var price;
        if (s.price != null && s.price !== '') {
          price = el('div', 'bp-svc-price');
          price.appendChild(ltr('₪' + s.price));
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

  function card(title) {
    var c = el('section', 'bp-card');
    if (title) c.appendChild(el('h2', null, title));
    return c;
  }

  function render(info, services) {
    var name = (info.businessName || info.fullName || '').trim();
    document.title = name ? name + ' – קביעת תור' : 'קביעת תור – תור-Q';

    var root = $('bpContent');
    root.textContent = '';

    // Hero
    var hero = el('section', 'bp-hero');
    if (info.profileImage) {
      var av = el('img', 'bp-avatar');
      av.src = cld(info.profileImage, 'w_240,h_240,c_fill,g_auto,q_auto,f_auto');
      av.alt = name;
      av.width = 112; av.height = 112;
      av.decoding = 'async';
      hero.appendChild(av);
    }
    hero.appendChild(el('h1', null, name));
    if (info.shopDescription) hero.appendChild(el('p', 'bp-desc', info.shopDescription));
    root.appendChild(hero);

    // Active promotion
    var promoActive = info.promotionText && (!info.promotionExpiry || new Date(info.promotionExpiry) >= new Date(new Date().toDateString()));
    if (promoActive) root.appendChild(el('div', 'bp-promo', '🎉 ' + info.promotionText));

    // Services
    if (services.length) {
      var sc = card('שירותים ומחירים');
      renderServices(sc, services, info);
      root.appendChild(sc);
    }

    // Hours
    if (Array.isArray(info.daySchedule) && info.daySchedule.length === 7) {
      var hc = card('שעות פעילות');
      renderHours(hc, info.daySchedule);
      root.appendChild(hc);
    }

    // Contact
    var phone = info.shopPhone || info.phone;
    var ig = instagramHref(info.instagramUrl);
    if (phone || info.shopAddress || ig) {
      var cc = card('יצירת קשר');
      var wrap = el('div', 'bp-contact');
      if (info.shopAddress) {
        var r = el('div', 'bp-row');
        r.appendChild(el('div', 'bp-row-label', '📍 ' + info.shopAddress));
        r.appendChild(link('https://waze.com/ul?q=' + encodeURIComponent(info.shopAddress) + '&navigate=yes', 'ניווט ב-Waze', 'bp-chip'));
        wrap.appendChild(r);
      }
      if (phone) {
        var pr = el('div', 'bp-row');
        var pl = el('div', 'bp-row-label', '📞 ');
        pl.appendChild(ltr(phone));
        pr.appendChild(pl);
        var intl = normalizePhone(phone);
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

    // Gallery (lazy, small thumbnails; no full-size loading at all)
    var imgs = Array.isArray(info.shopImages) ? info.shopImages.filter(Boolean) : [];
    if (imgs.length) {
      var gc = card('גלריה');
      var g = el('div', 'bp-gallery');
      imgs.forEach(function (u) {
        var im = el('img');
        im.src = cld(u, 'w_480,c_limit,q_auto,f_auto');
        im.alt = name;
        im.loading = 'lazy';
        im.decoding = 'async';
        im.width = 480; im.height = 360;
        g.appendChild(im);
      });
      gc.appendChild(g);
      root.appendChild(gc);
    }

    // Booking CTA → the existing app flow with the barber pre-selected
    $('bpCta').href = APP + '/?barber=' + encodeURIComponent(barberId);
    $('bpCtaBar').hidden = false;

    $('bpSkeleton').hidden = true;
    $('bpError').hidden = true;
    root.hidden = false;
  }

  function showError(title, text, canRetry) {
    $('bpSkeleton').hidden = true;
    $('bpContent').hidden = true;
    $('bpCtaBar').hidden = true;
    $('bpErrorTitle').textContent = title;
    $('bpErrorText').textContent = text;
    $('bpRetry').hidden = !canRetry;
    $('bpError').hidden = false;
  }

  // ---------- Data loading ----------
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

  function load() {
    $('bpError').hidden = true;
    $('bpSkeleton').hidden = false;
    $('bpWake').hidden = true;
    var wakeTimer = setTimeout(function () { $('bpWake').hidden = false; }, 3000);

    Promise.all([
      getJson(APP + '/api/admin/barber-info/' + encodeURIComponent(barberId), 75000),
      getJson(APP + '/api/services?barberId=' + encodeURIComponent(barberId) + '&activeOnly=true', 75000)
    ]).then(function (r) {
      clearTimeout(wakeTimer);
      render(r[0], (r[1] && r[1].services) || []);
    }).catch(function (err) {
      clearTimeout(wakeTimer);
      if (err && err.notFound) showError('העמוד לא נמצא', 'הקישור אינו תקין או שהעסק כבר לא פעיל.', false);
      else showError('לא הצלחנו לטעון את העמוד', 'נסו שוב בעוד רגע.', true);
    });
  }

  // ---------- Entry-click alert to the app owner (same beacon as the main site) ----------
  document.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="' + APP + '"]') : null;
      if (!a) return;
      var label = (a.textContent || '').replace(/[^֐-׿a-zA-Z0-9 '"\-\/]/g, '').replace(/\s+/g, ' ').trim();
      var data = new URLSearchParams({
        label: 'עמוד ספר: ' + label,
        path: location.pathname + '?id=' + barberId.slice(-6),
        referrer: document.referrer || '',
        lang: navigator.language || ''
      });
      if (!(navigator.sendBeacon && navigator.sendBeacon(APP + '/api/landing-click', data))) {
        fetch(APP + '/api/landing-click', { method: 'POST', body: data, keepalive: true, mode: 'no-cors' }).catch(function () {});
      }
    } catch (err) { /* never block navigation */ }
  }, true);

  // ---------- Boot ----------
  $('bpRetry').addEventListener('click', load);
  if (!/^[a-f0-9]{24}$/i.test(barberId)) {
    showError('העמוד לא נמצא', 'הקישור אינו תקין.', false);
  } else {
    load();
  }
})();
