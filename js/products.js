/* =========================================================
   products.js — Product catalog & grid rendering
   ========================================================= */
const Products = (() => {
  let catalog = { categories: [], products: [] };
  let activeCategory = 'all';
  let searchTerm = '';

  async function load() {
    if (window.PRODUCTS_DATA) {
      // Deep copy so in-memory edits never mutate the original embedded data
      catalog = JSON.parse(JSON.stringify(window.PRODUCTS_DATA));
    } else {
      // Fallback for environments where the data file wasn't included (e.g. served differently)
      const res = await fetch('data/products.json');
      catalog = await res.json();
    }
    mergeCustomProducts();
    applyDeletedFilter();
    applyPriceOverrides();
    applyImageOverrides();
    return catalog;
  }

  function applyImageOverrides() {
    const overrides = Storage.getImageOverrides();
    catalog.products.forEach(p => {
      if (overrides[p.id]) p.image = overrides[p.id];
    });
  }

  function updateImage(id, dataUrl) {
    const product = catalog.products.find(p => p.id === id);
    if (product) product.image = dataUrl;
    const overrides = Storage.getImageOverrides();
    overrides[id] = dataUrl;
    Storage.saveImageOverrides(overrides);
  }

  function resizeImageFile(file, maxSize = 480, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize) { height = height * (maxSize / width); width = maxSize; }
          else if (height > maxSize) { width = width * (maxSize / height); height = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function applyDeletedFilter() {
    const deleted = new Set(Storage.getDeletedProductIds());
    catalog.products = catalog.products.filter(p => !deleted.has(p.id));
  }

  function removeProduct(id) {
    const product = catalog.products.find(p => p.id === id);
    if (!product) return;
    if (product.custom) {
      removeCustomProduct(id);
    } else {
      const deleted = Storage.getDeletedProductIds();
      if (!deleted.includes(id)) {
        deleted.push(id);
        Storage.saveDeletedProductIds(deleted);
      }
      catalog.products = catalog.products.filter(p => p.id !== id);
    }
  }

  function slugify(s) {
    return s.trim().toLowerCase()
      .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/ç/g, 'c')
      .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùû]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function mergeCustomProducts() {
    const custom = Storage.getCustomProducts();
    custom.forEach(p => {
      if (!catalog.categories.find(c => c.slug === p.categorySlug)) {
        catalog.categories.push({ slug: p.categorySlug, name: p.category });
      }
      if (!catalog.products.find(cp => cp.id === p.id)) {
        catalog.products.push(p);
      }
    });
  }

  function placeholderImage(categorySlug, name) {
    const palette = {
      vendiserie: ['#F59E0B', '#FCD34D'], entree: ['#EF4444', '#FCA5A5'],
      sandwicherie: ['#F97316', '#FDBA74'], plats: ['#DC2626', '#FB7185'],
      pizza: ['#EA580C', '#FBBF24'], dessert: ['#EC4899', '#F9A8D4'],
      grillande: ['#B91C1C', '#F87171'], accompagnements: ['#D97706', '#FDE68A'],
      'boissons-chaudes': ['#92400E', '#D6A76B'], 'boissons-froides': ['#0EA5E9', '#7DD3FC'],
      'packs-combos': ['#7C3AED', '#C4B5FD'], 'autres': ['#64748B', '#CBD5E1'],
    };
    const [c1, c2] = palette[categorySlug] || ['#F97316', '#FDBA74'];
    const size = 480;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.38, size * 0.28, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c1;
    ctx.globalAlpha = 0.35;
    ctx.font = '700 120px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((categorySlug.split('-')[0][0] || '?').toUpperCase(), size / 2, size * 0.38);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px Arial, sans-serif';
    const words = name.split(' ');
    let lines = [], cur = '';
    words.forEach(w => {
      const test = (cur + ' ' + w).trim();
      if (ctx.measureText(test).width > size * 0.86 && cur) { lines.push(cur); cur = w; } else { cur = test; }
    });
    if (cur) lines.push(cur);
    lines = lines.slice(0, 3);
    let y = size * 0.72;
    lines.forEach(line => { ctx.fillText(line, size / 2, y); y += 36; });

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  function addCustomProduct({ category, categorySlug, name, price, image }) {
    const id = `custom-${Date.now()}`;
    const product = {
      id, category, categorySlug, name, price: Math.max(0, Number(price) || 0),
      image: image || placeholderImage(categorySlug, name), custom: true,
    };
    const custom = Storage.getCustomProducts();
    custom.push(product);
    Storage.saveCustomProducts(custom);

    if (!catalog.categories.find(c => c.slug === categorySlug)) {
      catalog.categories.push({ slug: categorySlug, name: category });
    }
    catalog.products.push(product);
    return product;
  }

  function addPack({ name, price, componentCategories }) {
    const category = 'PACKS / COMBOS';
    const categorySlug = 'packs-combos';
    const id = `custom-${Date.now()}`;
    const product = {
      id, category, categorySlug, name, price: Math.max(0, Number(price) || 0),
      image: placeholderImage(categorySlug, name), custom: true,
      isPack: true, packComponents: componentCategories,
    };
    const custom = Storage.getCustomProducts();
    custom.push(product);
    Storage.saveCustomProducts(custom);

    if (!catalog.categories.find(c => c.slug === categorySlug)) {
      catalog.categories.push({ slug: categorySlug, name: category });
    }
    catalog.products.push(product);
    return product;
  }

  function removeCustomProduct(id) {
    const custom = Storage.getCustomProducts().filter(p => p.id !== id);
    Storage.saveCustomProducts(custom);
    catalog.products = catalog.products.filter(p => p.id !== id);
  }

  function applyPriceOverrides() {
    const overrides = Storage.getPriceOverrides();
    catalog.products.forEach(p => {
      if (overrides[p.id] !== undefined) p.price = overrides[p.id];
    });
  }

  function getAllProducts() {
    return catalog.products;
  }

  function updatePrice(id, newPrice) {
    const product = catalog.products.find(p => p.id === id);
    if (product) product.price = newPrice;
  }

  function getCategories() {
    return catalog.categories;
  }

  function getFiltered() {
    return catalog.products.filter(p => {
      const matchesCat = activeCategory === 'all' || p.categorySlug === activeCategory;
      const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }

  function setCategory(slug) { activeCategory = slug; }
  function setSearch(term) { searchTerm = term; }

  function formatPrice(n) {
    const settings = Storage.getSettings();
    return `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;
  }

  function initial(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  function renderGrid() {
    const grid = document.getElementById('productGrid');
    const emptyState = document.getElementById('emptyState');
    const list = getFiltered();

    if (!list.length) {
      grid.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    grid.innerHTML = list.map(p => {
      const qty = Cart.getQty(p.id);
      const hasPrice = p.price > 0;
      const imgSrc = p.image || '';
      return `
        <div class="product-card" data-id="${p.id}">
          <div class="product-thumb">${imgSrc
            ? `<img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'product-thumb-fallback',textContent:'${initial(p.name)}'}))">`
            : initial(p.name)}</div>
          <div class="product-cat-tag">${p.category}</div>
          <div class="product-name">${p.name}</div>
          ${p.isPack ? `<span class="pack-badge">Pack</span><div class="product-pack-components">${(p.packComponents || []).join(' + ')}</div>` : ''}
          <div class="product-price ${hasPrice ? '' : 'zero'}">${hasPrice ? formatPrice(p.price) : 'Prix à définir'}</div>
          <div class="qty-controls">
            <button class="qty-btn qty-minus" data-id="${p.id}" aria-label="Retirer 1">−</button>
            <span class="qty-value" data-qty-for="${p.id}">${qty}</span>
            <button class="qty-btn qty-plus" data-id="${p.id}" aria-label="Ajouter 1">+</button>
            <div class="qty-bulk">
              <button data-id="${p.id}" data-bulk="5">+5</button>
              <button data-id="${p.id}" data-bulk="10">+10</button>
              <button data-id="${p.id}" data-bulk="20">+20</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function bindGridEvents() {
    const grid = document.getElementById('productGrid');
    grid.addEventListener('click', (e) => {
      const plus = e.target.closest('.qty-plus');
      const minus = e.target.closest('.qty-minus');
      const bulk = e.target.closest('[data-bulk]');

      if (plus) Cart.addQty(plus.dataset.id, 1);
      else if (minus) Cart.addQty(minus.dataset.id, -1);
      else if (bulk) Cart.addQty(bulk.dataset.id, parseInt(bulk.dataset.bulk, 10));
      else return;

      updateQtyDisplay(plus?.dataset.id || minus?.dataset.id || bulk?.dataset.id);
    });
  }

  function updateQtyDisplay(id) {
    const el = document.querySelector(`[data-qty-for="${id}"]`);
    if (el) el.textContent = Cart.getQty(id);
  }

  function getProductById(id) {
    return catalog.products.find(p => p.id === id);
  }

  return {
    load, getCategories, getFiltered, setCategory, setSearch,
    renderGrid, bindGridEvents, formatPrice, getProductById,
    getAllProducts, updatePrice, slugify,
    addCustomProduct, removeCustomProduct, removeProduct, addPack,
    updateImage, resizeImageFile,
  };
})();
