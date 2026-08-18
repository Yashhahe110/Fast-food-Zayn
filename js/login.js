/* =========================================================
   login.js — Authentication flow & credentials management
   ========================================================= */
const Login = (() => {
  const DEFAULT_CREDENTIALS = { username: 'FFZ', password: 'antsaralalana' };

  function getActiveCredentials() {
    return Storage.getCredentials() || DEFAULT_CREDENTIALS;
  }

  function init() {
    const form = document.getElementById('loginForm');
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    const rememberCheckbox = document.getElementById('rememberMe');

    const session = Storage.getSession();
    if (session && session.remembered) {
      usernameInput.value = session.username;
      rememberCheckbox.checked = true;
    }

    toggleBtn.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSubmit(usernameInput.value.trim(), passwordInput.value, rememberCheckbox.checked);
    });

    initCredentialsModal();
  }

  function handleSubmit(username, password, remember) {
    const btn = document.getElementById('loginBtn');
    const label = btn.querySelector('.btn-label');
    const spinner = btn.querySelector('.spinner');
    const errorEl = document.getElementById('loginError');
    const creds = getActiveCredentials();

    label.style.opacity = '0';
    spinner.hidden = false;
    btn.disabled = true;

    setTimeout(() => {
      spinner.hidden = true;
      label.style.opacity = '1';
      btn.disabled = false;

      if (username === creds.username && password === creds.password) {
        errorEl.hidden = true;
        Storage.saveSession({ username, remembered: remember, loggedInAt: Date.now() });
        App.enterApp();
      } else {
        errorEl.hidden = false;
        errorEl.style.animation = 'none';
        void errorEl.offsetWidth;
        errorEl.style.animation = '';
      }
    }, 500);
  }

  function initCredentialsModal() {
    const openBtn = document.getElementById('openCredentialsBtn');
    const closeBtn = document.getElementById('closeCredentialsBtn');
    const overlay = document.getElementById('credentialsModalOverlay');
    const form = document.getElementById('credentialsForm');
    const errorEl = document.getElementById('credentialsError');
    const successEl = document.getElementById('credentialsSuccess');
    const nameInput = document.getElementById('credRestaurantName');
    const logoInput = document.getElementById('credLogoInput');
    const logoPreview = document.getElementById('credLogoPreview');
    let pendingLogoDataUrl = null;

    openBtn.addEventListener('click', () => {
      form.reset();
      errorEl.hidden = true;
      successEl.hidden = true;
      const settings = Storage.getSettings();
      nameInput.value = settings.restaurantName || '';
      pendingLogoDataUrl = settings.logo || null;
      if (settings.logo) { logoPreview.src = settings.logo; logoPreview.hidden = false; }
      else { logoPreview.hidden = true; logoPreview.src = ''; }
      overlay.hidden = false;
    });

    closeBtn.addEventListener('click', () => { overlay.hidden = true; });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });

    logoInput.addEventListener('change', async () => {
      if (!logoInput.files[0] || !window.Products) return;
      try {
        pendingLogoDataUrl = await Products.resizeImageFile(logoInput.files[0], 240, 0.85);
        logoPreview.src = pendingLogoDataUrl;
        logoPreview.hidden = false;
      } catch (err) {
        errorEl.textContent = "Impossible de charger l'image.";
        errorEl.hidden = false;
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      successEl.hidden = true;

      const oldUsername = document.getElementById('oldUsername').value.trim();
      const oldPassword = document.getElementById('oldPassword').value;
      const newUsername = document.getElementById('newUsername').value.trim();
      const newPassword = document.getElementById('newPassword').value;
      const confirmNewPassword = document.getElementById('confirmNewPassword').value;

      const creds = getActiveCredentials();
      if (oldUsername !== creds.username || oldPassword !== creds.password) {
        errorEl.textContent = "Nom d'utilisateur ou mot de passe actuel incorrect";
        errorEl.hidden = false;
        return;
      }
      if (!newUsername || !newPassword) {
        errorEl.textContent = 'Veuillez remplir tous les champs.';
        errorEl.hidden = false;
        return;
      }
      if (newPassword !== confirmNewPassword) {
        errorEl.textContent = 'Les nouveaux mots de passe ne correspondent pas.';
        errorEl.hidden = false;
        return;
      }

      Storage.saveCredentials({ username: newUsername, password: newPassword });

      const settings = Storage.getSettings();
      const newName = nameInput.value.trim();
      if (newName) settings.restaurantName = newName;
      if (pendingLogoDataUrl) settings.logo = pendingLogoDataUrl;
      Storage.saveSettings(settings);
      if (window.App && App.applyBrand) App.applyBrand();

      successEl.hidden = false;
      form.reset();
      setTimeout(() => { document.getElementById('credentialsModalOverlay').hidden = true; }, 1800);
    });
  }

  return { init };
})();
