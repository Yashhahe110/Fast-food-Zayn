/* =========================================================
   order-editor.js — Edit an already-validated order
   (add or remove items when a customer changes their mind)
   ========================================================= */
const OrderEditor = (() => {
  let workingOrder = null;
  let workingLines = [];

  function open(order) {
    workingOrder = order;
    workingLines = order.lines.map(l => ({ ...l }));
    document.getElementById('editOrderTitle').textContent = `Modifier la commande ${order.orderNumber}`;
    document.getElementById('editOrderSearch').value = '';
    document.getElementById('editOrderResults').hidden = true;
    render();
    document.getElementById('editOrderModalOverlay').hidden = false;
  }

  function close() {
    document.getElementById('editOrderModalOverlay').hidden = true;
    workingOrder = null;
    workingLines = [];
  }

  function computeTotals() {
    const subtotal = workingLines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const discountAmount = Math.min(workingOrder.totals.discountAmount || 0, subtotal);
    const deliveryFee = workingOrder.totals.deliveryFee || 0;
    const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);
    const productCount = workingLines.reduce((s, l) => s + l.qty, 0);
    return { subtotal, discountAmount, deliveryFee, grandTotal, productCount };
  }

  function render() {
    renderItems();
    renderSummary();
  }

  function renderItems() {
    const container = document.getElementById('editOrderItems');
    if (!workingLines.length) {
      container.innerHTML = '<p class="edit-order-empty">Aucun produit — ajoutez-en un ci-dessus ou supprimez la commande depuis l\'historique.</p>';
      return;
    }
    const settings = Storage.getSettings();
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;
    container.innerHTML = workingLines.map((l, i) => `
      <div class="cart-item" data-index="${i}">
        <div class="cart-item-info">
          <div class="cart-item-name">${l.name}</div>
          <div class="cart-item-meta">${fmt(l.unitPrice)} × ${l.qty}</div>
        </div>
        <div class="cart-item-actions">
          <button class="qty-btn eo-minus" data-index="${i}">−</button>
          <span class="qty-value">${l.qty}</span>
          <button class="qty-btn eo-plus" data-index="${i}">+</button>
        </div>
        <div class="cart-item-subtotal">${fmt(l.unitPrice * l.qty)}</div>
        <button class="cart-item-remove eo-remove" data-index="${i}" aria-label="Supprimer">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
    `).join('');
  }

  function renderSummary() {
    const t = computeTotals();
    const settings = Storage.getSettings();
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;
    document.getElementById('editOrderSubtotal').textContent = fmt(t.subtotal);
    document.getElementById('editOrderGrandTotal').textContent = fmt(t.grandTotal);
  }

  function changeQty(index, delta) {
    if (!workingLines[index]) return;
    workingLines[index].qty = Math.max(0, workingLines[index].qty + delta);
    if (workingLines[index].qty === 0) workingLines.splice(index, 1);
    render();
  }

  function removeLine(index) {
    workingLines.splice(index, 1);
    render();
  }

  function addProduct(productId) {
    const product = Products.getProductById(productId);
    if (!product) return;
    const existing = workingLines.find(l => l.id === productId && !l.option);
    if (existing) {
      existing.qty += 1;
    } else {
      workingLines.push({
        id: product.id, name: product.name, qty: 1, option: null,
        unitPrice: product.price, subtotal: product.price,
      });
    }
    document.getElementById('editOrderSearch').value = '';
    document.getElementById('editOrderResults').hidden = true;
    render();
  }

  function renderSearchResults(term) {
    const resultsBox = document.getElementById('editOrderResults');
    if (!term) { resultsBox.hidden = true; return; }
    const all = Products.getAllProducts();
    const matches = all.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).slice(0, 8);
    const settings = Storage.getSettings();
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;

    if (!matches.length) {
      resultsBox.innerHTML = '<div class="edit-order-empty-results">Aucun produit trouvé.</div>';
      resultsBox.hidden = false;
      return;
    }
    resultsBox.innerHTML = matches.map(p => `
      <div class="edit-order-result-row" data-id="${p.id}">
        <span>${p.name}</span>
        <span class="edit-order-result-price">${fmt(p.price)}</span>
      </div>
    `).join('');
    resultsBox.hidden = false;
  }

  function save() {
    if (!workingLines.length) {
      Toast.show('La commande doit contenir au moins un produit.');
      return;
    }
    workingOrder.lines = workingLines;
    workingOrder.totals = computeTotals();

    const orders = Storage.getOrders();
    const idx = orders.findIndex(o => o.orderNumber === workingOrder.orderNumber);
    if (idx !== -1) {
      orders[idx] = workingOrder;
      Storage.saveAllOrders(orders);
    }

    close();
    const searchInput = document.getElementById('ordersSearchInput');
    Dashboard.renderOrdersList(searchInput ? searchInput.value : '');
    Dashboard.renderStats();
    Toast.show('Commande modifiée avec succès.');
  }

  function bindEvents() {
    document.getElementById('closeEditOrderBtn').addEventListener('click', close);
    document.getElementById('cancelEditOrderBtn').addEventListener('click', close);
    document.getElementById('editOrderModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'editOrderModalOverlay') close();
    });
    document.getElementById('saveEditOrderBtn').addEventListener('click', save);

    document.getElementById('editOrderItems').addEventListener('click', (e) => {
      const plus = e.target.closest('.eo-plus');
      const minus = e.target.closest('.eo-minus');
      const remove = e.target.closest('.eo-remove');
      if (plus) changeQty(Number(plus.dataset.index), 1);
      else if (minus) changeQty(Number(minus.dataset.index), -1);
      else if (remove) removeLine(Number(remove.dataset.index));
    });

    const searchInput = document.getElementById('editOrderSearch');
    searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value.trim()));
    searchInput.addEventListener('focus', (e) => { if (e.target.value.trim()) renderSearchResults(e.target.value.trim()); });

    document.getElementById('editOrderResults').addEventListener('click', (e) => {
      const row = e.target.closest('.edit-order-result-row');
      if (row) addProduct(row.dataset.id);
    });

    document.addEventListener('click', (e) => {
      const resultsBox = document.getElementById('editOrderResults');
      if (!resultsBox.hidden && !e.target.closest('.edit-order-add')) {
        resultsBox.hidden = true;
      }
    });
  }

  return { open, close, bindEvents };
})();
