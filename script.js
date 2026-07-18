/* exported addToCart, removeFromCart, renderCategoryProducts */
// Load products from products.json
let products = [];
let cart = [];
let currentCategory = null;
let currentSubcategory = null;

// small helper to generate url-safe slugs for product pages
function slugify(text) {
  return String(text).toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/(^-|-$)/g,'');
}

function getRootPath() {
  if (window.location.pathname.includes('/category/') || window.location.pathname.includes('/product/')) {
    return '../';
  }
  return './';
}

function getProductsJsonPath() {
  return getRootPath() + 'products.json';
}

const categoryImages = {
  "Hairs": "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80",
  "Fragrances": "https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=900&q=80",
  "Body Care": "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=900&q=80"
};


// Load products from products.json
async function loadProducts() {
  try {
    const spinner = document.getElementById('loading-spinner');
    const loadingMessage = document.getElementById('loading-message');
    const grid = document.getElementById('products-grid');
    if (spinner) {
      spinner.style.display = 'block';
      spinner.setAttribute('aria-busy', 'true');
      spinner.setAttribute('aria-hidden', 'false');
    }
    if (loadingMessage) loadingMessage.textContent = 'Loading products...';
    if (grid) grid.style.display = 'none';
    const apiBase = window.ShopAida ? window.ShopAida.API_BASE : '';
    const res = await fetch(`${apiBase}/api/products?limit=100`);
    const data = await res.json();
    products = Array.isArray(data) ? data : (data.products || []);
    products = products.map(p => ({...p, id: (p.metadata && p.metadata.originalId) ? p.metadata.originalId : (p._id || p.id), image: (p.images && p.images.length ? p.images[0] : (p.image || '')), subcategory: p.subcategory || (p.tags && p.tags.length ? p.tags[0] : null) }));
    if (spinner) {
      spinner.style.display = 'none';
      spinner.setAttribute('aria-busy', 'false');
      spinner.setAttribute('aria-hidden', 'true');
    }
    if (grid) {
      grid.style.display = 'grid';
      if (!grid.hasAttribute('data-custom-render')) {
        renderProducts();
      }
    }
    // render categories and segments after products load
    renderCategories();
    renderNewArrivalsGrid();
    // render the homepage carousels (new / discounts / featured / seasonal)
    renderHomeCarousels();
    if (loadingMessage) {
      loadingMessage.textContent = 'Products loaded';
      setTimeout(() => { if (loadingMessage) loadingMessage.textContent = ''; }, 800);
    }
  } catch (err) {
    const spinner = document.getElementById('loading-spinner');
    const loadingMessage = document.getElementById('loading-message');
    const grid = document.getElementById('products-grid');
    if (spinner) {
      spinner.style.display = 'none';
      spinner.setAttribute('aria-busy', 'false');
      spinner.setAttribute('aria-hidden', 'true');
    }
    if (loadingMessage) loadingMessage.textContent = 'Failed to load products.';
    if (grid) grid.innerHTML = '<div style="color:#e53935;font-weight:600;text-align:center;padding:32px;">Failed to load products. Please try again later.<br><span style="font-size:0.95em;color:#888;">Check that you are running a local server and products.json is present.</span></div>';
  }
}

