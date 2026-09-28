/* ==========================================================================
   Case'd by T — site script
   Shared across index.html, collection.html, contact.html, about.html.
   Every block checks that its elements exist before wiring up, so this
   one file can be safely included on every page.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* FIX: if this file is ever loaded twice, every click handler runs twice
     (menu opens then closes, theme toggles back, cart adds 2). Run only once. */
  if (window.__cbtLoaded) return;
  window.__cbtLoaded = true;

  /* Safe localStorage (some browsers block it) */
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lenis smooth scroll ---------- */
  let lenis;
  try {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length > 1 && document.querySelector(id)) {
          e.preventDefault();
          lenis.scrollTo(id, { offset: -20 });
        }
      });
    });
  } catch (e) { /* Lenis not available — native scroll still works */ }

  /* ---------- Custom cursor ---------- */
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (dot && ring) {
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, input, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-grow'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-grow'));
    });
  }

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-btn');
  const themeIcon = document.getElementById('theme-icon');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    root.style.setProperty('--logo-filter', t === 'dark' ? 'invert(1)' : 'none');
    if (themeIcon) {
      themeIcon.innerHTML = t === 'dark'
        ? '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
    }
    store.set('cbt-theme', t);
  }
  applyTheme(store.get('cbt-theme', 'light'));
  if (themeBtn) {
    themeBtn.addEventListener('click', () => applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const hidden = mobileMenu.classList.toggle('is-hidden');
      menuBtn.setAttribute('aria-expanded', String(!hidden));
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.add('is-hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- Hero logo: swap the <img> for inline SVG so the draw animation can run ---------- */
  const heroLogo = document.querySelector('img.hero__logo');
  if (heroLogo) {
    fetch(heroLogo.getAttribute('src'))
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(txt => {
        const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
        const src = doc.documentElement;
        if (doc.querySelector('parsererror') || !src || src.nodeName.toLowerCase() !== 'svg') return;
        const svg = document.importNode(src, true);
        svg.querySelectorAll('script').forEach(s => s.remove());
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('class', 'herotxt hero__logo');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', heroLogo.getAttribute('alt') || '');
        svg.querySelectorAll('path').forEach(p => {
          p.removeAttribute('style'); p.removeAttribute('fill'); p.removeAttribute('stroke');
        });
        heroLogo.replaceWith(svg);
      })
      .catch(() => { /* keep the normal <img> (e.g. file opened without a server) */ });
  }

  /* ---------- Showcase text animation (home page, 2nd screen) ---------- */
  const showcaseCopy = document.querySelector('.showcase__copy');
  if (showcaseCopy) {
    const words = Array.from(showcaseCopy.querySelectorAll('.rotator span'));
    let wi = 0;
    if (words.length) words[0].classList.add('is-current');

    function startRotator() {
      if (words.length < 2 || reduceMotion) return;
      setInterval(() => {
        const prev = words[wi];
        wi = (wi + 1) % words.length;
        prev.classList.remove('is-current');
        prev.classList.add('is-leaving');
        words[wi].classList.add('is-current');
        setTimeout(() => prev.classList.remove('is-leaving'), 900);
      }, 2400);
    }

    function runCounters() {
      showcaseCopy.querySelectorAll('[data-count]').forEach(el => {
        const target = +el.dataset.count;
        const suffix = el.dataset.suffix || '';
        if (reduceMotion) { el.textContent = target + suffix; return; }
        const t0 = performance.now(), dur = 1400;
        (function step(now) {
          const p = Math.min(1, (now - t0) / dur);
          const e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * e) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }

    const showcaseIO = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      showcaseCopy.classList.add('in');
      setTimeout(runCounters, 700);
      setTimeout(startRotator, 1600);
      showcaseIO.disconnect();
    }, { threshold: .25 });
    showcaseIO.observe(showcaseCopy);
  }

  /* ---------- Page transition: fade out, then go to the next page ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || reduceMotion) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    let url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (!/^(https?|file):$/.test(url.protocol)) return;          // skips mailto:, tel:
    if (url.origin !== location.origin) return;                   // skips other websites
    if (url.href === location.href) return;                       // already on this page
    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = url.href; }, 350);
  });
  // Coming back with the Back button: make sure the page is visible again
  window.addEventListener('pageshow', e => {
    if (e.persisted) document.body.classList.remove('page-leaving');
  });

  /* ---------- Products & Cart (collection page + shared cart drawer) ---------- */
  const products = [
    { id: 1, name: 'Terra', price: 34, color: '#B08D57', material: 'Bio-resin' },
    { id: 2, name: 'Onyx', price: 34, color: '#22201C', material: 'Bio-resin' },
    { id: 3, name: 'Ivory', price: 32, color: '#EDEAE4', material: 'Leather' },
    { id: 4, name: 'Sage', price: 36, color: '#7A8B6F', material: 'Leather' },
    { id: 5, name: 'Clay', price: 34, color: '#A9633C', material: 'Bio-resin' },
    { id: 6, name: 'Plum', price: 38, color: '#5C3A4E', material: 'Leather' },
  ];

  const grid = document.getElementById('product-grid');
  function cardHTML(p) {
    return `<div class="card reveal">
    <div class="swatch" style="background:${p.color}">
      <button data-add="${p.id}" class="card__add" aria-label="Add to cart">
        <svg class="icon icon--sm" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>
    <div class="card__row">
      <div><p class="card__name">${p.name}</p><p class="card__material">${p.material}</p></div>
      <p class="card__price">$${p.price}</p>
    </div>
  </div>`;
  }
  if (grid) {
    grid.innerHTML = products.map(cardHTML).join('');
    document.querySelectorAll('.reveal').forEach(el => io.observe(el)); // observe new cards
    const countEl = document.getElementById('product-count');
    if (countEl) countEl.textContent = products.length;
  }

  let cart = [];
  try { cart = JSON.parse(store.get('cbt-cart', '[]')) || []; } catch (e) { cart = []; }
  function saveCart() { store.set('cbt-cart', JSON.stringify(cart)); renderCart(); }
  function renderCart() {
    const itemsEl = document.getElementById('cart-items');
    const countBadge = document.getElementById('cart-count');
    const count = cart.reduce((s, i) => s + i.qty, 0);
    if (countBadge) countBadge.textContent = count;
    if (!itemsEl) return;
    if (cart.length === 0) {
      itemsEl.innerHTML = `<p class="cart-drawer__empty">Your cart is empty.</p>`;
    } else {
      itemsEl.innerHTML = cart.map(i => {
        const p = products.find(x => x.id === i.id);
        return `<div class="cart-item">
        <div class="cart-item__swatch" style="background:${p.color}"></div>
        <div class="cart-item__body">
          <p class="cart-item__name">${p.name}</p>
          <p class="cart-item__price">$${p.price}</p>
          <div class="cart-item__controls">
            <button data-dec="${i.id}" class="icon-btn"><svg class="icon icon--sm" viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
            <span>${i.qty}</span>
            <button data-inc="${i.id}" class="icon-btn"><svg class="icon icon--sm" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
            <button data-rm="${i.id}" class="icon-btn remove underline-fade">Remove</button>
          </div>
        </div>
      </div>`;
      }).join('');
    }
    const subtotal = cart.reduce((s, i) => { const p = products.find(x => x.id === i.id); return s + p.price * i.qty; }, 0);
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('checkout-total');
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
    if (totalEl) totalEl.textContent = '$' + subtotal.toFixed(2);
  }
  document.body.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { const id = +add.dataset.add; const it = cart.find(i => i.id === id); it ? it.qty++ : cart.push({ id, qty: 1 }); saveCart(); openCart(); }
    const inc = e.target.closest('[data-inc]');
    if (inc) { cart.find(i => i.id === +inc.dataset.inc).qty++; saveCart(); }
    const dec = e.target.closest('[data-dec]');
    if (dec) { const it = cart.find(i => i.id === +dec.dataset.dec); it.qty--; if (it.qty <= 0) cart = cart.filter(i => i.id !== it.id); saveCart(); }
    const rm = e.target.closest('[data-rm]');
    if (rm) { cart = cart.filter(i => i.id !== +rm.dataset.rm); saveCart(); }
  });
  renderCart();

  /* ---------- Cart drawer open/close ---------- */
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  function openCart() {
    if (!drawer || !backdrop) return;
    drawer.classList.remove('is-closed');
    backdrop.classList.remove('is-hidden');
  }
  function closeCart() {
    if (!drawer || !backdrop) return;
    drawer.classList.add('is-closed');
    backdrop.classList.add('is-hidden');
  }
  const cartBtn = document.getElementById('cart-btn');
  const cartClose = document.getElementById('cart-close');
  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (backdrop) backdrop.addEventListener('click', closeCart);

  /* ---------- Search ---------- */
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const searchClose = document.getElementById('search-close');
  if (searchBtn && searchOverlay && searchInput) {
    searchBtn.addEventListener('click', () => {
      searchOverlay.classList.remove('is-hidden');
      searchInput.focus();
    });
  }
  if (searchClose && searchOverlay) {
    searchClose.addEventListener('click', () => searchOverlay.classList.add('is-hidden'));
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const res = products.filter(p => p.name.toLowerCase().includes(q));
      const resultsEl = document.getElementById('search-results');
      if (!resultsEl) return;
      resultsEl.innerHTML = q
        ? (res.map(p => `<div class="row"><span>${p.name}</span><span>$${p.price}</span></div>`).join('') || `<p style="color:var(--fg-mute)">No matches.</p>`)
        : '';
    });
  }

  /* ---------- Checkout ---------- */
  const checkoutBackdrop = document.getElementById('checkout-backdrop');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutClose = document.getElementById('checkout-close');
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutBtn && checkoutBackdrop) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;
      closeCart();
      checkoutBackdrop.classList.remove('is-hidden');
    });
  }
  if (checkoutClose && checkoutBackdrop) {
    checkoutClose.addEventListener('click', () => {
      checkoutBackdrop.classList.add('is-hidden');
      document.getElementById('checkout-form-wrap').classList.remove('is-hidden');
      document.getElementById('checkout-success').classList.remove('is-visible');
      if (checkoutForm) checkoutForm.reset();
    });
  }
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', e => {
      e.preventDefault();
      document.getElementById('checkout-form-wrap').classList.add('is-hidden');
      document.getElementById('checkout-success').classList.add('is-visible');
      cart = []; saveCart();
      setTimeout(() => checkoutBackdrop.classList.add('is-hidden'), 2200);
    });
  }

  /* ---------- Contact page form ---------- */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      document.getElementById('contact-form-wrap').classList.add('is-hidden');
      document.getElementById('contact-success').classList.add('is-visible');
      contactForm.reset();
    });
  }

});
