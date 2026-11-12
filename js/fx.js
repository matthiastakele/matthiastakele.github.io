(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasSplitType = typeof window.SplitType !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';

  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ----------------------------------------------------------------
   * Smooth scroll. Gentle lerp — enough inertia to feel considered,
   * not so much that the page feels detached from the wheel.
   * ---------------------------------------------------------------- */
  var lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({ duration: 0.9, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;

    if (hasGSAP) {
      lenis.on('scroll', function () {
        if (hasScrollTrigger) ScrollTrigger.update();
      });
      gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      var rafLoop = function (time) {
        lenis.raf(time);
        requestAnimationFrame(rafLoop);
      };
      requestAnimationFrame(rafLoop);
    }
  }

  /* ----------------------------------------------------------------
   * Mobile drawer.
   * ---------------------------------------------------------------- */
  var burger = document.querySelector('.site-nav__burger');
  var mobileMenu = document.getElementById('mobile-menu');

  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
    if (burger) burger.setAttribute('aria-expanded', 'false');
    if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  }

  function openMenu() {
    document.body.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
    if (burger) burger.setAttribute('aria-expanded', 'true');
    if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
  }

  if (burger) {
    burger.addEventListener('click', function () {
      if (document.body.classList.contains('menu-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    // A drawer left open across the breakpoint would trap scrolling.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 850) closeMenu();
    });
  }

  // Anchor links must route through Lenis, otherwise native smooth scroll fights it.
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      // Close first: scrolling is locked while the drawer is open.
      closeMenu();
      var hash = link.getAttribute('href');
      if (!hash || hash === '#') {
        event.preventDefault();
        lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      var offset = -72;
      if (lenis) {
        lenis.scrollTo(target, { offset: offset });
      } else {
        var top = target.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* ----------------------------------------------------------------
   * Hero canvas: a dot field that lights up around the cursor and
   * breathes on a slow ambient wave.
   * ---------------------------------------------------------------- */
  (function heroGrid() {
    var canvas = document.querySelector('.hero__grid');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var dots = [];
    var spacing = 30;
    var influence = 170;
    var ambientOn = !reduceMotion && finePointer;
    var pointer = { x: -9999, y: -9999 };
    var width = 0;
    var height = 0;
    var running = true;

    function palette() {
      return document.body.classList.contains('night')
        ? { base: '148, 163, 184', glow: '45, 212, 191', baseAlpha: 0.18 }
        : { base: '100, 116, 139', glow: '13, 148, 136', baseAlpha: 0.22 };
    }

    function build() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Fewer, wider-spaced dots on phones.
      spacing = rect.width < 700 ? 44 : 30;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      var cols = Math.ceil(width / spacing) + 1;
      var rows = Math.ceil(height / spacing) + 1;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          dots.push({ x: i * spacing, y: j * spacing, phase: (i + j) * 0.35 });
        }
      }
    }

    function draw(time) {
      var colors = palette();
      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < dots.length; i++) {
        var dot = dots[i];
        var ambient = ambientOn ? Math.sin(time * 0.0012 + dot.phase) * 0.5 + 0.5 : 0;
        var radius = 1 + ambient * 0.35;
        var alpha = colors.baseAlpha + ambient * 0.1;
        var color = colors.base;

        if (finePointer) {
          var dx = dot.x - pointer.x;
          var dy = dot.y - pointer.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < influence) {
            var strength = 1 - dist / influence;
            radius += strength * 2.1;
            alpha = Math.min(1, alpha + strength * 0.85);
            color = colors.glow;
          }
        }

        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + color + ',' + alpha + ')';
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(time) {
      if (running) draw(time);
      requestAnimationFrame(frame);
    }

    function rebuild() {
      build();
      if (!ambientOn) draw(0);
    }

    build();

    if (ambientOn) {
      requestAnimationFrame(frame);
    } else {
      // Touch devices get a single static paint rather than a perpetual loop.
      draw(0);
      var themeInput = document.getElementById('switch');
      if (themeInput) {
        themeInput.addEventListener('change', function () {
          draw(0);
        });
      }
    }

    window.addEventListener('resize', rebuild);
    window.addEventListener(
      'mousemove',
      function (event) {
        var rect = canvas.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      },
      { passive: true }
    );
    window.addEventListener('mouseout', function () {
      pointer.x = -9999;
      pointer.y = -9999;
    });

    // Stop painting once the hero is off screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting;
      }).observe(canvas);
    }
  })();

  /* ----------------------------------------------------------------
   * Custom cursor — a dot that tracks exactly, trailed by a ring that
   * lags slightly and swells over interactive targets.
   * ---------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    var dotEl = document.createElement('div');
    var ringEl = document.createElement('div');
    dotEl.className = 'cursor-dot';
    ringEl.className = 'cursor-ring';
    document.body.appendChild(dotEl);
    document.body.appendChild(ringEl);
    document.body.classList.add('has-custom-cursor');

    var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var ring = { x: mouse.x, y: mouse.y };

    window.addEventListener(
      'mousemove',
      function (event) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        dotEl.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0)';
      },
      { passive: true }
    );

    (function ringLoop() {
      ring.x += (mouse.x - ring.x) * 0.18;
      ring.y += (mouse.y - ring.y) * 0.18;
      ringEl.style.transform = 'translate3d(' + ring.x + 'px,' + ring.y + 'px,0)';
      requestAnimationFrame(ringLoop);
    })();

    document.querySelectorAll('a, button, .project, input, label').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        ringEl.classList.add('is-active');
      });
      el.addEventListener('mouseleave', function () {
        ringEl.classList.remove('is-active');
      });
    });
  }

  /* ----------------------------------------------------------------
   * Magnetic buttons.
   * ---------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    var STRENGTH = 0.22;
    var MAX_PULL = 10;
    var magnets = [];

    document.querySelectorAll('.magnetic').forEach(function (el) {
      var magnet = { el: el, x: 0, y: 0, targetX: 0, targetY: 0 };

      el.addEventListener('mousemove', function (event) {
        var rect = el.getBoundingClientRect();
        // Subtract the live translation so the measurement describes the
        // resting position — otherwise the transform feeds its own input
        // and the button oscillates.
        var centerX = rect.left + rect.width / 2 - magnet.x;
        var centerY = rect.top + rect.height / 2 - magnet.y;

        var dx = (event.clientX - centerX) * STRENGTH;
        var dy = (event.clientY - centerY) * STRENGTH;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > MAX_PULL) {
          dx = (dx / distance) * MAX_PULL;
          dy = (dy / distance) * MAX_PULL;
        }

        magnet.targetX = dx;
        magnet.targetY = dy;
      });

      el.addEventListener('mouseleave', function () {
        magnet.targetX = 0;
        magnet.targetY = 0;
      });

      magnets.push(magnet);
    });

    if (magnets.length) {
      (function magnetLoop() {
        for (var i = 0; i < magnets.length; i++) {
          var m = magnets[i];
          m.x += (m.targetX - m.x) * 0.15;
          m.y += (m.targetY - m.y) * 0.15;
          m.el.style.transform =
            'translate3d(' + m.x.toFixed(2) + 'px,' + m.y.toFixed(2) + 'px,0)';
        }
        requestAnimationFrame(magnetLoop);
      })();
    }
  }

  /* ----------------------------------------------------------------
   * Hero entrance. Every "from" state is set in JS so that a failed
   * CDN leaves a fully readable static page instead of a blank one.
   * ---------------------------------------------------------------- */
  if (hasGSAP && !reduceMotion) {
    var nameLines = document.querySelectorAll('.hero__name__line > span');
    var heroBits = document.querySelectorAll('.hero .reveal');

    gsap.set(nameLines, { yPercent: 115 });
    gsap.set(heroBits, { opacity: 0, y: 24 });

    var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .to(nameLines, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0.15)
      .to(
        heroBits,
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
        },
        0.45
      );

    if (hasSplitType) {
      var lede = document.querySelector('.hero__lede');
      if (lede) {
        var split = new SplitType(lede, { types: 'lines' });
        gsap.set(lede, { opacity: 1, y: 0 });
        gsap.from(split.lines, {
          opacity: 0,
          y: 18,
          duration: 0.8,
          stagger: 0.06,
          ease: 'power3.out',
          delay: 0.6,
        });
      }
    }
  }

  /* ----------------------------------------------------------------
   * Scroll reveals for everything below the fold.
   * ---------------------------------------------------------------- */
  if (hasScrollTrigger && !reduceMotion) {
    document
      .querySelectorAll('.section .reveal, .impact .reveal, .section__title, .job, .project, .skillz__category')
      .forEach(function (el) {
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10) / 1000;
        gsap.set(el, { opacity: 0, y: 18 });
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          delay: delay,
          ease: 'power2.out',
          // Fire as the element crosses into view, not once it is well inside.
          scrollTrigger: { trigger: el, start: 'top 97%' },
        });
      });
  }

  /* ----------------------------------------------------------------
   * Stat count-up.
   * ---------------------------------------------------------------- */
  document.querySelectorAll('[data-count-to]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';
    var out = el.querySelector('span') || el;

    function render(value) {
      out.textContent = prefix + Math.round(value).toLocaleString('en-US') + suffix;
    }

    if (!hasScrollTrigger || reduceMotion) {
      render(target);
      return;
    }

    var counter = { value: 0 };
    // Nothing renders until the count starts, so the markup's real figure is
    // what shows at rest. A resting "0" reads as the number itself.
    gsap.to(counter, {
      value: target,
      duration: 1.6,
      ease: 'power2.out',
      // Same trigger as the reveal, so the count runs as the stat fades in.
      scrollTrigger: { trigger: el, start: 'top 97%' },
      onUpdate: function () {
        render(counter.value);
      },
    });
  });

  /* ----------------------------------------------------------------
   * Project cards: cursor spotlight + a few degrees of parallax tilt.
   * ---------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.project').forEach(function (card) {
      card.addEventListener('mousemove', function (event) {
        var rect = card.getBoundingClientRect();
        var px = (event.clientX - rect.left) / rect.width;
        var py = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', (px * 100).toFixed(2) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(2) + '%');
        card.style.setProperty('--rx', ((0.5 - py) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - 0.5) * 5).toFixed(2) + 'deg');
      });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ----------------------------------------------------------------
   * Nav: scrollspy + hide while scrolling down, reveal on the way up.
   * ---------------------------------------------------------------- */
  (function navBehavior() {
    var nav = document.querySelector('.site-nav');
    var navLinks = document.querySelectorAll('.site-nav__links a');
    if (!nav) return;

    var lastY = window.scrollY;
    function syncNav() {
      var y = window.scrollY;
      nav.classList.toggle('is-stuck', y > 40);
      nav.classList.toggle('is-hidden', y > lastY && y > 400);
      lastY = y;
    }

    // Browsers restore scroll position on reload without firing a scroll
    // event, so the initial state has to be computed directly.
    syncNav();
    window.addEventListener('scroll', syncNav, { passive: true });

    if (!navLinks.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var link = document.querySelector(
            '.site-nav__links a[href="#' + entry.target.id + '"]'
          );
          if (!link) return;
          navLinks.forEach(function (l) {
            l.classList.remove('is-active');
          });
          link.classList.add('is-active');
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );

    navLinks.forEach(function (link) {
      var section = document.querySelector(link.getAttribute('href'));
      if (section) observer.observe(section);
    });
  })();

  if (hasScrollTrigger) ScrollTrigger.refresh();
})();
