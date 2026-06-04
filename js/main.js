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
  if (mobile) mobile.classList.remove('nav__mobile--open');
  if (burger) burger.classList.remove('nav__burger--open');
}

// Toggle menu mobile — chamado via onclick no HTML
function toggleMenu() {
  var mobile = document.getElementById('navMobile');
  var burger = document.querySelector('.nav__burger');
  if (!mobile) return;
  var isOpen = mobile.classList.toggle('nav__mobile--open');
  if (burger) burger.classList.toggle('nav__burger--open', isOpen);
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
