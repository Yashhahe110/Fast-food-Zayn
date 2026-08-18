/* =========================================================
   receipt.js — Receipt rendering, print & PDF export
   ========================================================= */
const Receipt = (() => {
  let lastOrder = null;

  function generateOrderNumber(orderType) {
    const prefix = orderType === 'livraison' ? 'LIVRAISON' : orderType === 'recuperation' ? 'RECUP' : 'TAB';
    const n = Storage.incrementOrderCounter(orderType);
    return `${prefix}-${String(n).padStart(4, '0')}`;
  }

  function buildOrder() {
    const payload = Cart.getOrderPayload();
    if (!payload.lines.length) return null;
    const settings = Storage.getSettings();
    const now = new Date();
    return {
      orderNumber: generateOrderNumber(payload.orderType),
      date: now.toISOString(),
      restaurantName: settings.restaurantName,
      currency: settings.currency,
      thankYouMessage: settings.thankYouMessage,
      shopLocation: settings.location || '',
      shopPhone: settings.phone || '',
      shopFacebook: settings.facebook || '',
      shopWhatsapp: settings.whatsapp || '',
      shopLogo: settings.logo || '',
      ...payload,
    };
  }

  function renderReceiptHTML(order) {
    const d = new Date(order.date);
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const fmt = (n) => `${Number(n).toLocaleString('fr-FR')} ${order.currency}`;

    const lines = order.lines.map(l => `
      <div class="r-row">
        <span>${l.qty} × ${l.name}</span>
        <span>${fmt(l.subtotal)}</span>
      </div>
    `).join('');

    const orderTypeLabels = { livraison: 'Livraison', recuperation: 'Récupération', reservation: 'Réservation Table' };
    const typeBanner = `<div class="r-type-banner">${orderTypeLabels[order.orderType] || order.orderType}</div>`;

    let orderTypeBlock;
    if (order.orderType === 'livraison') {
      orderTypeBlock = `
        ${order.deliveryAddress ? `<div class="r-row"><span>Adresse</span><span>${order.deliveryAddress}</span></div>` : ''}
        ${order.deliveryLandmark ? `<div class="r-row"><span>Repère</span><span>${order.deliveryLandmark}</span></div>` : ''}
        ${order.deliveryPhone ? `<div class="r-row"><span>Téléphone</span><span>${order.deliveryPhone}</span></div>` : ''}
        ${order.deliveryDateLabel ? `<div class="r-row"><span>Date</span><span>${order.deliveryDateLabel}</span></div>` : ''}
        ${order.orderTime ? `<div class="r-row"><span>Heure de commande</span><span>${order.orderTime}</span></div>` : ''}
        ${order.arrivalTime ? `<div class="r-row"><span>Heure d'arrivée</span><span>${order.arrivalTime}</span></div>` : ''}
      `;
    } else if (order.orderType === 'recuperation') {
      orderTypeBlock = '';
    } else {
      orderTypeBlock = `<div class="r-row"><span>Table</span><span>${order.tableNumber || '—'}</span></div>`;
    }

    const contactLines = [
      order.shopLocation ? order.shopLocation : '',
      order.shopPhone ? `Tél: ${order.shopPhone}` : '',
    ].filter(Boolean);

    const socialLines = [
      order.shopFacebook ? `Facebook: ${order.shopFacebook}` : '',
      order.shopWhatsapp ? `WhatsApp: ${order.shopWhatsapp}` : '',
    ].filter(Boolean);

    return `
      <div class="r-center">
        ${order.shopLogo ? `<img src="${order.shopLogo}" alt="" class="r-logo">` : ''}
        <div class="r-title">${order.restaurantName}</div>
        ${contactLines.map(l => `<div class="r-muted">${l}</div>`).join('')}
        <div class="r-muted">${dateStr} — ${timeStr}</div>
        <div class="r-muted">Commande N° ${order.orderNumber}</div>
      </div>
      <div class="r-divider"></div>
      ${order.customerName ? `<div class="r-row"><span>Client</span><span>${order.customerName}</span></div>` : ''}
      ${typeBanner}
      ${orderTypeBlock}
      <div class="r-divider"></div>
      ${lines}
      <div class="r-divider"></div>
      <div class="r-row"><span>Sous-total</span><span>${fmt(order.totals.subtotal)}</span></div>
      ${order.orderType === 'livraison' ? `<div class="r-row"><span>Frais de livraison</span><span>${fmt(order.totals.deliveryFee)}</span></div>` : ''}
      <div class="r-row"><span>Remise</span><span>-${fmt(order.totals.discountAmount)}</span></div>
      <div class="r-divider"></div>
      <div class="r-row r-total"><span>TOTAL</span><span>${fmt(order.totals.grandTotal)}</span></div>
      <div class="r-row"><span>Paiement</span><span>${order.paymentMethod}</span></div>
      <div class="r-divider"></div>
      <div class="r-center r-muted">${order.thankYouMessage}</div>
      ${socialLines.length ? `<div class="r-center r-muted">${socialLines.join(' · ')}</div>` : ''}
    `;
  }

  function open(order) {
    lastOrder = order;
    document.getElementById('receiptContent').innerHTML = renderReceiptHTML(order);
    document.getElementById('receiptModalOverlay').hidden = false;
  }

  function close() {
    document.getElementById('receiptModalOverlay').hidden = true;
  }

  function print() {
    const content = document.getElementById('receiptContent').innerHTML;
    const win = window.open('', '_blank', 'width=380,height=600');
    win.document.write(`
      <html><head><title>Ticket</title>
      <style>
        body{ font-family:'Courier New',monospace; font-size:12.5px; padding:20px; }
        .r-center{ text-align:center; }
        .r-title{ font-size:16px; font-weight:800; }
        .r-divider{ border-top:1px dashed #999; margin:10px 0; }
        .r-row{ display:flex; justify-content:space-between; padding:2px 0; }
        .r-total{ font-weight:800; font-size:14px; }
        .r-muted{ color:#666; font-size:11px; }
        .r-logo{ width:48px; height:48px; object-fit:cover; border-radius:8px; margin-bottom:6px; }
        .r-type-banner{
          text-align:center; font-weight:800; font-size:16px; letter-spacing:.04em; text-transform:uppercase;
          padding:8px 6px; margin:8px 0; border:2px solid #000; border-radius:8px;
        }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  async function downloadPdf() {
    const { jsPDF } = window.jspdf || {};
    const target = document.getElementById('receiptContent');
    if (!jsPDF || !window.html2canvas) {
      Toast.show('Export PDF indisponible hors connexion.');
      return;
    }
    const canvas = await window.html2canvas(target, { backgroundColor: '#ffffff', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: [canvas.width / 2 + 40, canvas.height / 2 + 40] });
    pdf.addImage(imgData, 'PNG', 20, 20, canvas.width / 2, canvas.height / 2);
    pdf.save(`${lastOrder ? lastOrder.orderNumber : 'ticket'}.pdf`);
  }

  return { buildOrder, open, close, print, downloadPdf };
})();

const Toast = (() => {
  let timer = null;
  function show(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  return { show };
})();
