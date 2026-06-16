const menuButton = document.querySelector('.menuIcon');
const menu = document.querySelector('.sideMenu');
const overlay = document.querySelector('.menuOverlay');

if (menuButton && menu && overlay) {
    const setMenuState = (isOpen) => {
        document.body.classList.toggle('menuOpen', isOpen);
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menu.setAttribute('aria-hidden', String(!isOpen));
        overlay.hidden = !isOpen;
    };

    menuButton.addEventListener('click', () => {
        const isOpen = document.body.classList.contains('menuOpen');
        setMenuState(!isOpen);
    });

    overlay.addEventListener('click', () => setMenuState(false));

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenuState(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMenuState(false);
        }
    });
}

const authLink = document.querySelector('.menuReg');

const getAuthState = () => localStorage.getItem('userLoggedIn') === 'true';

const getLinkPrefix = () => {
    const path = window.location.pathname;
    if (path.includes('/pages/')) return '';
    return 'pages/';
};

const updateAuthLink = () => {
    if (!authLink) return;
    const prefix = getLinkPrefix();
    if (getAuthState()) {
        authLink.textContent = 'Perfil';
        authLink.href = `${prefix}perfil.html`;
    } else {
        authLink.textContent = 'Registrarse';
        authLink.href = `${prefix}login.html`;
    }
};

updateAuthLink();
window.addEventListener('storage', updateAuthLink);
