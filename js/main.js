// Romero Finances — main.js

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var navH = document.getElementById('nav') ? document.getElementById('nav').offsetHeight : 68;
      var top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  // Fecha menu mobile ao clicar num link dentro dele
  document.querySelectorAll('#navMobile a').forEach(function (link) {
    link.addEventListener('click', function () {
      closeMobileMenu();
    });
  });

  // Carrossel testemunhos
  initCarousels();
});

// Nav scroll shadow
window.addEventListener('scroll', function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  if (window.scrollY > 10) {
    nav.classList.add('nav--scrolled');
  } else {
    nav.classList.remove('nav--scrolled');
  }
});

// Fecha o menu mobile (helper reutilizável)
function closeMobileMenu() {
  var mobile = document.getElementById('navMobile');
  var burger = document.querySelector('.nav__burger');
  var acc = document.getElementById('accAssurance');
  if (mobile) mobile.classList.remove('nav__mobile--open');
  if (burger) burger.classList.remove('nav__burger--open');
  if (acc) acc.classList.remove('nav__mobile-acc--open');
}

// Toggle menu mobile — chamado via onclick no HTML
function toggleMenu() {
  var mobile = document.getElementById('navMobile');
  var burger = document.querySelector('.nav__burger');
  if (!mobile) return;
  var isOpen = mobile.classList.toggle('nav__mobile--open');
  if (burger) burger.classList.toggle('nav__burger--open', isOpen);
}

// Toggle accordion assurance no menu mobile
function toggleMobileAcc() {
  var acc = document.getElementById('accAssurance');
  if (acc) acc.classList.toggle('nav__mobile-acc--open');
}

// Fecha menu mobile ao clicar fora da nav
document.addEventListener('click', function (e) {
  var nav = document.getElementById('nav');
  var mobile = document.getElementById('navMobile');
  if (!mobile || !nav) return;
  if (mobile.classList.contains('nav__mobile--open') && !nav.contains(e.target)) {
    closeMobileMenu();
  }
});

// Toggle do seletor de línguas — chamado via onclick no HTML
function toggleLang() {
  var lang = document.getElementById('langSwitch');
  if (!lang) return;
  var isOpen = lang.classList.toggle('lang--open');
  var toggle = lang.querySelector('.lang__toggle');
  if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

// Fecha o seletor de línguas ao clicar fora
document.addEventListener('click', function (e) {
  var lang = document.getElementById('langSwitch');
  if (!lang) return;
  if (lang.classList.contains('lang--open') && !lang.contains(e.target)) {
    lang.classList.remove('lang--open');
    var toggle = lang.querySelector('.lang__toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
});

// FAQ accordion
function toggleFaq(item) {
  var isOpen = item.classList.contains('faq__item--open');
  document.querySelectorAll('.faq__item').forEach(function (el) {
    el.classList.remove('faq__item--open');
  });
  if (!isOpen) {
    item.classList.add('faq__item--open');
  }
}

// Carrossel testemunhos — swipe + dots + setas
function initCarousels() {
  document.querySelectorAll('.temoignages__grid').forEach(function (grid) {
    var items = grid.querySelectorAll('.temoignage');
    if (items.length < 2) return;

    // Wrapper com position: relative para as setas
    var wrap = document.createElement('div');
    wrap.className = 'temoignages__carousel-wrap';
    grid.parentNode.insertBefore(wrap, grid);
    wrap.appendChild(grid);

    // Setas prev/next
    var btnPrev = document.createElement('button');
    btnPrev.className = 'temoignages__arrow temoignages__arrow--prev';
    btnPrev.setAttribute('aria-label', 'Précédent');
    btnPrev.innerHTML = '&#8249;';
    wrap.appendChild(btnPrev);

    var btnNext = document.createElement('button');
    btnNext.className = 'temoignages__arrow temoignages__arrow--next';
    btnNext.setAttribute('aria-label', 'Suivant');
    btnNext.innerHTML = '&#8250;';
    wrap.appendChild(btnNext);

    // Dots abaixo do wrapper
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'temoignages__dots';
    wrap.parentNode.insertBefore(dotsWrap, wrap.nextSibling);

    var dots = [];
    var current = 0;

    items.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'temoignages__dot' + (i === 0 ? ' temoignages__dot--active' : '');
      dot.setAttribute('aria-label', 'Témoignage ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function updateDots(idx) {
      dots.forEach(function (d, i) {
        d.classList.toggle('temoignages__dot--active', i === idx);
      });
    }

    function goTo(idx) {
      current = Math.max(0, Math.min(idx, items.length - 1));
      grid.scrollTo({ left: current * grid.offsetWidth, behavior: 'smooth' });
      updateDots(current);
    }

    btnPrev.addEventListener('click', function () { goTo(current - 1); });
    btnNext.addEventListener('click', function () { goTo(current + 1); });

    // Touch swipe
    var touchX = 0;
    grid.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    grid.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) {
        goTo(dx < 0 ? current + 1 : current - 1);
      }
    }, { passive: true });

    // Sync dots on scroll
    grid.addEventListener('scroll', function () {
      var idx = Math.round(grid.scrollLeft / grid.offsetWidth);
      if (idx !== current) { current = idx; updateDots(current); }
    }, { passive: true });
  });
}
