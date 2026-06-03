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

// Mobile menu toggle
function toggleMenu() {
  var mobile = document.getElementById('navMobile');
  if (!mobile) return;
  mobile.classList.toggle('nav__mobile--open');
}

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
