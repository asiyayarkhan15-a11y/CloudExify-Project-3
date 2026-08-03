/* ============================================================
   Aurelia Dental Studio — interactions
   1. Navbar scroll state
   2. Active nav-link highlighting (scroll spy)
   3. Animated stats counter        [SIGNATURE FEATURE]
   4. Live service filter           [SIGNATURE FEATURE]
   5. Before/after drag slider      [SIGNATURE FEATURE]
   6. Booking modal + validation    [SIGNATURE FEATURE]
   7. Scroll reveals, footer year
   ============================================================ */

(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------------------------------------------------
     1. Navbar — solid background once the user leaves the hero
     --------------------------------------------------------- */
  const nav = $('#siteNav');

  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------------------------------------------------
     2. Active nav link — highlight the section in view
     --------------------------------------------------------- */
  const navLinks = $$('.site-nav .nav-link');
  const sections = navLinks
    .map(link => $(link.getAttribute('href')))
    .filter(Boolean);

  if (sections.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(section => spy.observe(section));
  }

  /* Collapse the mobile menu after tapping a link */
  const menu = $('#navMenu');
  $$('#navMenu .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (menu.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(menu).hide();
      }
    });
  });

  /* ---------------------------------------------------------
     3. SIGNATURE FEATURE — animated stats counter
        Counts up once, when the band scrolls into view.
     --------------------------------------------------------- */
  const stats = $$('.stat');

  if (stats.length) {
    const runCount = el => {
      const target   = Number(el.dataset.target) || 0;
      const suffix   = el.dataset.suffix || '';
      const duration = 1600;
      const start    = performance.now();

      const tick = now => {
        const progress = Math.min((now - start) / duration, 1);
        /* ease-out so the number decelerates instead of stopping dead */
        const eased = 1 - Math.pow(1 - progress, 3);

        el.textContent = Math.round(target * eased) + suffix;

        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const statsObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        runCount(entry.target);
        statsObserver.unobserve(entry.target);   // animate once only
      });
    }, { threshold: 0.5 });

    stats.forEach(el => statsObserver.observe(el));
  }

  /* ---------------------------------------------------------
     4. SIGNATURE FEATURE — live service filter
        A card may belong to several categories, e.g.
        data-category="general cosmetic".
     --------------------------------------------------------- */
  const filterBtns  = $$('.filter-btn');
  const serviceCols = $$('.service-col');
  const emptyNote   = $('#filterEmpty');

  const FILTER_MS = 350;   // must match the .service-col transition
  let filterTimer;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterBtns.forEach(b => b.classList.toggle('is-active', b === btn));

      let visible = 0;
      const matches = new Map();

      serviceCols.forEach(col => {
        const cats  = (col.dataset.category || '').split(/\s+/);
        const match = filter === 'all' || cats.includes(filter);
        matches.set(col, match);
        if (match) visible++;
      });

      /* Returning cards need a frame in the layout at opacity 0 before we
         animate them in, or the browser skips the transition entirely. */
      matches.forEach((match, col) => {
        if (match) col.classList.remove('d-none');
      });

      requestAnimationFrame(() => {
        matches.forEach((match, col) => col.classList.toggle('is-hidden', !match));
      });

      /* Departing cards fade out first, then leave the grid, so the rest
         reflow after the animation instead of jumping during it. */
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => {
        matches.forEach((match, col) => {
          if (!match) col.classList.add('d-none');
        });
      }, FILTER_MS);

      emptyNote.classList.toggle('d-none', visible > 0);
    });
  });

  /* ---------------------------------------------------------
     5. SIGNATURE FEATURE — draggable before/after slider
        Works with mouse, touch and arrow keys.
     --------------------------------------------------------- */
  const compare = $('#compare');

  if (compare) {
    const afterPane = $('#compareAfter');
    const handle    = $('#compareHandle');
    let dragging    = false;

    const setPosition = percent => {
      const clamped = Math.max(0, Math.min(100, percent));
      afterPane.style.width = clamped + '%';
      handle.style.left     = clamped + '%';
      compare.setAttribute('aria-valuenow', Math.round(clamped));
    };

    const positionFromEvent = event => {
      const rect = compare.getBoundingClientRect();
      const x    = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
      return (x / rect.width) * 100;
    };

    /* Touch bookkeeping: we only claim the gesture once it is clearly
       horizontal, so a vertical swipe over the slider still scrolls the page. */
    let touchStart = null;
    let axisLocked = false;

    const startDrag = event => {
      if (event.touches) {
        touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        axisLocked = false;
        return;                       // wait and see which way they move
      }
      dragging = true;
      setPosition(positionFromEvent(event));
    };

    const onDrag = event => {
      if (event.touches) {
        if (!touchStart) return;

        if (!axisLocked) {
          const dx = Math.abs(event.touches[0].clientX - touchStart.x);
          const dy = Math.abs(event.touches[0].clientY - touchStart.y);

          if (dx < 6 && dy < 6) return;   // too small to judge yet

          axisLocked = true;
          dragging = dx > dy;             // horizontal wins → it is a drag
          if (!dragging) { touchStart = null; return; }
        }

        if (!dragging) return;
        if (event.cancelable) event.preventDefault();   // hold the page still
        setPosition(positionFromEvent(event));
        return;
      }

      if (!dragging) return;
      setPosition(positionFromEvent(event));
    };

    const endDrag = () => {
      dragging = false;
      touchStart = null;
      axisLocked = false;
    };

    compare.addEventListener('mousedown', event => {
      event.preventDefault();          // no text selection or image ghost
      startDrag(event);
    });

    /* Touch events are delivered to the element the touch began on, so these
       stay local — a page-wide non-passive touchmove would tax every scroll. */
    compare.addEventListener('touchstart', startDrag, { passive: true });
    compare.addEventListener('touchmove',  onDrag,    { passive: false });
    compare.addEventListener('touchend',   endDrag);
    compare.addEventListener('touchcancel', endDrag);

    /* The mouse can leave the image mid-drag, so these do belong on window */
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup',   endDrag);

    /* Keyboard support */
    compare.addEventListener('keydown', event => {
      const current = parseFloat(afterPane.style.width) || 50;
      if (event.key === 'ArrowLeft')  { setPosition(current - 4); event.preventDefault(); }
      if (event.key === 'ArrowRight') { setPosition(current + 4); event.preventDefault(); }
    });

    setPosition(50);
  }

  /* ---------------------------------------------------------
     6. SIGNATURE FEATURE — booking modal
        Time-slot selector + full client-side validation.
     --------------------------------------------------------- */
  const form = $('#appointmentForm');

  if (form) {
    const dateInput  = $('#apptDate');
    const timeInput  = $('#apptTime');
    const readout    = $('#slotReadout');
    const slotGrid   = $('#slotGrid');
    const errorBox   = $('#formError');
    const errorText  = $('#formErrorText');
    const successBox = $('#formSuccess');
    const successMsg = $('#successDetail');

    /* Nobody books yesterday — floor the date picker at today */
    const today = new Date();
    const iso = d => [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');

    dateInput.min = iso(today);

    /* --- Time slot selection --- */
    slotGrid.addEventListener('click', event => {
      const slot = event.target.closest('.slot');
      if (!slot || slot.disabled) return;

      $$('.slot', slotGrid).forEach(s => s.classList.toggle('is-selected', s === slot));

      timeInput.value   = slot.dataset.time;
      readout.textContent = slot.dataset.time;
      readout.classList.add('is-set');
      slotGrid.classList.remove('is-bad');
    });

    /* --- Validation --- */
    const markBad = (el, bad) => el.classList.toggle('is-bad', bad);

    /* Clear the red state as soon as the user starts fixing a field */
    $$('.form-control, .form-select', form).forEach(field => {
      field.addEventListener('input',  () => markBad(field, false));
      field.addEventListener('change', () => markBad(field, false));
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const name    = $('#patientName').value.trim();
      const phone   = $('#phone').value.trim();
      const email   = $('#email').value.trim();
      const service = $('#serviceType').value;
      const date    = dateInput.value;
      const time    = timeInput.value;

      const phoneOK = /^[0-9+\-\s()]{7,18}$/.test(phone);
      const emailOK = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

      const problems = [];

      if (!name)     { problems.push('your name');        markBad($('#patientName'), true); }
      if (!phoneOK)  { problems.push('a valid phone number'); markBad($('#phone'), true); }
      if (!emailOK)  { problems.push('a valid email address'); markBad($('#email'), true); }
      if (!service)  { problems.push('a treatment');      markBad($('#serviceType'), true); }
      if (!date)     { problems.push('a preferred date'); markBad(dateInput, true); }
      if (!time)     { problems.push('a time slot');      slotGrid.classList.add('is-bad'); }

      if (problems.length) {
        const list = problems.length === 1
          ? problems[0]
          : problems.slice(0, -1).join(', ') + ' and ' + problems[problems.length - 1];

        errorText.textContent = 'We still need ' + list + ' before we can send this.';
        errorBox.classList.remove('d-none');
        successBox.classList.add('d-none');
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      /* Valid — no backend on a static site, so confirm optimistically */
      const pretty = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long'
      });

      successMsg.textContent =
        ' We have pencilled you in for ' + pretty + ' at ' + time +
        '. Reception will call ' + phone + ' within one working hour to confirm.';

      errorBox.classList.add('d-none');
      successBox.classList.remove('d-none');
      successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      /* Reset the form but keep the confirmation on screen */
      this.reset();
      timeInput.value     = '';
      readout.textContent = 'No time selected yet';
      readout.classList.remove('is-set');
      $$('.slot', slotGrid).forEach(s => s.classList.remove('is-selected'));
    });

    /* Reopening the modal should start clean */
    $('#bookingModal').addEventListener('hidden.bs.modal', () => {
      errorBox.classList.add('d-none');
      successBox.classList.add('d-none');
      slotGrid.classList.remove('is-bad');
      $$('.is-bad', form).forEach(el => el.classList.remove('is-bad'));
    });
  }

  /* ---------------------------------------------------------
     7. Scroll reveals + footer year
     --------------------------------------------------------- */
  const revealTargets = $$('.section-head, .service-card, .price-card, .tcard, .doctor-card, .gal-item, .contact-panel, .compare-wrap');

  if (revealTargets.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealTargets.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(26px)';
    });

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.transition = 'opacity .8s cubic-bezier(.22,.8,.28,1), transform .8s cubic-bezier(.22,.8,.28,1)';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealTargets.forEach(el => revealObserver.observe(el));
  }

  $('#year').textContent = new Date().getFullYear();

})();
