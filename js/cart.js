/* =========================================================
   cart.js — Cart state & live calculations
   ========================================================= */
const Cart = (() => {
  // Map productId -> { qty, option: 'surplace' | 'emporter' }
  let items = {};
  let deliveryFee = 0;
  let discountType = 'fixed'; // 'fixed' | 'percent'
  let discountValue = 0;
  let paymentMethod = 'Espèces';
  let customerName = '';
  let orderType = 'livraison'; // 'livraison' | 'recuperation' | 'reservation'
  let tableNumber = '';
  let deliveryAddress = '';
  let deliveryLandmark = '';
  let deliveryPhone = '';
  let orderTime = '';
  let arrivalTime = '';
  let deliveryDay = 'today'; // 'today' | 'demain'

  const FR_MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

  function tomorrowDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  function formatShortDate(d) {
    return `${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
  }

  function updateDeliveryDayLabel() {
    const btn = document.getElementById('deliveryDayTomorrowBtn');
    if (btn) btn.textContent = `Demain (${formatShortDate(tomorrowDate())})`;
  }

  function deliveryDateLabel() {
    return deliveryDay === 'demain' ? `Demain (${formatShortDate(tomorrowDate())})` : "Aujourd'hui";
  }

  function getQty(id) {
    return items[id] ? items[id].qty : 0;
  }

  function addQty(id, delta) {
    const product = Products.getProductById(id);
    if (!product) return;
    if (!items[id]) items[id] = { qty: 0, option: product.priceTakeaway ? 'surplace' : null };
    items[id].qty = Math.max(0, items[id].qty + delta);
    if (items[id].qty === 0) delete items[id];
    render();
  }

  function setQty(id, qty) {
    const product = Products.getProductById(id);
    if (!product) return;
    const q = Math.max(0, qty);
    if (q === 0) { delete items[id]; }
    else {
      if (!items[id]) items[id] = { qty: 0, option: product.priceTakeaway ? 'surplace' : null };
      items[id].qty = q;
    }
    render();
  }

  function removeItem(id) {
    delete items[id];
    render();
  }

  function setOption(id, option) {
    if (items[id]) { items[id].option = option; render(); }
  }

  function setOrderType(type) {
    orderType = type;
    document.querySelectorAll('#orderTypeToggle .type-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.type === type);
    });
    applyOrderTypeUI();
  }

  function setDeliveryDay(day) {
    deliveryDay = day;
    document.querySelectorAll('#deliveryDayToggle .type-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.day === day);
    });
  }

  function applyOrderTypeUI() {
    const deliveryFields = document.getElementById('deliveryFields');
    const deliveryFeeRow = document.getElementById('deliveryFeeRow');
    const tableField = document.getElementById('tableField');
    deliveryFields.hidden = orderType !== 'livraison';
    deliveryFeeRow.hidden = orderType !== 'livraison';
    tableField.hidden = orderType !== 'reservation';
  }

  function clear() {
    items = {};
    deliveryFee = 0;
    discountType = 'fixed';
    discountValue = 0;
    paymentMethod = 'Espèces';
    customerName = '';
    orderType = 'livraison';
    tableNumber = '';
    deliveryAddress = '';
    deliveryLandmark = '';
    deliveryPhone = '';
    orderTime = '';
    arrivalTime = '';
    deliveryDay = 'today';
    document.querySelectorAll('#deliveryDayToggle .type-chip').forEach(c => c.classList.toggle('active', c.dataset.day === 'today'));
    document.getElementById('deliveryFeeInput').value = 0;
    document.getElementById('discountValue').value = 0;
    document.getElementById('discountType').value = 'fixed';
    document.getElementById('customerName').value = '';
    document.getElementById('deliveryAddress').value = '';
    document.getElementById('deliveryLandmark').value = '';
    document.getElementById('deliveryPhone').value = '';
    document.getElementById('orderTime').value = '';
    document.getElementById('arrivalTime').value = '';
    document.getElementById('tableNumberSelect').value = '';
    document.querySelectorAll('.payment-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    applyOrderTypeUI();
    render();
  }

  function unitPrice(product, option) {
    if (option === 'emporter' && product.priceTakeaway) return product.priceTakeaway;
    return product.price;
  }

  function getLineItems() {
    return Object.entries(items).map(([id, data]) => {
      const product = Products.getProductById(id);
      const price = unitPrice(product, data.option);
      return {
        id, name: product.name, qty: data.qty, option: data.option,
        unitPrice: price, subtotal: price * data.qty,
      };
    });
  }

  function getTotals() {
    const lines = getLineItems();
    const productCount = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    let discountAmount = 0;
    if (discountType === 'percent') discountAmount = subtotal * (discountValue / 100);
    else discountAmount = discountValue;
    discountAmount = Math.min(discountAmount, subtotal);
    const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);
    return { productCount, subtotal, discountAmount, deliveryFee, grandTotal };
  }

  function render() {
    renderCartItems();
    renderSummary();
    renderCartBadge();
    Products.renderGrid();
  }

  function renderCartItems() {
    const container = document.getElementById('cartItems');
    const lines = getLineItems();
    if (!lines.length) {
      container.innerHTML = '<p class="cart-empty" id="cartEmptyMsg">Votre panier est vide</p>';
      return;
    }
    container.innerHTML = lines.map(l => `
      <div class="cart-item" data-id="${l.id}">
        <div class="cart-item-info">
          <div class="cart-item-name">${l.name}</div>
          <div class="cart-item-meta">${Products.formatPrice(l.unitPrice)} × ${l.qty}</div>
        </div>
        <div class="cart-item-actions">
          <button class="qty-btn cart-minus" data-id="${l.id}">−</button>
          <span class="qty-value">${l.qty}</span>
          <button class="qty-btn cart-plus" data-id="${l.id}">+</button>
        </div>
        <div class="cart-item-subtotal">${Products.formatPrice(l.subtotal)}</div>
        <button class="cart-item-remove" data-id="${l.id}" aria-label="Supprimer">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
    `).join('');
  }

  function renderSummary() {
    const t = getTotals();
    document.getElementById('sumProductCount').textContent = t.productCount;
    document.getElementById('sumSubtotal').textContent = Products.formatPrice(t.subtotal);
    document.getElementById('sumGrandTotal').textContent = Products.formatPrice(t.grandTotal);
    const validateBtn = document.getElementById('validateOrderBtn');
    validateBtn.disabled = t.productCount === 0;
  }

  function renderCartBadge() {
    const t = getTotals();
    const badge = document.getElementById('cartBadgeMobile');
    if (t.productCount > 0) {
      badge.hidden = false;
      badge.textContent = t.productCount;
    } else {
      badge.hidden = true;
    }
  }

  function bindEvents() {
    document.getElementById('cartItems').addEventListener('click', (e) => {
      const plus = e.target.closest('.cart-plus');
      const minus = e.target.closest('.cart-minus');
      const remove = e.target.closest('.cart-item-remove');
      if (plus) addQty(plus.dataset.id, 1);
      else if (minus) addQty(minus.dataset.id, -1);
      else if (remove) removeItem(remove.dataset.id);
    });

    document.getElementById('clearCartBtn').addEventListener('click', clear);

    document.getElementById('deliveryFeeInput').addEventListener('input', (e) => {
      deliveryFee = Math.max(0, Number(e.target.value) || 0);
      renderSummary();
    });

    document.getElementById('discountType').addEventListener('change', (e) => {
      discountType = e.target.value;
      renderSummary();
    });

    document.getElementById('discountValue').addEventListener('input', (e) => {
      discountValue = Math.max(0, Number(e.target.value) || 0);
      renderSummary();
    });

    document.getElementById('paymentGrid').addEventListener('click', (e) => {
      const chip = e.target.closest('.payment-chip');
      if (!chip) return;
      document.querySelectorAll('.payment-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      paymentMethod = chip.dataset.method;
    });

    document.getElementById('customerName').addEventListener('input', (e) => {
      customerName = e.target.value;
    });

    document.getElementById('deliveryAddress').addEventListener('input', (e) => { deliveryAddress = e.target.value; });
    document.getElementById('deliveryLandmark').addEventListener('input', (e) => { deliveryLandmark = e.target.value; });
    document.getElementById('deliveryPhone').addEventListener('input', (e) => { deliveryPhone = e.target.value; });
    document.getElementById('orderTime').addEventListener('input', (e) => { orderTime = e.target.value; });
    document.getElementById('arrivalTime').addEventListener('input', (e) => { arrivalTime = e.target.value; });

    document.getElementById('orderTypeToggle').addEventListener('click', (e) => {
      const chip = e.target.closest('.type-chip');
      if (!chip) return;
      setOrderType(chip.dataset.type);
    });

    document.getElementById('tableNumberSelect').addEventListener('change', (e) => {
      tableNumber = e.target.value;
    });

    document.getElementById('deliveryDayToggle').addEventListener('click', (e) => {
      const chip = e.target.closest('.type-chip');
      if (!chip) return;
      setDeliveryDay(chip.dataset.day);
    });

    updateDeliveryDayLabel();
    applyOrderTypeUI();
  }

  function setDefaultDelivery(fee) {
    deliveryFee = fee || 0;
    document.getElementById('deliveryFeeInput').value = deliveryFee;
  }

  function getOrderPayload() {
    return {
      lines: getLineItems(),
      totals: getTotals(),
      paymentMethod,
      customerName,
      orderType,
      tableNumber,
      deliveryAddress,
      deliveryLandmark,
      deliveryPhone,
      orderTime,
      arrivalTime,
      deliveryDay,
      deliveryDateLabel: deliveryDateLabel(),
    };
  }

  return {
    getQty, addQty, setQty, removeItem, setOption, clear, setOrderType, setDeliveryDay,
    getLineItems, getTotals, render, bindEvents, setDefaultDelivery, getOrderPayload,
  };
})();
