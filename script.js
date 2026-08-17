(function () {
  "use strict";

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Desktop-with-mouse detection — the custom probe cursor and the
     "cursor: none" treatment should only ever apply here. Touch
     devices (phones, tablets, and touch-first laptops) are excluded
     even if their viewport happens to be wide. */
  var isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (isFinePointer) {
    document.body.classList.add('has-fine-pointer');
  }

  /* ============================================================
     SCROLL REVEAL — fade + rise elements into place as they enter
     the viewport. Falls back to "everything visible" if
     IntersectionObserver isn't available or motion is reduced.
     ============================================================ */
  var revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el, i) {
      el.style.setProperty('--reveal-i', i % 8);
      revealObserver.observe(el);
    });
  }


  /* ============================================================
     ROTARY NAV — Hover reveal, knob rotation & scroll sync
     ============================================================ */
  var nav = document.getElementById('rotaryNav');
  var knobBtn = document.getElementById('knobBtn');
  var indicator = document.getElementById('knobIndicator');
  var menu = document.getElementById('rotaryMenu');
  var links = Array.from(menu.querySelectorAll('a'));
  var closeTimer = null;
  var isHoveringLink = false;

  function setOpen(v) {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    nav.classList.toggle('open', v);
    knobBtn.setAttribute('aria-expanded', String(v));
  }

  // Hover to open rotary menu with electronics step-response animation
  nav.addEventListener('mouseenter', function () { setOpen(true); });
  nav.addEventListener('mouseleave', function () {
    closeTimer = window.setTimeout(function () { setOpen(false); }, 280);
  });

  knobBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!nav.classList.contains('open'));
  });

  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setOpen(false); knobBtn.focus(); }
  });

  // Section targets for continuous knob angle interpolation
  var sectionTargets = [
    { id: 'hero', angle: -120, el: document.querySelector('.hero') },
    { id: 'experience', angle: -80, el: document.getElementById('experience') },
    { id: 'projects', angle: -40, el: document.getElementById('projects') },
    { id: 'patent', angle: 0, el: document.getElementById('patent') },
    { id: 'education', angle: 40, el: document.getElementById('education') },
    { id: 'certifications', angle: 80, el: document.getElementById('certifications') },
    { id: 'contact', angle: 120, el: document.getElementById('contact') }
  ];

  var currentScrollAngle = -120;

  function calculateScrollAngle() {
    var scrollY = window.scrollY;
    var windowH = window.innerHeight;
    var docH = document.documentElement.scrollHeight;
    var maxScroll = docH - windowH;
    if (maxScroll <= 0) return -120;

    var viewportTarget = scrollY + windowH * 0.35;

    for (var i = 0; i < sectionTargets.length - 1; i++) {
      var s1 = sectionTargets[i];
      var s2 = sectionTargets[i + 1];
      var t1 = s1.el ? s1.el.offsetTop : 0;
      var t2 = s2.el ? s2.el.offsetTop : docH;

      if (viewportTarget >= t1 && viewportTarget <= t2) {
        var ratio = (viewportTarget - t1) / (t2 - t1);
        return s1.angle + (s2.angle - s1.angle) * ratio;
      }
    }

    if (viewportTarget >= sectionTargets[sectionTargets.length - 1].el.offsetTop) {
      return sectionTargets[sectionTargets.length - 1].angle;
    }

    return -120;
  }

  function updateKnobAndNav() {
    currentScrollAngle = calculateScrollAngle();

    if (!isHoveringLink) {
      indicator.style.setProperty('--knob-angle', currentScrollAngle.toFixed(1) + 'deg');
    }

    // Active menu link highlight
    var viewportMid = window.scrollY + window.innerHeight * 0.35;
    var activeId = 'hero';
    sectionTargets.forEach(function (s) {
      if (s.el && viewportMid >= s.el.offsetTop - 80) {
        activeId = s.id;
      }
    });

    links.forEach(function (a) {
      var href = a.getAttribute('href').replace('#', '');
      if (href === activeId) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', function () {
    if (!reduceMotion) {
      window.requestAnimationFrame(updateKnobAndNav);
    } else {
      updateKnobAndNav();
    }
  }, { passive: true });

  links.forEach(function (a) {
    var targetAngle = a.getAttribute('data-angle');
    a.addEventListener('mouseenter', function () {
      isHoveringLink = true;
      indicator.style.setProperty('--knob-angle', targetAngle + 'deg');
    });
    a.addEventListener('focus', function () {
      isHoveringLink = true;
      indicator.style.setProperty('--knob-angle', targetAngle + 'deg');
    });
    a.addEventListener('mouseleave', function () {
      isHoveringLink = false;
      indicator.style.setProperty('--knob-angle', currentScrollAngle.toFixed(1) + 'deg');
    });
    a.addEventListener('blur', function () {
      isHoveringLink = false;
      indicator.style.setProperty('--knob-angle', currentScrollAngle.toFixed(1) + 'deg');
    });
    a.addEventListener('click', function () {
      setOpen(false);
    });
  });

  updateKnobAndNav();

  /* ============================================================
     CUSTOM SHORT PROBE CURSOR WITH STEADY WAVY TRAILING WIRE
     Desktop-with-mouse only (see isFinePointer above) — never
     constructed on touch devices, so there's nothing left behind
     for a finger tap to trigger.
     ============================================================ */
  if (!reduceMotion && isFinePointer) {
    var cursorEl = document.createElement('div');
    cursorEl.id = 'probeCustomCursor';
    cursorEl.setAttribute('aria-hidden', 'true');
    cursorEl.innerHTML = '<svg width="64" height="64" viewBox="0 0 64 64" fill="none">' +
      '<line x1="0" y1="0" x2="4" y2="4" stroke="#fdfaf2" stroke-width="1.8" stroke-linecap="round"/>' +
      '<polygon points="3,3 8,4 4,8" fill="#82e0a0"/>' +
      '<line x1="7" y1="5" x2="5" y2="7" stroke="#f0b84e" stroke-width="2.2" stroke-linecap="round"/>' +
      '<line x1="6" y1="6" x2="14" y2="14" stroke="#1c2b25" stroke-width="4.5" stroke-linecap="round"/>' +
      '<line x1="6" y1="6" x2="14" y2="14" stroke="#5fbf7a" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="9" y1="9" x2="11" y2="11" stroke="#f0b84e" stroke-width="3" stroke-linecap="round"/>' +
      '<path id="probeWirePath" d="M 14 14 Q 24 16 20 28 T 30 38" stroke="#5fbf7a" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
      '<path id="probeWireCore" d="M 14 14 Q 24 16 20 28 T 30 38" stroke="#f0b84e" stroke-width="0.8" stroke-linecap="round" fill="none"/>' +
      '<circle id="probeWireTip" cx="30" cy="38" r="1.2" fill="#f0b84e"/>' +
      '</svg>';
    document.body.appendChild(cursorEl);

    var wirePath = document.getElementById('probeWirePath');
    var wireCore = document.getElementById('probeWireCore');
    var wireTip = document.getElementById('probeWireTip');

    var cursorX = -100, cursorY = -100;
    var prevX = -100, prevY = -100;

    // Smooth motion offset for wavy wire (zero when stationary)
    var offsetX = 0, offsetY = 0;

    window.addEventListener('mousemove', function (e) {
      cursorX = e.clientX;
      cursorY = e.clientY;

      if (e.target && e.target.closest('#rotaryNav')) {
        cursorEl.classList.add('hidden');
      } else {
        cursorEl.classList.remove('hidden');
      }
    }, { passive: true });

    function animateProbeCursor() {
      cursorEl.style.transform = 'translate3d(' + cursorX + 'px, ' + cursorY + 'px, 0)';

      var mdx = cursorX - prevX;
      var mdy = cursorY - prevY;
      prevX = cursorX;
      prevY = cursorY;

      var speed = Math.sqrt(mdx * mdx + mdy * mdy);

      if (speed > 0.2) {
        var targetOx = -mdx * 0.75;
        var targetOy = -mdy * 0.75;
        offsetX += (targetOx - offsetX) * 0.25;
        offsetY += (targetOy - offsetY) * 0.25;
      } else {
        offsetX *= 0.8;
        offsetY *= 0.8;
        if (Math.abs(offsetX) < 0.05) offsetX = 0;
        if (Math.abs(offsetY) < 0.05) offsetY = 0;
      }

      var q1x = 24 + offsetX * 0.4;
      var q1y = 16 + offsetY * 0.4;
      var q2x = 20 + offsetX * 0.75;
      var q2y = 28 + offsetY * 0.75;
      var xEnd = 30 + offsetX;
      var yEnd = 38 + offsetY;

      var dPath = 'M 14 14 Q ' + q1x.toFixed(1) + ' ' + q1y.toFixed(1) + ' ' + q2x.toFixed(1) + ' ' + q2y.toFixed(1) + ' T ' + xEnd.toFixed(1) + ' ' + yEnd.toFixed(1);

      wirePath.setAttribute('d', dPath);
      wireCore.setAttribute('d', dPath);
      wireTip.setAttribute('cx', xEnd.toFixed(1));
      wireTip.setAttribute('cy', yEnd.toFixed(1));

      window.requestAnimationFrame(animateProbeCursor);
    }

    window.requestAnimationFrame(animateProbeCursor);
  }
})();

