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
