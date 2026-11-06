// ===== Entry-click alert to the app owner =====
// Any click on a link that leads into the app sends one anonymous beacon (button label, page,
// referrer, language) so the owner can get a push. Fire-and-forget; never delays navigation.
(function () {
  var APP = 'https://barber-appointments-vimn.onrender.com';
  var ENDPOINT = APP + '/api/landing-click';
  document.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="' + APP + '"]') : null;
      if (!a) return;
      var label = (a.textContent || '').replace(/[^֐-׿a-zA-Z0-9 '"\-\/]/g, '').replace(/\s+/g, ' ').trim();
      var data = new URLSearchParams({
        label: label,
        path: location.pathname,
        referrer: document.referrer || '',
        lang: navigator.language || ''
      });
      if (!(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, data))) {
        fetch(ENDPOINT, { method: 'POST', body: data, keepalive: true, mode: 'no-cors' }).catch(function () {});
      }
    } catch (err) { /* never block navigation */ }
  }, true);
})();

// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Sticky header shadow on scroll =====
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
});

// ===== Mobile nav toggle =====
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

navToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => mainNav.classList.remove('open'));
});

// ===== FAQ accordion =====
document.querySelectorAll('.faq-item').forEach((item) => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ===== Pricing toggle =====
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.pricing;
    document.getElementById('pricing-barber').style.display  = target === 'barber'   ? 'grid' : 'none';
    document.getElementById('pricing-grooming').style.display = target === 'grooming' ? 'grid' : 'none';
    document.getElementById('note-barber').style.display      = target === 'barber'   ? 'block' : 'none';
    document.getElementById('note-grooming').style.display    = target === 'grooming' ? 'block' : 'none';
  });
});

// ===== Pricing tab from URL param (?tab=grooming) =====
if (new URLSearchParams(window.location.search).get('tab') === 'grooming') {
  const groomingBtn = document.querySelector('.toggle-btn[data-pricing="grooming"]');
  if (groomingBtn) groomingBtn.click();
}

// ===== Request a demo button =====
const requestDemoBtn = document.getElementById('requestDemoBtn');
if (requestDemoBtn) {
  requestDemoBtn.addEventListener('click', function () {
    const messageField = document.getElementById('contactMessage');
    const subjectField = document.getElementById('contactSubject');
    const demoText = 'אני מבקש/ת לראות הדגמה.';

    if (!messageField.value.startsWith(demoText)) {
      messageField.value = messageField.value
        ? `${demoText} ${messageField.value}`
        : `${demoText} `;
    }
    if (subjectField) subjectField.value = 'בקשת הדגמה מדף הנחיתה של ‫תור-Q‬';

    messageField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    messageField.focus();
    messageField.setSelectionRange(messageField.value.length, messageField.value.length);
  });
}

// ===== Contact form =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const submitBtn = document.getElementById('contactSubmitBtn');
    const successMsg = document.getElementById('formSuccess');
    const errorMsg = document.getElementById('formError');

    submitBtn.disabled = true;
    submitBtn.textContent = 'שולח...';

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(contactForm)
      });
      const data = await res.json();
      if (data.success) {
        successMsg.style.display = 'block';
        errorMsg.style.display = 'none';
        contactForm.reset();
        submitBtn.textContent = 'נשלח ✓';
      } else {
        throw new Error();
      }
    } catch {
      errorMsg.style.display = 'block';
      successMsg.style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.textContent = 'שליחה';
    }
  });
}

// ===== Scroll reveal animations =====
const revealEls = document.querySelectorAll('.reveal');
// Old browsers (Safari < 12.2) have no IntersectionObserver — without this guard the script throws
// and every .reveal element (including the hero) stays at opacity:0 forever.
if (!('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-visible'));
} else {
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => observer.observe(el));
}