// Render categories / segments for filtering
function renderCategories() {
  const container = document.getElementById('categories-container');
  if (!container) return;
  container.innerHTML = '';
  const map = {};
  products.forEach(p => {
    const c = p.category || 'Other';
    const s = p.subcategory || null;
    if (!map[c]) map[c] = new Set();
    if (s) map[c].add(s);
  });
  // 'All' button
  const allBtn = document.createElement('button');
  allBtn.textContent = 'All';
  allBtn.className = 'cat-btn';
  allBtn.classList.add('active');
  allBtn.onclick = () => { setCategoryFilter(null, null); };
  container.appendChild(allBtn);

  // populate category select in header (marketplace-style)
  const catSelect = document.getElementById('category-select');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">All Categories</option>';
    Object.keys(map).forEach(category => {
      const opt = document.createElement('option');
      opt.value = category;
      opt.textContent = category;
      catSelect.appendChild(opt);
    });
    catSelect.onchange = () => { 
      const selectedCategory = catSelect.value || null;
      setCategoryFilter(selectedCategory, null);
      // Update button active state
      updateCategoryButtons(selectedCategory, null);
    };
  }

  Object.keys(map).forEach(category => {
    const catBtn = document.createElement('button');
    catBtn.textContent = category;
    catBtn.title = category;
    catBtn.className = 'cat-btn';
    catBtn.onclick = () => { setCategoryFilter(category, null); };
    container.appendChild(catBtn);

    // add small subcategory buttons
    map[category].forEach(sub => {
      if (!sub) return;
      const subBtn = document.createElement('button');
      // handle different separator types (em-dash or hyphen)
      const cleanSub = String(sub).replace(category + ' — ', '').replace(category + ' - ', '');
      subBtn.textContent = cleanSub;
      subBtn.className = 'sub-btn';
      subBtn.onclick = (e) => { e.stopPropagation(); setCategoryFilter(category, sub); };
      container.appendChild(subBtn);
    });
  });

  // Render clickable category image gallery (if present on page)
  const gallery = document.getElementById('category-gallery');
  if (gallery) {
    gallery.innerHTML = '';
    Object.keys(map).forEach(category => {
      const imgSrc = categoryImages[category] || (products.find(p => p.category === category)?.image) || '';
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'category-card';
      a.onclick = (e) => { e.preventDefault(); setCategoryFilter(category, null); window.scrollTo({ top: document.getElementById('products').offsetTop - 80, behavior: 'smooth' }); };
      const safeImgSrc = imgSrc.startsWith('http') || imgSrc.startsWith('/') ? imgSrc : getRootPath() + imgSrc;
      a.innerHTML = `<img src="${safeImgSrc}" alt="${category}" loading="lazy" onerror="this.onerror=null;this.src='${getRootPath()}images/placeholder.svg';" /><div class="category-label">${category}</div>`;
      gallery.appendChild(a);
    });
  }
}

function getFilteredProducts() {
  const searchInput = document.getElementById('search-input');
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  const sortSelect = document.getElementById('sort-select');

  let filtered = products.slice();
  if (currentCategory) filtered = filtered.filter(p => p.category === currentCategory);
  if (currentSubcategory) filtered = filtered.filter(p => p.subcategory === currentSubcategory);

  const q = searchInput?.value.trim().toLowerCase() || '';
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q));

  const min = parseFloat(priceMin?.value);
  const max = parseFloat(priceMax?.value);
  if (!isNaN(min)) filtered = filtered.filter(p => p.price >= min);
  if (!isNaN(max)) filtered = filtered.filter(p => p.price <= max);

  const sort = sortSelect?.value;
  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'name-desc') filtered.sort((a, b) => b.name.localeCompare(a.name));

  return filtered;
}

function applyFilters() {
  renderProducts(getFilteredProducts());
}

function setCategoryFilter(category, subcategory) {
  currentCategory = category;
  currentSubcategory = subcategory;
  
  // Update category buttons with proper active state
  updateCategoryButtons(category, subcategory);
  
  // Sync header dropdown with selected category
  const catSelect = document.getElementById('category-select');
  if (catSelect) {
    catSelect.value = category || '';
  }
  
  // highlight category cards
  const cards = document.querySelectorAll('.category-card');
  cards.forEach(c => {
    const label = c.querySelector('.category-label')?.textContent || '';
    c.classList.toggle('active', label === category);
  });
  applyFilters();
}

