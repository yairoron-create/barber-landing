// Public barber page (barber-app.com/b/?id=<barberId>).
// Pulls everything live from the app's public API, so the barber edits in one place (the app) and
// this page follows. Shared helpers live in page-common.js (window.BPC).
(function () {
  'use strict';
  var B = window.BPC;
  var barberId = (new URLSearchParams(location.search).get('id') || '').trim();

  function render(info, services) {
    var name = (info.businessName || info.fullName || '').trim();
    document.title = name ? name + ' – קביעת תור' : 'קביעת תור – תור-Q';

    var root = B.$('bpContent');
    root.textContent = '';

    var hero = B.el('section', 'bp-hero');
    B.heroAvatar(hero, info.profileImage, name);
    hero.appendChild(B.el('h1', null, name));
    if (info.shopDescription) hero.appendChild(B.el('p', 'bp-desc', info.shopDescription));
    root.appendChild(hero);

    if (B.promoActive(info.promotionText, info.promotionExpiry)) root.appendChild(B.el('div', 'bp-promo', '🎉 ' + info.promotionText));

    if (services.length) {
      var sc = B.card('שירותים ומחירים');
      B.renderServices(sc, services, info.businessType);
      root.appendChild(sc);
    }

    if (Array.isArray(info.daySchedule) && info.daySchedule.length === 7) {
      var hc = B.card('שעות פעילות');
      B.renderHours(hc, info.daySchedule);
      root.appendChild(hc);
    }

    B.renderContact(root, { phone: info.shopPhone || info.phone, address: info.shopAddress, instagramUrl: info.instagramUrl });
    B.renderGallery(root, info.shopImages, name);

    // Booking CTA → the existing app flow with the barber pre-selected
    B.showContent(B.APP + '/?barber=' + encodeURIComponent(barberId));
  }

  function load() {
    B.runLoad(function () {
      return Promise.all([
        B.getJson(B.APP + '/api/admin/barber-info/' + encodeURIComponent(barberId), 75000),
        B.getJson(B.APP + '/api/services?barberId=' + encodeURIComponent(barberId) + '&activeOnly=true', 75000)
      ]);
    }, function (r) { render(r[0], (r[1] && r[1].services) || []); });
  }

  B.initBeacon('עמוד ספר', '?id=' + barberId.slice(-6));
  B.$('bpRetry').addEventListener('click', load);
  if (!/^[a-f0-9]{24}$/i.test(barberId)) B.showError('העמוד לא נמצא', 'הקישור אינו תקין.', false);
  else load();
})();
