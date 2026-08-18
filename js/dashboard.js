/* =========================================================
   dashboard.js — Stats, orders history, canvas chart
   ========================================================= */
const Dashboard = (() => {
  function isToday(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  function renderStats() {
    const orders = Storage.getOrders();
    const settings = Storage.getSettings();
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;

    const todayOrders = orders.filter(o => isToday(o.date));
    const todaySales = todayOrders.reduce((s, o) => s + o.totals.grandTotal, 0);
    const totalRevenue = orders.reduce((s, o) => s + o.totals.grandTotal, 0);
    const avgOrder = orders.length ? totalRevenue / orders.length : 0;

    const productCounts = {};
    orders.forEach(o => o.lines.forEach(l => {
      productCounts[l.name] = (productCounts[l.name] || 0) + l.qty;
    }));
    let topProduct = '—';
    let topQty = 0;
    Object.entries(productCounts).forEach(([name, qty]) => {
      if (qty > topQty) { topQty = qty; topProduct = name; }
    });

    document.getElementById('statTodaySales').textContent = fmt(todaySales);
    document.getElementById('statTodayOrders').textContent = todayOrders.length;
    document.getElementById('statTotalRevenue').textContent = fmt(totalRevenue);
    document.getElementById('statAvgOrder').textContent = fmt(Math.round(avgOrder));
    document.getElementById('statTopProduct').textContent = topProduct === '—' ? '—' : `${topProduct} (${topQty})`;

    renderChart(orders);
    renderClosing(todayOrders, settings);
  }

  function renderClosing(todayOrders, settings) {
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;
    const grandTotal = todayOrders.reduce((s, o) => s + o.totals.grandTotal, 0);
    document.getElementById('closingGrandTotal').textContent = fmt(grandTotal);

    const byMethod = {};
    todayOrders.forEach(o => {
      const method = o.paymentMethod;
      byMethod[method] = (byMethod[method] || 0) + o.totals.grandTotal;
    });

    const container = document.getElementById('closingBreakdown');
    const entries = Object.entries(byMethod);
    if (!entries.length) {
      container.innerHTML = '<p class="closing-empty">Aucune vente encaissée aujourd\'hui.</p>';
      return;
    }
    container.innerHTML = entries.map(([method, amount]) => `
      <div class="closing-row">
        <span class="closing-row-method">${method}</span>
        <span class="closing-row-amount">${fmt(amount)}</span>
      </div>
    `).join('');
  }

  function renderChart(orders) {
    const canvas = document.getElementById('salesChart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth - 40;
    const height = 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const days = [];
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toDateString());
      labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
    }
    const totals = days.map(day => orders
      .filter(o => new Date(o.date).toDateString() === day)
      .reduce((s, o) => s + o.totals.grandTotal, 0));

    const max = Math.max(...totals, 1);
    const barWidth = width / days.length * 0.5;
    const gap = width / days.length;
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || '#F97316';
    const textMuted = styles.getPropertyValue('--text-muted').trim() || '#64748B';

    totals.forEach((val, i) => {
      const barHeight = (val / max) * (height - 40);
      const x = i * gap + (gap - barWidth) / 2;
      const y = height - barHeight - 24;
      const grad = ctx.createLinearGradient(0, y, 0, height - 24);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, '#FB923C');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barWidth, barHeight, 6);
      ctx.fill();

      ctx.fillStyle = textMuted;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, height - 6);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0) h = 0.001;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderOrdersList(searchTerm) {
    const list = document.getElementById('ordersList');
    let orders = Storage.getOrders();
    const settings = Storage.getSettings();
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;

    if (!orders.length) {
      list.innerHTML = '<p class="orders-empty">Aucune commande pour le moment.</p>';
      return;
    }

    const term = (searchTerm || '').trim().toLowerCase();
    if (term) {
      orders = orders.filter(o => {
        const haystack = [
          o.orderNumber, o.customerName, o.tableNumber, o.paymentMethod,
          o.orderType === 'livraison' ? 'livraison' : o.orderType === 'recuperation' ? 'récupération' : 'réservation table',
          ...(o.lines || []).map(l => l.name),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(term);
      });
      if (!orders.length) {
        list.innerHTML = '<p class="orders-empty">Aucune commande ne correspond à votre recherche.</p>';
        return;
      }
    }

    list.innerHTML = orders.map(o => {
      const d = new Date(o.date);
      const typeLabel = o.orderType === 'livraison' ? 'Livraison'
        : o.orderType === 'recuperation' ? 'Récupération'
        : `Réservation${o.tableNumber ? ' — ' + o.tableNumber : ''}`;
      return `
        <div class="order-card" data-order-num="${o.orderNumber}">
          <div class="order-card-left">
            <span class="order-num">${o.orderNumber}${o.customerName ? ' — ' + o.customerName : ''}</span>
            <span class="order-meta">${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${typeLabel} · ${o.paymentMethod} · ${o.lines.reduce((s, l) => s + l.qty, 0)} article(s)</span>
          </div>
          <div class="order-card-right">
            <span class="order-total">${fmt(o.totals.grandTotal)}</span>
            <button class="order-edit-btn" data-order-num="${o.orderNumber}" aria-label="Modifier la commande" title="Modifier la commande">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.order-card').forEach(card => {
      card.addEventListener('click', () => {
        const order = orders.find(o => o.orderNumber === card.dataset.orderNum);
        if (order) Receipt.open(order);
      });
    });

    list.querySelectorAll('.order-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const freshOrders = Storage.getOrders();
        const order = freshOrders.find(o => o.orderNumber === btn.dataset.orderNum);
        if (order) OrderEditor.open(order);
      });
    });
  }

  function printClosing() {
    const settings = Storage.getSettings();
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${settings.currency}`;
    const orders = Storage.getOrders();
    const todayOrders = orders.filter(o => isToday(o.date));
    const grandTotal = todayOrders.reduce((s, o) => s + o.totals.grandTotal, 0);

    const byMethod = {};
    todayOrders.forEach(o => {
      const method = o.paymentMethod;
      byMethod[method] = (byMethod[method] || 0) + o.totals.grandTotal;
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const rowsHTML = Object.entries(byMethod).map(([method, amount]) => `
      <div class="r-row"><span>${method}</span><span>${fmt(amount)}</span></div>
    `).join('') || '<div class="r-row"><span>Aucune vente aujourd\'hui</span><span></span></div>';

    const content = `
      <div class="r-center">
        ${settings.logo ? `<img src="${settings.logo}" class="r-logo">` : ''}
        <div class="r-title">${settings.restaurantName}</div>
        <div class="r-muted">Clôture de caisse</div>
        <div class="r-muted">${dateStr} — ${timeStr}</div>
      </div>
      <div class="r-divider"></div>
      <div class="r-row"><span>Nombre de commandes</span><span>${todayOrders.length}</span></div>
      <div class="r-divider"></div>
      ${rowsHTML}
      <div class="r-divider"></div>
      <div class="r-row r-total"><span>TOTAL ENCAISSÉ</span><span>${fmt(grandTotal)}</span></div>
      <div class="r-divider"></div>
      <div class="r-center r-muted">Vérifié le ${dateStr} à ${timeStr}</div>
      <div class="r-center r-muted">Signature: _______________________</div>
    `;

    const win = window.open('', '_blank', 'width=380,height=600');
    win.document.write(`
      <html><head><title>Clôture de caisse</title>
      <style>
        body{ font-family:'Courier New',monospace; font-size:12.5px; padding:20px; }
        .r-center{ text-align:center; }
        .r-title{ font-size:16px; font-weight:800; }
        .r-logo{ width:48px; height:48px; object-fit:cover; border-radius:8px; margin-bottom:6px; }
        .r-divider{ border-top:1px dashed #999; margin:10px 0; }
        .r-row{ display:flex; justify-content:space-between; padding:3px 0; }
        .r-total{ font-weight:800; font-size:14px; }
        .r-muted{ color:#666; font-size:11px; margin-top:2px; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return { renderStats, renderOrdersList, printClosing };
})();