function updateCategoryButtons(category, subcategory) {
  const buttons = document.querySelectorAll('#categories-container button');
  buttons.forEach(b => {
    const btnText = b.textContent.trim();
    const isAllBtn = btnText === 'All';
    const isActive = isAllBtn ? !category : (btnText === category || btnText === (subcategory ? subcategory.replace(category + ' — ', '') : ''));
    
    if (isActive) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

function createProductCard(product) {
  try {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    const slug = slugify(product.name || 'product');
    const productUrl = getRootPath() + `product/${product.id}-${slug}.html`;
    
    // Fallback image handling
    const imgSrc = product.image ? (product.image.startsWith('http') ? product.image : getRootPath() + product.image) : getRootPath() + 'images/placeholder.svg';
    
    productCard.innerHTML = `
      <a href="${productUrl}">
        <img src="${imgSrc}" alt="${product.name || 'Product'}" class="product-img-frame" loading="lazy" onerror="this.onerror=null;this.src='${getRootPath()}images/placeholder.svg';" />
      </a>
      <div class="product-name"><a href="${productUrl}">${product.name || 'Product'}</a></div>
      <div class="product-sub">${product.subcategory || product.category || ''}</div>
      <div class="product-price">${window.ShopAida && window.ShopAida.formatCurrency ? window.ShopAida.formatCurrency(product.price) : '₦' + product.price}</div>
      <div class="product-actions">
        <button class="add-btn" onclick="addToCart('${product.id}')">Add</button>
        <a class="view-btn" href="${productUrl}">View</a>
      </div>
    `;
    return productCard;
  } catch (err) {
    console.error('Error creating product card:', err, product);
    return null;
  }
}

// Render products in grid format for category pages
function renderCategoryProducts(list = products) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const items = (list && list.length) ? list : [];
  if (items.length === 0) {
    grid.innerHTML = '<div style="text-align:center;color:#666;width:100%;padding:24px;">No products found in this category.</div>';
    return;
  }
  items.forEach(product => {
    const card = createProductCard(product);
    if (card) grid.appendChild(card);
  });
}

// Render products on index page
function renderProducts(list = products) {
  console.log('renderProducts: starting, list length=', list && list.length);
  try {
    const grid = document.getElementById('products-grid');
    if (!grid) {
      console.warn('renderProducts: products-grid element not found');
      return;
    }
    grid.innerHTML = '';
    const items = (list && list.length) ? list : [];
    if (items.length === 0) {
      console.log('renderProducts: items length is 0');
      grid.innerHTML = '<div style="text-align:center;color:#666;width:100%;padding:24px;grid-column:1/-1;">No products match your filters.</div>';
      return;
    }
    console.log('renderProducts: items count=', items.length);
    items.forEach((product, idx) => {
      const card = createProductCard(product);
      if (card) {
        grid.appendChild(card);
      } else {
        console.warn('renderProducts: failed to create card for index', idx, product);
      }
    });
    console.log('renderProducts: finished, grid child count=', grid.children.length);
  } catch (err) {
    console.error('renderProducts: fatal error:', err);
  }
}

// Build a carousel element for an arbitrary list of products (reusable)
function renderNewArrivalsGrid() {
  const grid = document.getElementById('new-arrivals-grid');
  if (!grid) return;
  if (!products || !products.length) {
    grid.innerHTML = '<div class="empty-state">No new arrivals are available right now. Please check back soon.</div>';
    return;
  }
  const newest = products.slice().sort((a, b) => b.id - a.id).slice(0, 10);
  grid.innerHTML = '';

  if (!newest.length) {
    grid.innerHTML = '<div class="empty-state">No new arrivals are available right now. Please check back soon.</div>';
    return;
  }

  newest.forEach(product => {
    const slug = slugify(product.name);
    const productUrl = getRootPath() + `product/${product.id}-${slug}.html`;
    const card = document.createElement('a');
    card.className = 'new-arrival-card';
    card.href = productUrl;
    card.innerHTML = `
      <img src="${getRootPath()}${product.image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${getRootPath()}images/placeholder.svg';" />
      <div class="new-arrival-copy">
        <div class="new-arrival-name">${product.name}</div>
        <div class="new-arrival-meta">${product.category || 'New'} · ${window.ShopAida.formatCurrency(product.price)}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function buildCarousel(items, opts = {}) {
  const autoplay = !!opts.autoplay;
  const interval = opts.interval || 4000;

  const carousel = document.createElement('div');
  carousel.className = 'carousel' + (autoplay ? ' autoplay' : '');

  const track = document.createElement('div');
  track.className = 'carousel-track';
  track.setAttribute('role', 'list');

  items.forEach(product => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    const slug = slugify(product.name);
    const productUrl = getRootPath() + `product/${product.id}-${slug}.html`;
    slide.innerHTML = `
      <div class="product-card" role="listitem" tabindex="0">
        <a href="${productUrl}"><img src="${getRootPath()}${product.image}" alt="${product.name}" class="product-img-frame" loading="lazy" onerror="this.onerror=null;this.src='${getRootPath()}images/placeholder.svg';" /></a>
        <div class="product-name"><a href="${productUrl}">${product.name}</a></div>
        <div class="product-sub">${product.category || ''}</div>
        <div class="product-price">${window.ShopAida.formatCurrency(product.price)}</div>
        <div class="product-actions">
          <button class="add-btn" onclick="addToCart('${product.id}')">Add</button>
          <a class="view-btn" href="${productUrl}">View</a>
        </div>
      </div>
    `;
    track.appendChild(slide);
  });

  const prev = document.createElement('button');
  prev.className = 'carousel-button prev';
  prev.innerHTML = '&#9664;';
  prev.setAttribute('aria-label', 'Previous');
  prev.onclick = () => { track.scrollBy({ left: -Math.round(track.clientWidth * 0.8), behavior: 'smooth' }); };

  const next = document.createElement('button');
  next.className = 'carousel-button next';
  next.innerHTML = '&#9654;';
  next.setAttribute('aria-label', 'Next');
  next.onclick = () => { track.scrollBy({ left: Math.round(track.clientWidth * 0.8), behavior: 'smooth' }); };

  // indicators
  const indicators = document.createElement('div');
  indicators.className = 'carousel-indicators';

  // helper debounce
  const debounceLocal = (fn, wait = 100) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; };

  function updateActiveIndicator() {
    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    if (!slides.length) return;
    const scrollLeft = track.scrollLeft;
    let nearestIndex = 0;
    let nearestDist = Infinity;
    slides.forEach((s, i) => {
      const dist = Math.abs(s.offsetLeft - scrollLeft);
      if (dist < nearestDist) { nearestDist = dist; nearestIndex = i; }
    });
    const dots = Array.from(indicators.children);
    dots.forEach((d, i) => d.classList.toggle('active', i === nearestIndex));
  }

  // autoplay controls
  let timer = null;
  function startAutoplay() { if (!autoplay) return; stopAutoplay(); timer = setInterval(() => { next.click(); }, interval); carousel._autoplayTimer = timer; }
  function stopAutoplay() { if (timer) { clearInterval(timer); timer = null; carousel._autoplayTimer = null; } }

  // wire scroll updates to indicators
  track.addEventListener('scroll', debounceLocal(updateActiveIndicator, 120));

  carousel.appendChild(track);
  carousel.appendChild(prev);
  carousel.appendChild(next);
  carousel.appendChild(indicators);

  // create dots AFTER slides exist so we can measure them
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  slides.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Slide ${i+1}`);
    btn.onclick = () => { track.scrollTo({ left: s.offsetLeft, behavior: 'smooth' }); };
    indicators.appendChild(btn);
  });

  // initial active dot update
  setTimeout(updateActiveIndicator, 60);

  // pause/resume on hover & focus
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', startAutoplay);

  // keyboard support
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next.click();
    if (e.key === 'ArrowLeft') prev.click();
  });

  // start autoplay if requested
  startAutoplay();

  return carousel;
}

