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
     SCROLL REVEAL & TELEMETRY TRACE CONTROLLER
     The animation from Experience ONLY starts when the user starts
     scrolling down from Experience.
     ============================================================ */
  var revealEls = Array.from(document.querySelectorAll('.reveal'));
  var hasStartedScrolling = false;

  if (!reduceMotion && 'IntersectionObserver' in window && revealEls.length) {
    document.documentElement.classList.add('js-reveal');

    // All section & entry elements start primed and waiting
    revealEls.forEach(function (el, i) {
      el.style.setProperty('--reveal-i', i % 8);
      el.classList.add('primed');
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // Only trigger in-view if the user has actually started scrolling down
        if (entry.isIntersecting && (hasStartedScrolling || window.scrollY > 24)) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -20px 0px'
    });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

    function checkRevealsOnScroll() {
      if (window.scrollY > 24) {
        hasStartedScrolling = true;
      }

      if (hasStartedScrolling) {
        var windowH = window.innerHeight;
        revealEls.forEach(function (el) {
          if (el.classList.contains('primed') && !el.classList.contains('in-view')) {
            var r = el.getBoundingClientRect();
            if (r.top < windowH - 20 && r.bottom > 20) {
              el.classList.add('in-view');
              revealObserver.unobserve(el);
            }
          }
        });
      }

      // Ensure elements near the bottom of the page (e.g. Certifications) are revealed
      var scrollBottom = window.scrollY + window.innerHeight;
      var docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      if (scrollBottom >= docHeight - 80) {
        document.querySelectorAll('.reveal.primed:not(.in-view)').forEach(function (el) {
          el.classList.add('in-view');
        });
      }
    }

    window.addEventListener('scroll', checkRevealsOnScroll, { passive: true });
  }

  /* ============================================================
     CHANNELS DROPDOWN MENU CONTROLLER (Top-Right)
     ============================================================ */
  var channelsMenuWrap = document.getElementById('channelsMenuWrap');
  var channelsBtn = document.getElementById('channelsBtn');
  var channelItems = Array.from(document.querySelectorAll('.channel-item'));

  var sectionElements = [
    { id: 'hero', ch: 0, el: document.getElementById('hero') || document.querySelector('.hero') },
    { id: 'experience', ch: 1, el: document.getElementById('experience') },
    { id: 'projects', ch: 2, el: document.getElementById('projects') },
    { id: 'patent', ch: 3, el: document.getElementById('patent') },
    { id: 'skills', ch: 4, el: document.getElementById('skills') },
    { id: 'education', ch: 5, el: document.getElementById('education') },
    { id: 'certifications', ch: 6, el: document.getElementById('certifications') }
  ];

  var isNavClicking = false;
  var navClickTimeout = null;

  function toggleChannelsMenu(forceState) {
    if (!channelsMenuWrap || !channelsBtn) return;
    var isOpen = typeof forceState === 'boolean'
      ? forceState
      : !channelsMenuWrap.classList.contains('open');

    if (isOpen) {
      channelsMenuWrap.classList.add('open');
      channelsBtn.setAttribute('aria-expanded', 'true');
    } else {
      channelsMenuWrap.classList.remove('open');
      channelsBtn.setAttribute('aria-expanded', 'false');
    }
  }

  if (channelsBtn) {
    channelsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleChannelsMenu();
    });
  }

  // Close when clicking outside
  document.addEventListener('click', function (e) {
    if (channelsMenuWrap && channelsMenuWrap.classList.contains('open')) {
      if (!channelsMenuWrap.contains(e.target)) {
        toggleChannelsMenu(false);
      }
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && channelsMenuWrap && channelsMenuWrap.classList.contains('open')) {
      toggleChannelsMenu(false);
    }
  });

  function setActiveChannel(activeChannel) {
    // 1. Update dropdown items
    channelItems.forEach(function (item) {
      var nodeCh = parseInt(item.getAttribute('data-channel'), 10);
      if (nodeCh === activeChannel) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 2. Bidirectional feedback on section headers
    sectionElements.forEach(function (item) {
      if (!item.el) return;
      var tagState = item.el.querySelector('.channel-state');
      if (item.ch === activeChannel && item.ch > 0) {
        item.el.classList.add('channel-locked');
        if (tagState) tagState.textContent = 'ACTIVE';
      } else {
        item.el.classList.remove('channel-locked');
        if (tagState) tagState.textContent = 'STANDBY';
      }
    });

    // 4. Hero centerpiece subtle depth recession on scroll (applied to stage so telemetry line & dock remain fixed/crisp)
    var heroStageEl = document.querySelector('.hero-stage');
    if (heroStageEl) {
      var scrollY = window.scrollY;
      var windowH = window.innerHeight;
      if (scrollY <= windowH) {
        var progress = scrollY / windowH;
        heroStageEl.style.opacity = Math.max(0.15, 1 - progress * 1.15).toFixed(2);
        heroStageEl.style.transform = 'translate3d(0, ' + (progress * 35).toFixed(1) + 'px, 0) scale(' + (1 - progress * 0.04).toFixed(3) + ')';
      } else {
        heroStageEl.style.opacity = '0.15';
      }
    }
  }

  function updateActiveChannel() {
    if (isNavClicking) return;

    var scrollY = window.scrollY;
    var windowH = window.innerHeight;

    // A. At top of page -> Hero / Index
    if (scrollY < windowH * 0.35) {
      setActiveChannel(0);
      return;
    }

    // B. Calculate prominence of each section
    var bandTop = windowH * 0.1;
    var bandBottom = windowH * 0.65;
    var bestChannel = 1;
    var highestScore = -1;

    for (var i = 1; i < sectionElements.length; i++) {
      var s = sectionElements[i];
      if (!s.el) continue;
      var r = s.el.getBoundingClientRect();

      var oTop = Math.max(bandTop, r.top);
      var oBottom = Math.min(bandBottom, r.bottom);
      var overlap = Math.max(0, oBottom - oTop);

      var headerBonus = 0;
      if (r.top >= -30 && r.top <= windowH * 0.38) {
        headerBonus = 260 - Math.abs(r.top - 36);
      }

      var score = overlap + headerBonus;

      if (score > highestScore) {
        highestScore = score;
        bestChannel = s.ch;
      }
    }

    setActiveChannel(bestChannel);
  }

  function scrollToSection(targetId, targetChannel) {
    toggleChannelsMenu(false);
    if (targetChannel > 0) {
      hasStartedScrolling = true;
    }

    if (targetId === 'hero' || targetChannel === 0) {
      isNavClicking = true;
      if (navClickTimeout) clearTimeout(navClickTimeout);
      setActiveChannel(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navClickTimeout = setTimeout(function () {
        isNavClicking = false;
        updateActiveChannel();
      }, 850);
      return;
    }

    var targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    var rect = targetEl.getBoundingClientRect();
    var targetScrollY = window.scrollY + rect.top - 24;

    isNavClicking = true;
    if (navClickTimeout) clearTimeout(navClickTimeout);
    setActiveChannel(targetChannel);

    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: 'smooth'
    });

    navClickTimeout = setTimeout(function () {
      isNavClicking = false;
      updateActiveChannel();
    }, 850);
  }

  // Bind click handlers to dropdown items
  channelItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      var targetId = item.getAttribute('data-target');
      var targetCh = parseInt(item.getAttribute('data-channel'), 10);
      scrollToSection(targetId, targetCh);
    });
  });

  // Bind click handler to slide cue
  var slideCueEl = document.querySelector('.slide-cue');
  if (slideCueEl) {
    slideCueEl.addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection('experience', 1);
    });
  }

  window.addEventListener('scroll', function () {
    if (!reduceMotion) {
      window.requestAnimationFrame(updateActiveChannel);
    } else {
      updateActiveChannel();
    }
  }, { passive: true });

  window.addEventListener('resize', updateActiveChannel, { passive: true });

  window.addEventListener('scroll', function () {
    if (channelsMenuWrap && channelsMenuWrap.classList.contains('open')) {
      toggleChannelsMenu(false);
    }
  }, { passive: true });

  updateActiveChannel();

  /* ============================================================
     INTERACTIVE QUANTUM & RF ENERGY LATTICE (Hero Background)
     Replaces the cartoonish circuit topology with an elegant,
     ambient electromagnetic particle field with proximity laser
     connections and dynamic probe magnetism!
     ============================================================ */
  var circuitCanvas = document.getElementById('circuitCanvas');
  if (circuitCanvas && !reduceMotion) {
    var ctx = circuitCanvas.getContext('2d');
    var cW = 0, cH = 0;
    var mouseX = -1, mouseY = -1;
    var particles = [];
    var shockwaves = [];
    var plasmaClouds = [];
    var bootStartTime = performance.now();
    var isMobileOrTablet = window.innerWidth <= 960;
    var burstDelayMs = isMobileOrTablet ? 0 : 780;
    var latticeFadeDuration = isMobileOrTablet ? 0 : 550;

    function resizeCanvas() {
      if (!circuitCanvas || !circuitCanvas.parentElement) return;
      cW = circuitCanvas.width = circuitCanvas.parentElement.offsetWidth;
      cH = circuitCanvas.height = circuitCanvas.parentElement.offsetHeight;
      initParticles();
    }

    function initParticles() {
      particles = [];
      // Elegant density: ~65 particles across the canvas
      var count = Math.min(75, Math.max(45, Math.floor((cW * cH) / 14000)));
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * cW,
          y: Math.random() * cH,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 2.2 + 1.2,
          color: Math.random() > 0.4 ? '#5fbf7a' : '#f0b84e',
          alpha: Math.random() * 0.45 + 0.35
        });
      }
    }

    resizeCanvas();

    // Antenna EM plasma cloud puffs expanding upward on boot!
    function spawnAntennaCloudPuffs() {
      if (cW <= 0 || cH <= 0) return;
      var ax = cW * 0.5;
      var ay = cH - 18;

      // Spawn 32 billowing plasma cloud puffs expanding upward
      for (var i = 0; i < 32; i++) {
        var angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.5;
        var speed = Math.random() * 4.8 + 2.2;
        plasmaClouds.push({
          x: ax + (Math.random() - 0.5) * 16,
          y: ay,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 1.15,
          r: Math.random() * 25 + 18,
          maxR: Math.random() * 190 + 130,
          growRate: Math.random() * 3.4 + 2.2,
          opacity: Math.random() * 0.45 + 0.35,
          fadeRate: Math.random() * 0.012 + 0.008,
          hue: Math.random() > 0.4 ? 'copper' : 'trace'
        });
      }
    }

    if (!isMobileOrTablet) {
      window.setTimeout(spawnAntennaCloudPuffs, 100);
      window.setTimeout(spawnAntennaCloudPuffs, 260);
    }
    window.addEventListener('resize', resizeCanvas, { passive: true });

    window.addEventListener('mousemove', function (e) {
      if (!circuitCanvas) return;
      var r = circuitCanvas.getBoundingClientRect();
      if (e.clientY <= r.bottom) {
        mouseX = e.clientX - r.left;
        mouseY = e.clientY - r.top;
      } else {
        mouseX = -1;
        mouseY = -1;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      mouseX = -1;
      mouseY = -1;
    }, { passive: true });

    window.addEventListener('click', function (e) {
      if (!circuitCanvas) return;
      var r = circuitCanvas.getBoundingClientRect();
      if (e.clientY <= r.bottom) {
        shockwaves.push({
          x: e.clientX - r.left,
          y: e.clientY - r.top,
          r: 0,
          maxR: 160,
          opacity: 0.85
        });
      }
    }, { passive: true });

    window.addEventListener('touchstart', function (e) {
      if (!circuitCanvas || !e.touches || !e.touches[0]) return;
      var touch = e.touches[0];
      var r = circuitCanvas.getBoundingClientRect();
      if (touch.clientY <= r.bottom) {
        mouseX = touch.clientX - r.left;
        mouseY = touch.clientY - r.top;
        shockwaves.push({
          x: mouseX,
          y: mouseY,
          r: 0,
          maxR: 140,
          opacity: 0.85
        });
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!circuitCanvas || !e.touches || !e.touches[0]) return;
      var touch = e.touches[0];
      var r = circuitCanvas.getBoundingClientRect();
      if (touch.clientY <= r.bottom) {
        mouseX = touch.clientX - r.left;
        mouseY = touch.clientY - r.top;
      } else {
        mouseX = -1;
        mouseY = -1;
      }
    }, { passive: true });

    window.addEventListener('touchend', function () {
      mouseX = -1;
      mouseY = -1;
    }, { passive: true });

    function renderLattice() {
      if (window.scrollY > cH + 60) {
        window.requestAnimationFrame(renderLattice);
        return;
      }

      ctx.clearRect(0, 0, cW, cH);

      // 1. Subtle Radial RF Graticule & Radar Rings
      ctx.save();
      var cx = cW * 0.5;
      var cy = cH * 0.5;
      ctx.strokeStyle = 'rgba(95, 191, 122, 0.04)';
      ctx.lineWidth = 1;

      var maxRingR = Math.min(cW, cH) * 0.45;
      for (var ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (maxRingR / 4) * ring, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(cx - maxRingR, cy); ctx.lineTo(cx + maxRingR, cy);
      ctx.moveTo(cx, cy - maxRingR); ctx.lineTo(cx, cy + maxRingR);
      ctx.stroke();
      ctx.restore();

      // 2. Billowing EM Plasma Clouds from Antenna Burst
      if (plasmaClouds.length) {
        ctx.save();
        for (var cIdx = plasmaClouds.length - 1; cIdx >= 0; cIdx--) {
          var puff = plasmaClouds[cIdx];
          puff.x += puff.vx;
          puff.y += puff.vy;
          puff.vx *= 0.965; // Viscous deceleration
          puff.vy *= 0.965;
          puff.r = Math.min(puff.maxR, puff.r + puff.growRate);
          puff.opacity -= puff.fadeRate;

          if (puff.opacity <= 0.01) {
            plasmaClouds.splice(cIdx, 1);
            continue;
          }

          var grad = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
          if (puff.hue === 'copper') {
            grad.addColorStop(0, 'rgba(255, 245, 215, ' + (puff.opacity * 0.9) + ')');
            grad.addColorStop(0.35, 'rgba(240, 184, 78, ' + (puff.opacity * 0.6) + ')');
            grad.addColorStop(0.7, 'rgba(180, 120, 50, ' + (puff.opacity * 0.22) + ')');
            grad.addColorStop(1, 'rgba(19, 31, 27, 0)');
          } else {
            grad.addColorStop(0, 'rgba(230, 255, 240, ' + (puff.opacity * 0.85) + ')');
            grad.addColorStop(0.4, 'rgba(95, 191, 122, ' + (puff.opacity * 0.5) + ')');
            grad.addColorStop(0.75, 'rgba(40, 110, 70, ' + (puff.opacity * 0.18) + ')');
            grad.addColorStop(1, 'rgba(19, 31, 27, 0)');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
          ctx.fill();

          // Push nearby particles with the billowing cloud
          particles.forEach(function (p) {
            var d = Math.hypot(p.x - puff.x, p.y - puff.y);
            if (d < puff.r * 1.1) {
              var ang = Math.atan2(p.y - puff.y, p.x - puff.x);
              p.x += Math.cos(ang) * 1.6;
              p.y += Math.sin(ang) * 1.6;
            }
          });
        }
        ctx.restore();
      }

      // 3. Shockwave Discharges from Click
      if (shockwaves.length) {
        ctx.save();
        for (var sw = shockwaves.length - 1; sw >= 0; sw--) {
          var shock = shockwaves[sw];
          shock.r += 3.8;
          shock.opacity *= 0.95;

          ctx.strokeStyle = 'rgba(240, 184, 78, ' + shock.opacity + ')';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(shock.x, shock.y, shock.r, 0, Math.PI * 2);
          ctx.stroke();

          // Push nearby particles outward
          particles.forEach(function (p) {
            var dist = Math.hypot(p.x - shock.x, p.y - shock.y);
            if (Math.abs(dist - shock.r) < 20) {
              var angle = Math.atan2(p.y - shock.y, p.x - shock.x);
              p.x += Math.cos(angle) * 2;
              p.y += Math.sin(angle) * 2;
            }
          });

          if (shock.opacity < 0.03 || shock.r > shock.maxR) {
            shockwaves.splice(sw, 1);
          }
        }
        ctx.restore();
      }

      // 3. Update & Draw Particles (Always active)
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around canvas edges
        if (p.x < 0) p.x = cW;
        if (p.x > cW) p.x = 0;
        if (p.y < 0) p.y = cH;
        if (p.y > cH) p.y = 0;

        // Multimeter Probe Magnetism
        if (mouseX > 0) {
          var dx = mouseX - p.x;
          var dy = mouseY - p.y;
          var mDist = Math.sqrt(dx * dx + dy * dy);
          if (mDist < 160) {
            var force = (1 - mDist / 160) * 0.04;
            p.x += dx * force;
            p.y += dy * force;
          }
        }
      }

      // 4. Draw Proximity Laser Threads Between Nodes
      ctx.save();
      ctx.lineWidth = 0.9;
      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var pa = particles[a];
          var pb = particles[b];
          var dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
          if (dist < 110) {
            var alpha = (1 - dist / 110) * 0.22;
            ctx.strokeStyle = 'rgba(95, 191, 122, ' + alpha + ')';
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 5. Connect Probe Tip to Nearest Nodes
      if (mouseX > 0) {
        ctx.save();
        ctx.lineWidth = 1.2;
        particles.forEach(function (p) {
          var pDist = Math.hypot(p.x - mouseX, p.y - mouseY);
          if (pDist < 140) {
            var pAlpha = (1 - pDist / 140) * 0.45;
            ctx.strokeStyle = 'rgba(240, 184, 78, ' + pAlpha + ')';
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // 6. Draw Glowing Nodes
      ctx.save();
      particles.forEach(function (p) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      window.requestAnimationFrame(renderLattice);
    }

    window.requestAnimationFrame(renderLattice);
  }

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
    cursorEl.innerHTML = '<svg width="96" height="96" viewBox="-48 -48 96 96" fill="none" style="overflow:visible">' +
      '<!-- ReactBits MagicRings Soft Blur & Slightly Increased Opacity Halos -->' +
      '<g id="magicRingsGroup" style="filter: blur(1.0px);">' +
        '<circle id="magicRing1" cx="0" cy="0" r="10" fill="none" stroke="#82e0a0" stroke-width="1.1" opacity="0.50" style="filter: drop-shadow(0 0 4px #82e0a0);"/>' +
        '<circle id="magicRing2" cx="0" cy="0" r="18" fill="none" stroke="#f0b84e" stroke-width="0.9" opacity="0.36" style="filter: drop-shadow(0 0 5px #f0b84e);"/>' +
        '<circle id="magicRing3" cx="0" cy="0" r="26" fill="none" stroke="#5fbf7a" stroke-width="0.8" opacity="0.24" style="filter: drop-shadow(0 0 5px #5fbf7a);"/>' +
        '<circle id="magicRing4" cx="0" cy="0" r="34" fill="none" stroke="#fdfaf2" stroke-width="0.6" opacity="0.14"/>' +
      '</g>' +
      '<circle id="probeTipGlow" cx="0" cy="0" r="2.5" fill="#82e0a0" opacity="0.5" style="transition: r 0.2s, fill 0.2s, opacity 0.2s; filter: drop-shadow(0 0 3px #82e0a0);"/>' +
      '<circle id="probeClickPulse" cx="0" cy="0" r="0" fill="none" stroke="#f0b84e" stroke-width="1.2" opacity="0"/>' +
      '<line x1="0" y1="0" x2="4" y2="4" stroke="#fdfaf2" stroke-width="1.8" stroke-linecap="round"/>' +
      '<polygon points="3,3 8,4 4,8" fill="#82e0a0"/>' +
      '<line x1="7" y1="5" x2="5" y2="7" stroke="#f0b84e" stroke-width="2.2" stroke-linecap="round"/>' +
      '<line x1="6" y1="6" x2="14" y2="14" stroke="#1c2b25" stroke-width="4.5" stroke-linecap="round"/>' +
      '<line x1="6" y1="6" x2="14" y2="14" stroke="#5fbf7a" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="9" y1="9" x2="11" y2="11" stroke="#f0b84e" stroke-width="3" stroke-linecap="round"/>' +
      '<path id="probeWirePath" d="M 14 14 Q 24 16 20 28 T 30 38" stroke="#5fbf7a" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
      '<path id="probeWireCore" d="M 14 14 Q 24 16 20 28 T 30 38" stroke="#f0b84e" stroke-width="0.8" stroke-linecap="round" fill="none"/>' +
      '<circle id="probeWirePulse" cx="14" cy="14" r="1.5" fill="#fdfaf2" style="filter: drop-shadow(0 0 3px #f0b84e);"/>' +
      '<circle id="probeWireTip" cx="30" cy="38" r="1.2" fill="#f0b84e"/>' +
      '</svg>';
    document.body.appendChild(cursorEl);
    cursorEl.classList.add('hidden');
    window.setTimeout(function () {
      cursorEl.classList.remove('hidden');
    }, 1200);

    window.setTimeout(function () {
      var ant = document.getElementById('emAntenna');
      if (ant) ant.style.display = 'none';
    }, 1250);

    var wirePath = document.getElementById('probeWirePath');
    var wireCore = document.getElementById('probeWireCore');
    var wireTip = document.getElementById('probeWireTip');
    var wirePulse = document.getElementById('probeWirePulse');
    var tipGlow = document.getElementById('probeTipGlow');
    var clickPulse = document.getElementById('probeClickPulse');

    var mRing1 = document.getElementById('magicRing1');
    var mRing2 = document.getElementById('magicRing2');
    var mRing3 = document.getElementById('magicRing3');
    var mRing4 = document.getElementById('magicRing4');

    var cursorX = -100, cursorY = -100;
    var prevX = -100, prevY = -100;
    var offsetX = 0, offsetY = 0;
    var signalProgress = 0;
    var magicTime = 0;
    var magicScale = 1.0;
    var targetMagicScale = 1.0;

    var clickPulseRadius = 0;
    var clickPulseOpacity = 0;

    window.addEventListener('mousemove', function (e) {
      cursorX = e.clientX;
      cursorY = e.clientY;

      if (e.target && e.target.closest('#rotaryNav')) {
        cursorEl.classList.add('hidden');
      } else {
        cursorEl.classList.remove('hidden');
      }

      // Highlight ONLY when hovering actual clickable links or buttons
      var isHoveringLink = !!(e.target && e.target.closest('a, button'));
      if (isHoveringLink) {
        targetMagicScale = 1.3;
        tipGlow.setAttribute('r', '4.5');
        tipGlow.setAttribute('fill', '#f0b84e');
        tipGlow.setAttribute('opacity', '0.9');
      } else {
        targetMagicScale = 1.0;
        tipGlow.setAttribute('r', '2.5');
        tipGlow.setAttribute('fill', '#82e0a0');
        tipGlow.setAttribute('opacity', '0.5');
      }
    }, { passive: true });

    window.addEventListener('click', function (e) {
      if (e.target && e.target.closest('#rotaryNav')) return;
      clickPulseRadius = 2;
      clickPulseOpacity = 1.0;
    }, { passive: true });

    function animateProbeCursor() {
      // Offset transform by -48px to align SVG (0,0) needle tip & MagicRings center pin-point accurately to cursorX, cursorY
      cursorEl.style.transform = 'translate3d(' + (cursorX - 48) + 'px, ' + (cursorY - 48) + 'px, 0)';

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

      // MagicRings Radial Breathing & Oscillation Animation
      magicTime += 0.04;
      magicScale += (targetMagicScale - magicScale) * 0.15;

      var r1 = (10 + Math.sin(magicTime * 2.2) * 2.5) * magicScale;
      var r2 = (18 + Math.cos(magicTime * 1.8 + 1.2) * 3.5) * magicScale;
      var r3 = (26 + Math.sin(magicTime * 1.4 + 2.4) * 4.5) * magicScale;
      var r4 = (34 + Math.cos(magicTime * 1.0 + 3.6) * 5.5) * magicScale;

      if (mRing1) mRing1.setAttribute('r', r1.toFixed(1));
      if (mRing2) mRing2.setAttribute('r', r2.toFixed(1));
      if (mRing3) mRing3.setAttribute('r', r3.toFixed(1));
      if (mRing4) mRing4.setAttribute('r', r4.toFixed(1));

      // Signal pulse travelling along the wavy wire
      signalProgress = (signalProgress + 0.025) % 1.0;
      try {
        var totalLen = wirePath.getTotalLength();
        var pt = wirePath.getPointAtLength(signalProgress * totalLen);
        wirePulse.setAttribute('cx', pt.x.toFixed(1));
        wirePulse.setAttribute('cy', pt.y.toFixed(1));
      } catch (err) {}

      // Click contact pulse ring animation
      if (clickPulseOpacity > 0.02) {
        clickPulseRadius += 0.8;
        clickPulseOpacity *= 0.92;
        clickPulse.setAttribute('r', clickPulseRadius.toFixed(1));
        clickPulse.setAttribute('opacity', clickPulseOpacity.toFixed(2));
      } else {
        clickPulse.setAttribute('opacity', '0');
      }

      window.requestAnimationFrame(animateProbeCursor);
    }

    window.requestAnimationFrame(animateProbeCursor);
  }
})();

