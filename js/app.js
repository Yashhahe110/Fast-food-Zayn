/* =========================================================
   app.js — App bootstrap, navigation, settings, theme
   ========================================================= */
const App = (() => {
  function init() {
    Login.init();
    applyTheme(Storage.getSettings().theme);
    applyBrand();

    const session = Storage.getSession();
    if (session) {
      enterApp();
    } else {
      document.getElementById('view-login').hidden = false;
      document.getElementById('view-app').hidden = true;
    }

    registerServiceWorker();
  }

  function applyBrand() {
    const settings = Storage.getSettings();
    const name = settings.restaurantName || 'Fast Food Zayn';
    const logo = settings.logo || '';

    const loginBrandName = document.getElementById('loginBrandName');
    const loginBrandMark = document.getElementById('loginBrandMark');
    const sidebarBrandMark = document.getElementById('sidebarBrandMark');
    const sidebarBrandName = document.getElementById('sidebarBrandName');
    const restaurantNameLabel = document.getElementById('restaurantNameLabel');

    if (loginBrandName) loginBrandName.textContent = name;
    if (sidebarBrandName) sidebarBrandName.textContent = name;
    if (restaurantNameLabel) restaurantNameLabel.textContent = name;

    const markHTML = logo ? `<img src="${logo}" alt="">` : (name.trim().charAt(0).toUpperCase() || 'B');
    if (loginBrandMark) loginBrandMark.innerHTML = markHTML;
    if (sidebarBrandMark) sidebarBrandMark.innerHTML = markHTML;
  }

  async function enterApp() {
    document.getElementById('view-login').hidden = true;
    document.getElementById('view-app').hidden = false;

    try {
      await Products.load();
    } catch (err) {
      Toast.show("Erreur de chargement du menu. Rechargez la page.");
      console.error('Product load failed:', err);
    }
    Categories.render();
    Categories.bindEvents();
    Products.bindGridEvents();
    Cart.bindEvents();

    const settings = Storage.getSettings();
    document.getElementById('restaurantNameLabel').textContent = settings.restaurantName;
    Cart.setDefaultDelivery(settings.defaultDelivery);
    loadSettingsForm(settings);

    Cart.render();
    Dashboard.renderStats();
    Dashboard.renderOrdersList();

    bindNavigation();
    bindSearch();
    bindThemeToggle();
    bindSettingsForm();
    bindOrderValidation();
    OrderEditor.bindEvents();
    bindMobileCart();
    bindLogout();
    bindPriceEditor();
    bindExportImages();
    bindAddProductForm();
    bindPackCreator();
    bindResetOrderNumber();
    bindResetStats();
    bindPrintClosing();
  }

  function bindNavigation() {
    const navButtons = document.querySelectorAll('.nav-item[data-page], .bnav-item[data-page]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'cart-mobile') { toggleMobileCart(true); return; }
        goToPage(page);
      });
    });
  }

  function goToPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    document.querySelectorAll('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    document.querySelectorAll('.bnav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));

    if (page === 'stats') Dashboard.renderStats();
    if (page === 'orders') Dashboard.renderOrdersList(document.getElementById('ordersSearchInput').value);
  }

  function bindSearch() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
      Products.setSearch(e.target.value);
      Products.renderGrid();
    });

    document.getElementById('ordersSearchInput').addEventListener('input', (e) => {
      Dashboard.renderOrdersList(e.target.value);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  function bindThemeToggle() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      const settings = Storage.getSettings();
      const next = settings.theme === 'dark' ? 'light' : 'dark';
      settings.theme = next;
      Storage.saveSettings(settings);
      applyTheme(next);
      syncThemeButtons(next);
    });
  }

  function syncThemeButtons(theme) {
    document.getElementById('themeLightBtn').classList.toggle('active', theme !== 'dark');
    document.getElementById('themeDarkBtn').classList.toggle('active', theme === 'dark');
  }

  function loadSettingsForm(settings) {
    document.getElementById('settingRestaurantName').value = settings.restaurantName;
    document.getElementById('settingCurrency').value = settings.currency;
    document.getElementById('settingDefaultDelivery').value = settings.defaultDelivery;
    document.getElementById('settingThankYou').value = settings.thankYouMessage;
    document.getElementById('settingLocation').value = settings.location || '';
    document.getElementById('settingPhone').value = settings.phone || '';
    document.getElementById('settingFacebook').value = settings.facebook || '';
    document.getElementById('settingWhatsapp').value = settings.whatsapp || '';
    syncThemeButtons(settings.theme);
  }

  function bindSettingsForm() {
    document.getElementById('themeLightBtn').addEventListener('click', () => {
      const settings = Storage.getSettings();
      settings.theme = 'light';
      Storage.saveSettings(settings);
      applyTheme('light');
      syncThemeButtons('light');
    });
    document.getElementById('themeDarkBtn').addEventListener('click', () => {
      const settings = Storage.getSettings();
      settings.theme = 'dark';
      Storage.saveSettings(settings);
      applyTheme('dark');
      syncThemeButtons('dark');
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      const settings = Storage.getSettings();
      settings.restaurantName = document.getElementById('settingRestaurantName').value.trim() || 'Fast Food Zayn';
      settings.currency = document.getElementById('settingCurrency').value.trim() || 'Ar';
      settings.defaultDelivery = Number(document.getElementById('settingDefaultDelivery').value) || 0;
      settings.thankYouMessage = document.getElementById('settingThankYou').value.trim() || 'Merci de votre visite !';
      settings.location = document.getElementById('settingLocation').value.trim();
      settings.phone = document.getElementById('settingPhone').value.trim();
      settings.facebook = document.getElementById('settingFacebook').value.trim();
      settings.whatsapp = document.getElementById('settingWhatsapp').value.trim();
      Storage.saveSettings(settings);

      applyBrand();
      const confirmMsg = document.getElementById('saveConfirmMsg');
      confirmMsg.hidden = false;
      Products.renderGrid();
      Cart.render();
      setTimeout(() => { confirmMsg.hidden = true; }, 2500);
    });
  }

  function bindOrderValidation() {
    document.getElementById('validateOrderBtn').addEventListener('click', () => {
      const order = Receipt.buildOrder();
      if (!order) { Toast.show('Ajoutez au moins un produit.'); return; }
      Storage.saveOrder(order);
      Receipt.open(order);
      Cart.clear();
      Dashboard.renderStats();
      Dashboard.renderOrdersList();
      Toast.show('Commande validée avec succès.');
      toggleMobileCart(false);
    });

    document.getElementById('closeReceiptBtn').addEventListener('click', Receipt.close);
    document.getElementById('closeReceiptBtn2').addEventListener('click', Receipt.close);
    document.getElementById('printReceiptBtn').addEventListener('click', Receipt.print);
    document.getElementById('downloadPdfBtn').addEventListener('click', Receipt.downloadPdf);
    document.getElementById('receiptModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'receiptModalOverlay') Receipt.close();
    });
  }

  function bindMobileCart() {
    const overlay = document.getElementById('cartDrawerOverlay');
    overlay.addEventListener('click', () => toggleMobileCart(false));
    document.getElementById('closeCartBtn').addEventListener('click', () => toggleMobileCart(false));
  }

  function toggleMobileCart(open) {
    document.getElementById('cartPanel').classList.toggle('open', open);
    document.getElementById('cartDrawerOverlay').classList.toggle('open', open);
  }

  function bindLogout() {
    const doLogout = () => {
      Storage.clearSession();
      location.reload();
    };
    document.getElementById('logoutBtn').addEventListener('click', doLogout);
    document.getElementById('logoutBtnTopbar').addEventListener('click', doLogout);
  }

  function renderPriceEditor(filterTerm) {
    const list = document.getElementById('priceEditorList');
    const products = Products.getAllProducts();
    const term = (filterTerm || '').toLowerCase();
    const filtered = products.filter(p => !term || p.name.toLowerCase().includes(term));

    if (!filtered.length) {
      list.innerHTML = '<p class="orders-empty">Aucun produit trouvé.</p>';
      return;
    }

    let html = '';
    let lastCat = null;
    filtered.forEach(p => {
      if (p.category !== lastCat) {
        html += `<div class="price-editor-group-label">${p.category}</div>`;
        lastCat = p.category;
      }
      html += `
        <div class="price-editor-row" data-id="${p.id}">
          <img src="${p.image || ''}" class="image-editor-thumb" alt="">
          <span class="price-editor-name">${p.name}</span>
          <div class="mini-input">
            <input type="number" min="0" class="price-editor-input" data-id="${p.id}" value="${p.price}">
            <span>${Storage.getSettings().currency}</span>
          </div>
          <label class="price-editor-image-btn" title="Changer l'image">
            <svg viewBox="0 0 24 24" width="17" height="17"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M4 7h3l2-2h6l2 2h3v13H4z"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>
            <input type="file" accept="image/*" class="price-editor-image-input" data-id="${p.id}" hidden>
          </label>
          <button class="cart-item-remove price-editor-delete" data-id="${p.id}" aria-label="Supprimer ce produit">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>`;
    });
    list.innerHTML = html;
  }

  function bindPriceEditor() {
    renderPriceEditor('');

    document.getElementById('priceSearchInput').addEventListener('input', (e) => {
      renderPriceEditor(e.target.value);
    });

    document.getElementById('priceEditorList').addEventListener('click', (e) => {
      const delBtn = e.target.closest('.price-editor-delete');
      if (!delBtn) return;
      const id = delBtn.dataset.id;
      const product = Products.getAllProducts().find(p => p.id === id);
      if (!product) return;
      if (!confirm(`Supprimer "${product.name}" du menu ?`)) return;
      Products.removeProduct(id);
      renderPriceEditor(document.getElementById('priceSearchInput').value);
      renderCustomProductsList();
      Categories.render();
      Products.renderGrid();
      Toast.show('Produit supprimé du menu.');
    });

    document.getElementById('priceEditorList').addEventListener('change', async (e) => {
      const input = e.target.closest('.price-editor-image-input');
      if (!input || !input.files[0]) return;
      const id = input.dataset.id;
      try {
        const dataUrl = await Products.resizeImageFile(input.files[0]);
        Products.updateImage(id, dataUrl);
        renderPriceEditor(document.getElementById('priceSearchInput').value);
        Products.renderGrid();
        Toast.show('Image mise à jour.');
      } catch (err) {
        Toast.show("Impossible de charger l'image.");
      }
    });

    document.getElementById('savePricesBtn').addEventListener('click', () => {
      const inputs = document.querySelectorAll('.price-editor-input');
      const overrides = Storage.getPriceOverrides();
      inputs.forEach(input => {
        const id = input.dataset.id;
        const newPrice = Math.max(0, Number(input.value) || 0);
        Products.updatePrice(id, newPrice);
        overrides[id] = newPrice;
      });
      Storage.savePriceOverrides(overrides);
      Products.renderGrid();
      Cart.render();

      const confirmMsg = document.getElementById('savePricesConfirmMsg');
      confirmMsg.hidden = false;
      setTimeout(() => { confirmMsg.hidden = true; }, 2500);
      Toast.show('Prix mis à jour avec succès.');
    });

    document.getElementById('resetPricesBtn').addEventListener('click', () => {
      if (!confirm('Réinitialiser tous les prix aux valeurs d\'origine ?')) return;
      Storage.savePriceOverrides({});
      location.reload();
    });
  }

  function populateCategorySelect() {
    const select = document.getElementById('newProductCategory');
    const cats = Products.getCategories();
    select.innerHTML = cats.map(c => `<option value="${c.slug}" data-name="${c.name}">${c.name}</option>`).join('')
      + `<option value="__new__">+ Nouvelle catégorie...</option>`;
  }

  function renderCustomProductsList() {
    const container = document.getElementById('customProductsList');
    const custom = Storage.getCustomProducts();
    if (!custom.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = custom.map(p => `
      <div class="custom-product-row" data-id="${p.id}">
        <span class="cp-cat">${p.category}</span>
        <span class="cp-name">${p.name}</span>
        <span class="cp-price">${Products.formatPrice(p.price)}</span>
        <button class="cp-remove" data-id="${p.id}" aria-label="Supprimer le produit">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.cp-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Products.removeCustomProduct(btn.dataset.id);
        renderCustomProductsList();
        Products.renderGrid();
        renderPriceEditor('');
        Toast.show('Produit supprimé.');
      });
    });
  }

  function bindAddProductForm() {
    populateCategorySelect();
    renderCustomProductsList();

    const categorySelect = document.getElementById('newProductCategory');
    const newCatField = document.getElementById('newCategoryNameField');
    const imageInput = document.getElementById('newProductImage');
    const imagePreview = document.getElementById('newProductImagePreview');
    let pendingImageDataUrl = null;

    categorySelect.addEventListener('change', () => {
      newCatField.hidden = categorySelect.value !== '__new__';
    });

    imageInput.addEventListener('change', async () => {
      if (!imageInput.files[0]) return;
      try {
        pendingImageDataUrl = await Products.resizeImageFile(imageInput.files[0]);
        imagePreview.src = pendingImageDataUrl;
        imagePreview.hidden = false;
      } catch (err) {
        Toast.show("Impossible de charger l'image.");
      }
    });

    document.getElementById('addProductBtn').addEventListener('click', () => {
      const name = document.getElementById('newProductName').value.trim();
      const price = Number(document.getElementById('newProductPrice').value) || 0;
      let categorySlug, categoryName;

      if (categorySelect.value === '__new__') {
        categoryName = document.getElementById('newCategoryName').value.trim();
        if (!categoryName) { Toast.show('Indiquez un nom de catégorie.'); return; }
        categorySlug = Products.slugify(categoryName);
      } else {
        const opt = categorySelect.options[categorySelect.selectedIndex];
        categorySlug = opt.value;
        categoryName = opt.dataset.name;
      }

      if (!name) { Toast.show('Indiquez un nom de produit.'); return; }

      Products.addCustomProduct({ category: categoryName, categorySlug, name, price, image: pendingImageDataUrl });

      document.getElementById('newProductName').value = '';
      document.getElementById('newProductPrice').value = '';
      document.getElementById('newCategoryName').value = '';
      imageInput.value = '';
      imagePreview.hidden = true;
      imagePreview.src = '';
      pendingImageDataUrl = null;
      newCatField.hidden = true;
      categorySelect.value = categorySlug;
      populateCategorySelect();
      categorySelect.value = categorySlug;

      Categories.render();
      Products.renderGrid();
      renderCustomProductsList();
      renderPriceEditor('');

      const confirmMsg = document.getElementById('addProductConfirmMsg');
      confirmMsg.hidden = false;
      setTimeout(() => { confirmMsg.hidden = true; }, 2500);
      Toast.show(`"${name}" ajouté au menu.`);
    });
  }

  function bindResetOrderNumber() {
    document.getElementById('resetOrderNumberBtn').addEventListener('click', () => {
      if (!confirm('Réinitialiser le numéro de commande à 0000 ? La prochaine commande sera LIVRAISON-0001.')) return;
      Storage.resetOrderCounter();
      Toast.show('Numéro de commande réinitialisé.');
    });
  }

  function bindResetStats() {
    document.getElementById('resetStatsBtn').addEventListener('click', () => {
      if (!confirm('Remettre tous les totaux et l\'historique des ventes à zéro ? Cette action est irréversible.')) return;
      Storage.clearOrders();
      Dashboard.renderStats();
      Dashboard.renderOrdersList();
      Toast.show('Statistiques remises à zéro.');
    });
  }

  function renderPackCategoriesList() {
    const container = document.getElementById('packCategoriesList');
    const cats = Products.getCategories().filter(c => c.slug !== 'packs-combos');
    container.innerHTML = cats.map(c => `
      <label class="pack-cat-chip" data-slug="${c.slug}">
        <input type="checkbox" value="${c.name}">
        <span>${c.name}</span>
      </label>
    `).join('');

    container.querySelectorAll('.pack-cat-chip').forEach(chip => {
      const checkbox = chip.querySelector('input');
      checkbox.addEventListener('change', () => {
        chip.classList.toggle('checked', checkbox.checked);
      });
    });
  }

  function bindPackCreator() {
    renderPackCategoriesList();

    document.getElementById('createPackBtn').addEventListener('click', () => {
      const name = document.getElementById('packName').value.trim();
      const price = Number(document.getElementById('packPrice').value) || 0;
      const checked = Array.from(document.querySelectorAll('#packCategoriesList input:checked')).map(cb => cb.value);

      if (!name) { Toast.show('Indiquez un nom de pack.'); return; }
      if (!checked.length) { Toast.show('Sélectionnez au moins une catégorie.'); return; }

      Products.addPack({ name, price, componentCategories: checked });

      document.getElementById('packName').value = '';
      document.getElementById('packPrice').value = '';
      renderPackCategoriesList();

      Categories.render();
      Products.renderGrid();
      renderCustomProductsList();
      renderPriceEditor('');

      const confirmMsg = document.getElementById('createPackConfirmMsg');
      confirmMsg.hidden = false;
      setTimeout(() => { confirmMsg.hidden = true; }, 2500);
      Toast.show(`Pack "${name}" créé.`);
    });
  }

  function bindExportImages() {
    document.getElementById('exportImagesBtn').addEventListener('click', () => {
      const overrides = Storage.getImageOverrides();
      const customProducts = Storage.getCustomProducts();
      const baseData = (window.PRODUCTS_DATA && window.PRODUCTS_DATA.products) || [];
      const files = [];

      // Base catalog products whose image was replaced: keep the original filename so it drops straight in.
      Object.entries(overrides).forEach(([id, dataUrl]) => {
        if (id.startsWith('custom-')) return;
        const original = baseData.find(p => p.id === id);
        if (!original) return;
        const filename = original.image.split('/').pop();
        files.push({ filename, dataUrl });
      });

      // Custom products (packs included) always export under a stable, unique filename.
      customProducts.forEach(p => {
        const filename = `${p.categorySlug}__${Products.slugify(p.name)}.jpg`;
        files.push({ filename, dataUrl: p.image });
      });

      const msg = document.getElementById('exportImagesMsg');
      if (!files.length) {
        msg.textContent = "Aucune image modifiée pour l'instant.";
        msg.hidden = false;
        setTimeout(() => { msg.hidden = true; }, 2500);
        return;
      }

      files.forEach((f, i) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = f.dataUrl;
          a.download = f.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, i * 350);
      });

      msg.textContent = `${files.length} image(s) en cours de téléchargement — placez-les dans assets/images/.`;
      msg.hidden = false;
      setTimeout(() => { msg.hidden = true; }, 4000);
    });
  }

  function bindPrintClosing() {
    document.getElementById('printClosingBtn').addEventListener('click', () => {
      Dashboard.printClosing();
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  }

  return { init, enterApp, applyBrand };
})();

document.addEventListener('DOMContentLoaded', App.init);
