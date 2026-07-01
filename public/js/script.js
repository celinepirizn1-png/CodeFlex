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

    document.querySelectorAll('[data-menu-close]').forEach((control) => {
        control.addEventListener('click', () => setMenuState(false));
    });

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
const themeToggle = document.querySelector('[data-theme-toggle]');
const heroSlides = Array.from(document.querySelectorAll('.heroSlide'));

if (heroSlides.length > 1) {
    let activeSlideIndex = 0;

    const showHeroSlide = (index) => {
        heroSlides.forEach((slide, slideIndex) => {
            slide.classList.toggle('active', slideIndex === index);
        });
    };

    showHeroSlide(activeSlideIndex);

    setInterval(() => {
        activeSlideIndex = (activeSlideIndex + 1) % heroSlides.length;
        showHeroSlide(activeSlideIndex);
    }, 5000);
}

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

const setTheme = (theme) => {
    document.body.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('dark', theme === 'dark');
    if (themeToggle) {
        themeToggle.setAttribute('aria-label', theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro');
        themeToggle.querySelector('.themeIcon').textContent = theme === 'light' ? '☀' : '🌙';
    }
    localStorage.setItem('siteTheme', theme);
};

const getSavedTheme = () => localStorage.getItem('siteTheme');

const toggleTheme = () => {
    const currentTheme = document.body.classList.contains('light') ? 'light' : 'dark';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
};

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

const savedTheme = getSavedTheme();
if (savedTheme) {
    setTheme(savedTheme);
} else {
    setTheme('light');
}

updateAuthLink();
window.addEventListener('storage', updateAuthLink);
