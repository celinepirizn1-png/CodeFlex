// ─── AUTENTICACIÓN SIMULADA (localStorage) + GOOGLE IDENTITY SERVICES ───
// Archivo global: modal de login/registro, sesión simulada, dropdown de perfil.

// TODO: reemplazar por un Client ID real de Google Cloud Console (GIS).
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';

const SESSION_KEY = 'codeflexSession';

const getSession = () => {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
        return null;
    }
};

const setSession = (data) => {
    const existing = getSession();
    const createdAt = (existing && existing.email === data.email && existing.createdAt) || new Date().toISOString();
    const session = {
        name: data.name || '',
        email: data.email || '',
        avatarUrl: data.avatarUrl || '',
        tournaments: data.tournaments || [],
        createdAt
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    renderAuthControl();
};

const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    renderAuthControl();
};

// ─── MODAL DE AUTENTICACIÓN ───
const authOverlay = document.getElementById('authOverlay');
const authClose = document.getElementById('authClose');
const panelLogin = document.getElementById('panelLogin');
const panelRegister = document.getElementById('panelRegister');
const toRegister = document.getElementById('toRegister');
const toLogin = document.getElementById('toLogin');

const showAuthPanel = (panel) => {
    if (panelLogin) panelLogin.classList.toggle('authPanelHidden', panel !== 'login');
    if (panelRegister) panelRegister.classList.toggle('authPanelHidden', panel !== 'register');
};

const openAuth = (panel = 'login') => {
    if (!authOverlay) return;
    authOverlay.hidden = false;
    document.body.classList.add('modalOpen');
    showAuthPanel(panel);
};

const closeAuth = () => {
    if (!authOverlay) return;
    authOverlay.hidden = true;
    document.body.classList.remove('modalOpen');
};

const openLoginBtn = document.getElementById('openLoginBtn');
if (openLoginBtn) openLoginBtn.addEventListener('click', () => openAuth('login'));
if (authClose) authClose.addEventListener('click', closeAuth);
if (authOverlay) authOverlay.addEventListener('click', (e) => {
    if (e.target === authOverlay) closeAuth();
});
if (toRegister) toRegister.addEventListener('click', () => showAuthPanel('register'));
if (toLogin) toLogin.addEventListener('click', () => showAuthPanel('login'));

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authOverlay && !authOverlay.hidden) closeAuth();
});

// ─── LOGIN / REGISTRO SIMULADOS (sin Google) ───
const showAuthError = (el, message) => {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
};

const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginError = document.getElementById('loginError');
if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', () => {
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        if (!email || !password) {
            showAuthError(loginError, 'Completá correo y contraseña.');
            return;
        }
        if (loginError) loginError.hidden = true;
        setSession({ name: email.split('@')[0], email, avatarUrl: '', tournaments: [] });
        closeAuth();
    });
}

const registerSubmitBtn = document.getElementById('registerSubmitBtn');
const registerError = document.getElementById('registerError');
if (registerSubmitBtn) {
    registerSubmitBtn.addEventListener('click', () => {
        const name = document.getElementById('regName')?.value.trim();
        const email = document.getElementById('regEmail')?.value.trim();
        const password = document.getElementById('regPassword')?.value;
        const confirm = document.getElementById('regConfirm')?.value;
        if (!name || !email || !password) {
            showAuthError(registerError, 'Completá todos los campos.');
            return;
        }
        if (password !== confirm) {
            showAuthError(registerError, 'Las contraseñas no coinciden.');
            return;
        }
        if (registerError) registerError.hidden = true;
        setSession({ name, email, avatarUrl: '', tournaments: [] });
        closeAuth();
    });
}

// ─── GOOGLE IDENTITY SERVICES ───
const decodeJwtPayload = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

const handleGoogleCredential = (response) => {
    const payload = decodeJwtPayload(response.credential);
    if (!payload) return;
    setSession({
        name: payload.name || payload.email,
        email: payload.email,
        avatarUrl: payload.picture || '',
        tournaments: []
    });
    closeAuth();
};

const initGoogleSignIn = () => {
    if (!window.google || !google.accounts || !google.accounts.id) return;
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
    });
    const renderOpts = { theme: 'outline', size: 'large', width: 320, text: 'continue_with' };
    const loginBtnContainer = document.getElementById('googleBtnLogin');
    const registerBtnContainer = document.getElementById('googleBtnRegister');
    if (loginBtnContainer) google.accounts.id.renderButton(loginBtnContainer, renderOpts);
    if (registerBtnContainer) google.accounts.id.renderButton(registerBtnContainer, renderOpts);
};

(function waitForGoogleIdentity(retriesLeft) {
    if (window.google && google.accounts && google.accounts.id) {
        initGoogleSignIn();
    } else if (retriesLeft > 0) {
        setTimeout(() => waitForGoogleIdentity(retriesLeft - 1), 200);
    }
})(25);

// ─── DROPDOWN DE PERFIL (navbar) ───
const profileControl = document.getElementById('profileControl');
const profileTrigger = document.getElementById('profileTrigger');
const profileDropdown = document.getElementById('profileDropdown');
const sideMenuRegister = document.getElementById('sideMenuRegister');
const logoutBtn = document.getElementById('logoutBtn');

function closeProfileDropdown() {
    if (profileDropdown) profileDropdown.hidden = true;
    if (profileTrigger) profileTrigger.setAttribute('aria-expanded', 'false');
}

function toggleProfileDropdown(force) {
    if (!profileDropdown) return;
    const shouldOpen = force !== undefined ? force : profileDropdown.hidden;
    if (shouldOpen && typeof window.closeSideMenu === 'function') window.closeSideMenu();
    profileDropdown.hidden = !shouldOpen;
    if (profileTrigger) profileTrigger.setAttribute('aria-expanded', String(shouldOpen));
}

if (profileTrigger) {
    profileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileDropdown();
    });
}

document.addEventListener('click', (e) => {
    if (profileDropdown && !profileDropdown.hidden && profileControl && !profileControl.contains(e.target)) {
        closeProfileDropdown();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfileDropdown();
});

if (sideMenuRegister) {
    sideMenuRegister.addEventListener('click', () => openAuth('register'));
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        closeProfileDropdown();
        clearSession();
    });
}

// ─── RENDER DEL CONTROL DE AUTENTICACIÓN ───
function renderAuthControl() {
    const session = getSession();
    const isLoggedIn = !!(session && session.email);

    const loginBtn = document.getElementById('openLoginBtn');
    const control = document.getElementById('profileControl');
    const emailEl = document.getElementById('profileEmail');
    const avatarEl = document.getElementById('profileAvatar');
    const initialEl = document.getElementById('profileInitial');
    const registerLink = document.getElementById('sideMenuRegister');

    if (loginBtn) loginBtn.hidden = isLoggedIn;
    if (control) control.hidden = !isLoggedIn;
    if (registerLink) registerLink.hidden = isLoggedIn;

    if (!isLoggedIn) return;

    if (emailEl) emailEl.textContent = session.email;

    const initial = (session.name || session.email || '?').trim().charAt(0).toUpperCase();
    if (session.avatarUrl) {
        if (avatarEl) {
            avatarEl.src = session.avatarUrl;
            avatarEl.hidden = false;
        }
        if (initialEl) initialEl.hidden = true;
    } else {
        if (avatarEl) avatarEl.hidden = true;
        if (initialEl) {
            initialEl.textContent = initial;
            initialEl.hidden = false;
        }
    }
}

renderAuthControl();