// Render homepage carousels for New / Discounts / Featured / Seasonal
function renderHomeCarousels() {
  try {
    const debugBox = document.getElementById('carousel-debug');
    if (debugBox) debugBox.textContent = 'renderHomeCarousels: called — products=' + (products ? products.length : 0);
    console.log('renderHomeCarousels: called, products.length=', products && products.length);

    const newEl = document.getElementById('carousel-new');
    const discEl = document.getElementById('carousel-discounts');
    const featEl = document.getElementById('carousel-featured');
    const seasEl = document.getElementById('carousel-seasonal');
    if (!products || !products.length) {
      if (debugBox) debugBox.textContent += ' (no products found)';
      return;
    }

    // New products (most recent IDs)
    const newProducts = products.slice().sort((a,b) => b.id - a.id).slice(0,10);
    try {
      if (newEl) { newEl.innerHTML = ''; newEl.appendChild(buildCarousel(newProducts, { autoplay: true, interval: 3500 })); newEl.insertAdjacentHTML('beforeend', `<div class="carousel-status">${newProducts.length} new products</div>`); console.log('renderHomeCarousels: newProducts=', newProducts.length); }

      // Discounts (price threshold - example heuristic)
      const discounts = products.filter(p => p.price <= 25).slice(0,10);
      if (discEl) { discEl.innerHTML = ''; if (discounts.length) { discEl.appendChild(buildCarousel(discounts, { autoplay: true, interval: 4200 })); discEl.insertAdjacentHTML('beforeend', `<div class="carousel-status">${discounts.length} discounted items</div>`);} else discEl.innerHTML = '<div class="empty-state"><i class="fas fa-tag" style="color:var(--muted);font-size:2.5rem;margin-bottom:12px;opacity:0.5;"></i><p style="color:var(--muted);font-size:1rem;margin:12px 0 0 0;">No discounts available at the moment.</p></div>' ; console.log('renderHomeCarousels: discounts=', discounts.length); }

      // Featured collections (curated set)
      const featuredIds = [13,14,15,1,5,12,9,11];
      const featured = featuredIds.map(id => products.find(p => p.id === id)).filter(Boolean);
      if (featEl) { featEl.innerHTML = ''; featEl.appendChild(buildCarousel(featured, { autoplay: true, interval: 3800 })); featEl.insertAdjacentHTML('beforeend', `<div class="carousel-status">${featured.length} featured items</div>`); console.log('renderHomeCarousels: featured=', featured.length); }

      // Seasonal campaigns (candles, diffusers, body mists)
      const seasonal = products.filter(p => /candle|diffuser|body mist|mist/i.test(p.subcategory || '') ).slice(0,10);
      if (seasEl) { seasEl.innerHTML = ''; if (seasonal.length) { seasEl.appendChild(buildCarousel(seasonal, { autoplay: true, interval: 4600 })); seasEl.insertAdjacentHTML('beforeend', `<div class="carousel-status">${seasonal.length} seasonal items</div>`);} else seasEl.innerHTML = '<div class="empty-state"><i class="fas fa-snowflake" style="color:var(--muted);font-size:2.5rem;margin-bottom:12px;opacity:0.5;"></i><p style="color:var(--muted);font-size:1rem;margin:12px 0 0 0;">No seasonal items currently available.</p></div>' ; console.log('renderHomeCarousels: seasonal=', seasonal.length); }
    } catch (err) {
      console.warn('renderHomeCarousels error', err);
      if (newEl) newEl.insertAdjacentHTML('beforeend', `<div class="carousel-status">Error: ${String(err.message || err)}</div>`);
    }
  } catch (err) {
    console.warn('renderHomeCarousels error', err);
  }
}

