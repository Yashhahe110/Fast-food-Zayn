/* =========================================================
   storage.js — LocalStorage persistence layer
   ========================================================= */
const Storage = (() => {
  const KEYS = {
    SESSION: 'zayan_pos_session',
    SETTINGS: 'zayan_pos_settings',
    ORDERS: 'zayan_pos_orders',
    PRICE_OVERRIDES: 'zayan_pos_price_overrides',
    CUSTOM_PRODUCTS: 'zayan_pos_custom_products',
    ORDER_COUNTER: 'zayan_pos_order_counter',
    ORDER_COUNTER_TABLE: 'zayan_pos_order_counter_table',
    ORDER_COUNTER_LIVRAISON: 'zayan_pos_order_counter_livraison',
    ORDER_COUNTER_RECUPERATION: 'zayan_pos_order_counter_recuperation',
    CREDENTIALS: 'zayan_pos_credentials',
    DELETED_PRODUCTS: 'zayan_pos_deleted_products',
    IMAGE_OVERRIDES: 'zayan_pos_image_overrides',
  };

  const DEFAULT_SETTINGS = {
    restaurantName: 'Fast Food Zayn',
    currency: 'Ar',
    defaultDelivery: 0,
    thankYouMessage: 'Merci de votre visite ! À bientôt.',
    theme: 'light',
    location: '',
    phone: '',
    facebook: '',
    whatsapp: '',
    logo: 'assets/icons/logo.jpg',
  };

  function getSettings() {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  function getCredentials() {
    try {
      const raw = localStorage.getItem(KEYS.CREDENTIALS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveCredentials(creds) {
    localStorage.setItem(KEYS.CREDENTIALS, JSON.stringify(creds));
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(KEYS.SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
  }

  function getPriceOverrides() {
    try {
      const raw = localStorage.getItem(KEYS.PRICE_OVERRIDES);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function savePriceOverrides(overrides) {
    localStorage.setItem(KEYS.PRICE_OVERRIDES, JSON.stringify(overrides));
  }

  function getCustomProducts() {
    try {
      const raw = localStorage.getItem(KEYS.CUSTOM_PRODUCTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomProducts(list) {
    localStorage.setItem(KEYS.CUSTOM_PRODUCTS, JSON.stringify(list));
  }

  function counterKey(orderType) {
    if (orderType === 'livraison') return KEYS.ORDER_COUNTER_LIVRAISON;
    if (orderType === 'recuperation') return KEYS.ORDER_COUNTER_RECUPERATION;
    return KEYS.ORDER_COUNTER_TABLE;
  }

  function getOrderCounter(orderType) {
    const raw = localStorage.getItem(counterKey(orderType));
    return raw ? parseInt(raw, 10) : 0;
  }

  function incrementOrderCounter(orderType) {
    const next = getOrderCounter(orderType) + 1;
    localStorage.setItem(counterKey(orderType), String(next));
    return next;
  }

  function resetOrderCounter() {
    localStorage.setItem(KEYS.ORDER_COUNTER_TABLE, '0');
    localStorage.setItem(KEYS.ORDER_COUNTER_LIVRAISON, '0');
  }

  function getDeletedProductIds() {
    try {
      const raw = localStorage.getItem(KEYS.DELETED_PRODUCTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveDeletedProductIds(ids) {
    localStorage.setItem(KEYS.DELETED_PRODUCTS, JSON.stringify(ids));
  }

  function getImageOverrides() {
    try {
      const raw = localStorage.getItem(KEYS.IMAGE_OVERRIDES);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveImageOverrides(overrides) {
    localStorage.setItem(KEYS.IMAGE_OVERRIDES, JSON.stringify(overrides));
  }

  function getOrders() {
    try {
      const raw = localStorage.getItem(KEYS.ORDERS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveOrder(order) {
    const orders = getOrders();
    orders.unshift(order);
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }

  function saveAllOrders(orders) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }

  function clearOrders() {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
  }

  return {
    getSettings, saveSettings,
    getSession, saveSession, clearSession,
    getOrders, saveOrder, saveAllOrders, clearOrders,
    getPriceOverrides, savePriceOverrides,
    getCustomProducts, saveCustomProducts,
    getOrderCounter, incrementOrderCounter, resetOrderCounter,
    getCredentials, saveCredentials,
    getDeletedProductIds, saveDeletedProductIds,
    getImageOverrides, saveImageOverrides,
  };
})();
