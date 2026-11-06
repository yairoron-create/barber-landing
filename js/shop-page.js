// Public shop page (barber-app.com/b/shop.html?id=<shopId>): the shop, its team, merged services and
// shop-wide hours, pulled live from the app's public API. Shared helpers: page-common.js (window.BPC).
(function () {
  'use strict';
  var B = window.BPC;
  var shopId = (new URLSearchParams(location.search).get('id') || '').trim();

  // Shop hours per day = earliest start .. latest end among the barbers working that day.
  function unionSchedule(team) {
    var withSchedule = team.filter(function (m) { return Array.isArray(m.daySchedule) && m.daySchedule.length === 7; });
    if (!withSchedule.length) return null;
    var out = [];
    for (var d = 0; d < 7; d++) {
      var start = null, end = null;
      withSchedule.forEach(function (m) {
        var day = m.daySchedule.filter(function (x) { return x.day === d; })[0];
        if (!day || !day.active) return;
        start = start === null ? day.start : Math.min(start, day.start);
        end = end === null ? day.end : Math.max(end, day.end);
      });
      out.push({ day: d, active: start !== null, start: start, end: end });
    }
    return out;
  }

  function memberCard(m) {
    var c = B.el('div', 'bp-member');
    if (m.profileImage) {
      var im = B.el('img', 'bp-member-avatar');
      im.src = B.cld(m.profileImage, 'w_160,h_160,c_fill,g_auto,q_auto,f_auto');
      im.alt = m.fullName;
      im.loading = 'lazy'; im.decoding = 'async'; im.width = 56; im.height = 56;
      c.appendChild(im);
    } else {
      c.appendChild(B.el('div', 'bp-member-avatar bp-member-initials', String(m.fullName || '?').trim().charAt(0)));
    }
    var body = B.el('div', 'bp-member-body');
    body.appendChild(B.el('div', 'bp-member-name', m.fullName));
    if (m.shopDescription) body.appendChild(B.el('div', 'bp-member-desc', m.shopDescription));
    c.appendChild(body);
    var first = String(m.fullName || '').trim().split(/\s+/)[0] || 'הצוות';
    var a = B.el('a', 'bp-chip', 'קבעו תור אצל ' + first);
    a.href = B.APP + '/?barber=' + encodeURIComponent(m._id);
    c.appendChild(a);
    return c;
  }

  function render(data, services) {
    var shop = data.shop || {};
    var team = (data.team || []).filter(function (m) { return m.role === 'owner-barber' || m.role === 'barber'; });
    team.sort(function (a, b) { return (b.role === 'owner-barber') - (a.role === 'owner-barber'); });
    var name = String(shop.name || '').trim();
    document.title = name ? name + ' – קביעת תור' : 'קביעת תור – תור-Q';

    var root = B.$('bpContent');
    root.textContent = '';

    var hero = B.el('section', 'bp-hero');
    B.heroAvatar(hero, shop.profileImage, name);
    hero.appendChild(B.el('h1', null, name));
    if (shop.description) hero.appendChild(B.el('p', 'bp-desc', shop.description));
    root.appendChild(hero);

    if (B.promoActive(shop.promotionText, shop.promotionExpiry)) root.appendChild(B.el('div', 'bp-promo', '🎉 ' + shop.promotionText));

    if (team.length) {
      var tc = B.card('הצוות שלנו');
      var list = B.el('div', 'bp-team');
      team.forEach(function (m) { list.appendChild(memberCard(m)); });
      tc.appendChild(list);
      root.appendChild(tc);
    }

    if (services.length) {
      var sc = B.card('שירותים ומחירים');
      B.renderServices(sc, services, shop.businessType);
      root.appendChild(sc);
    }

    var hours = unionSchedule(team);
    if (hours) {
      var hc = B.card('שעות פעילות');
      B.renderHours(hc, hours);
      root.appendChild(hc);
    }

    B.renderContact(root, { phone: shop.shopPhone || shop.ownerPhone, address: shop.address, instagramUrl: shop.instagramUrl });
    B.renderGallery(root, shop.shopImages, name);

    // Booking CTA -> the app's shop page (the customer picks a team member there)
    B.showContent(B.APP + '/?shop=' + encodeURIComponent(shopId));
  }

  function load() {
    B.runLoad(function () {
      return Promise.all([
        B.getJson(B.APP + '/api/shop/' + encodeURIComponent(shopId), 75000),
        B.getJson(B.APP + '/api/shop/' + encodeURIComponent(shopId) + '/services', 75000)
      ]);
    }, function (r) { render(r[0], (r[1] && r[1].services) || []); });
  }

  B.initBeacon('עמוד מספרה', '?id=' + shopId.slice(-6));
  B.$('bpRetry').addEventListener('click', load);
  if (!/^[a-f0-9]{24}$/i.test(shopId)) B.showError('העמוד לא נמצא', 'הקישור אינו תקין.', false);
  else load();
})();