// Add product to cart (robust across product pages where `products` may not be loaded)
function addToCart(id) {
  // Try to find product metadata in the loaded products array
  let itemData = (Array.isArray(products) && products.find(p => String(p.id) === String(id))) || null;

  // Fallback: product page may expose its product data on window.__product
  if (!itemData && window.__product && String(window.__product.id) === String(id)) {
    itemData = window.__product;
  }

  // Fallback: read product data from DOM on product pages
  if (!itemData) {
    try {
      const nameEl = document.querySelector('main h1');
      const priceEl = document.querySelector('main [style*="font-weight:700"]');
      const imgEl = document.querySelector('main img');
      const name = nameEl ? nameEl.textContent.trim() : 'Product';
      const priceText = priceEl ? priceEl.textContent.replace(/[^0-9.]/g, '') : '0';
      const price = parseFloat(priceText) || 0;
      const image = imgEl ? imgEl.src : '';
      itemData = { id, name, price, image };
    } catch (e) {
      itemData = { id, name: 'Product', price: 0, image: '' };
    }
  }

  const cartItem = cart.find(c => String(c.id) === String(id));
  if (cartItem) {
    cartItem.qty += 1;
  } else {
    cart.push({
      id: itemData.id,
      name: itemData.name,
      price: Number(itemData.price) || 0,
      image: itemData.image || '',
      qty: 1
    });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartIcon(true);
  showCartConfirm();
}

function showCartConfirm() {
  let confirmDiv = document.getElementById('cart-confirm');
  if (!confirmDiv) {
    confirmDiv = document.createElement('div');
    confirmDiv.id = 'cart-confirm';
    confirmDiv.textContent = 'Added to cart!';
    confirmDiv.style.cssText = 'display:block;position:fixed;top:24px;right:24px;background:var(--primary);color:#fff;padding:12px 24px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);z-index:999;font-size:1.05em;';
    document.body.appendChild(confirmDiv);
    setTimeout(() => { try { confirmDiv.remove(); } catch (e) { console.warn(e); } }, 1500);
    return;
  }
  confirmDiv.style.display = 'block';
  setTimeout(() => { confirmDiv.style.display = 'none'; }, 1500);
}


// Remove product from cart
function removeFromCart(id) {
  cart = cart.filter(item => String(item.id) !== String(id));
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartIcon();
  renderCart();
}

// Render cart on cart.html
function renderCart() {
  const cartDiv = document.getElementById('cart');
  if (!cartDiv) return; // Only render on cart page
  cartDiv.innerHTML = '';
  if (cart.length === 0) {
    cartDiv.innerHTML = '<em>No items in cart.</em>';
    document.getElementById('total').textContent = '';
    return;
  }
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${getRootPath()}${item.image}" alt="${item.name}" class="product-img-frame" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-right:12px;" />
      <span>${item.name} x${item.qty}</span>
      <span>${window.ShopAida.formatCurrency(item.price * item.qty)} <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button></span>
    `;
    cartDiv.appendChild(div);
  });
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById('total').textContent = `Total: ${window.ShopAida.formatCurrency(total)}`;
}

// Update cart icon badge with pulse animation
function updateCartIcon(shouldPulse = false) {
  const icon = document.querySelector('.fa-shopping-cart');
  if (!icon) return;
  let cartArr = [];
  try {
    cartArr = JSON.parse(localStorage.getItem('cart')) || [];
  } catch(e) {
    console.warn(e);
  }
  const count = cartArr.reduce((sum, item) => sum + item.qty, 0);
  let badge = document.getElementById('cart-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'cart-badge';
    icon.parentElement.style.position = 'relative';
    icon.parentElement.appendChild(badge);
  }
  badge.textContent = count > 0 ? count : '';
  
  // Add pulse animation when badge is updated with items added
  if (shouldPulse && count > 0) {
    badge.classList.remove('pulse');
    // Trigger reflow to restart animation
    void badge.offsetWidth;
    badge.classList.add('pulse');
  }
}

// On page load, load products and cart, update icon, and render products
window.addEventListener('DOMContentLoaded', () => {
  try {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  } catch(e) { cart = []; }
  updateCartIcon();

  const searchInput = document.getElementById('search-input');
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  const sortSelect = document.getElementById('sort-select');
  const resetBtn = document.getElementById('reset-filters');

  // wire the global search form in header (top-search)
  const globalForm = document.querySelector('.top-search');
  const globalSearch = document.getElementById('global-search');
  if (globalForm) {
    globalForm.onsubmit = function(e) {
      e.preventDefault();
      const q = (globalSearch?.value || '').trim();
      if (searchInput) { searchInput.value = q; searchInput.dispatchEvent(new Event('input')); }
    };
  }

  const debounce = (fn, wait = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };


  if (searchInput) searchInput.addEventListener('input', debounce(applyFilters, 300));
  [priceMin, priceMax, sortSelect].forEach(el => { if (el) el.addEventListener('change', applyFilters); });
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    if (sortSelect) sortSelect.value = 'default';
    // reset category filters as well
    setCategoryFilter(null, null);
    applyFilters();
  });

  if (document.getElementById('products-grid')) {
    loadProducts();
  }
  if (document.getElementById('cart')) {
    renderCart();
  }

  window.renderCategoryProducts = renderCategoryProducts;
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;

});

// Checkout button handler (only on cart page)
// Remove incomplete checkout handler to fix syntax errors
