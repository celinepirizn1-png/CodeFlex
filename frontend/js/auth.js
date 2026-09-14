const projectRoot = window.location.pathname.includes('/html/')
    ? window.location.pathname.split('/html/')[0]
    : '';
const authApi = (endpoint) => `${projectRoot}/php/api/auth/${endpoint}`;
const SESSION_KEY = 'sgdmSesionLocal';

// Roles y sesiones guardados en localStorage son temporales: no son seguridad
// real y se podrán modificar desde la consola hasta que exista backend para ello.
window.getSession = () => {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (error) {
        return null;
    }
};

window.setSession = (session) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('sgdm:session-changed', { detail: session }));
};

window.clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('sgdm:session-changed'));
};
const authOverlay = document.getElementById('authOverlay');
const panelLogin = document.getElementById('panelLogin');
const panelRegister = document.getElementById('panelRegister');

const showAuthPanel = (panel) => {
    panelLogin?.classList.toggle('authPanelHidden', panel !== 'login');
    panelRegister?.classList.toggle('authPanelHidden', panel !== 'register');
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

const showAuthError = (element, message) => {
    if (!element) return;
    element.textContent = message;
    element.hidden = !message;
};

const loadSession = async () => {
    const loginButton = document.getElementById('openLoginBtn');
    const profileControl = document.getElementById('profileControl');
    const profileEmail = document.getElementById('profileEmail');
    const profileInitial = document.getElementById('profileInitial');
    if (!loginButton || !profileControl) {
        window.dispatchEvent(new Event('sgdm:session-ready'));
        return;
    }

    try {
        const response = await fetch(authApi('me.php'), { credentials: 'same-origin' });
        if (!response.ok) return;

        const data = await response.json();
        const usuario = data.usuario;
        window.setSession({
            id: usuario.id_usuario,
            name: usuario.nombre,
            email: usuario.email,
            role: usuario.rol || 'participante'
        });
        loginButton.hidden = true;
        profileControl.hidden = false;
        if (profileEmail) profileEmail.textContent = usuario.email;
        if (profileInitial) {
            profileInitial.textContent = usuario.nombre.charAt(0).toUpperCase();
            profileInitial.hidden = false;
        }
    } catch (error) {
        console.error('No se pudo consultar la sesión.', error);
    } finally {
        window.dispatchEvent(new Event('sgdm:session-ready'));
    }
};

const submitModalAuth = async (endpoint, payload, errorElement) => {
    try {
        const response = await fetch(authApi(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
        if (endpoint === 'login.php' && data.requiere_2fa) {
            const twoFactorPanel = document.getElementById('modalTwoFactor');
            const twoFactorCode = document.getElementById('modalTwoFactorCode');
            const twoFactorMessage = document.getElementById('modalTwoFactorMessage');
            if (!twoFactorPanel || !twoFactorCode || !twoFactorMessage) {
                throw new Error('No se pudo cargar la verificación de seguridad.');
            }
            document.getElementById('panelLogin')?.classList.add('authPanelHidden');
            twoFactorPanel.classList.remove('authPanelHidden');
            twoFactorMessage.textContent = `Código temporal: ${data.codigo_demo}. Válido durante 5 minutos.`;
            return;
        }
        if (data.usuario) {
            window.setSession({
                id: data.usuario.id_usuario,
                name: data.usuario.nombre,
                email: data.usuario.email,
                role: data.usuario.rol || 'participante'
            });
        }
        closeAuth();
        window.location.reload();
    } catch (error) {
        showAuthError(errorElement, error.message);
    }
};

document.getElementById('openLoginBtn')?.addEventListener('click', () => openAuth('login'));
document.getElementById('authClose')?.addEventListener('click', closeAuth);
document.getElementById('toRegister')?.addEventListener('click', () => showAuthPanel('register'));
document.getElementById('toLogin')?.addEventListener('click', () => showAuthPanel('login'));
document.getElementById('sideMenuRegister')?.addEventListener('click', () => openAuth('register'));
authOverlay?.addEventListener('click', (event) => {
    if (event.target === authOverlay) closeAuth();
});

document.getElementById('loginSubmitBtn')?.addEventListener('click', () => {
    submitModalAuth('login.php', {
        email: document.getElementById('loginEmail')?.value || '',
        password: document.getElementById('loginPassword')?.value || ''
    }, document.getElementById('loginError'));
});

document.getElementById('modalTwoFactorSubmit')?.addEventListener('click', async () => {
    const code = document.getElementById('modalTwoFactorCode')?.value || '';
    const message = document.getElementById('modalTwoFactorMessage');
    try {
        const response = await fetch(authApi('verificar-2fa.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ codigo: code })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo verificar el código.');
        if (data.usuario) {
            window.setSession({
                id: data.usuario.id_usuario,
                name: data.usuario.nombre,
                email: data.usuario.email,
                role: data.usuario.rol || 'participante'
            });
        }
        window.location.reload();
    } catch (error) {
        if (message) message.textContent = error.message;
    }
});

document.getElementById('registerSubmitBtn')?.addEventListener('click', () => {
    submitModalAuth('registro.php', {
        nombre: document.getElementById('regName')?.value || '',
        email: document.getElementById('regEmail')?.value || '',
        password: document.getElementById('regPassword')?.value || ''
    }, document.getElementById('registerError'));
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await fetch(authApi('logout.php'), { method: 'POST', credentials: 'same-origin' });
    } finally {
        window.clearSession();
        window.location.href = `${projectRoot}/html/nologin/inicio.html`;
    }
});

document.getElementById('profileTrigger')?.addEventListener('click', () => {
    const dropdown = document.getElementById('profileDropdown');
    const trigger = document.getElementById('profileTrigger');
    if (!dropdown || !trigger) return;
    dropdown.hidden = !dropdown.hidden;
    trigger.setAttribute('aria-expanded', String(!dropdown.hidden));
});

loadSession();

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && authOverlay && !authOverlay.hidden) closeAuth();
});
