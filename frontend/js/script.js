const topbar = document.querySelector('.topbar');
if (topbar) {
    const handleScroll = () => {
        topbar.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // por si la página carga ya scrolleada
}

// ─── MENU LATERAL ───
const menuButton = document.querySelector('.menuIcon');
const menu = document.querySelector('.sideMenu');
const overlay = document.querySelector('.menuOverlay');

if (menuButton && menu && overlay) {
    const setMenuState = (isOpen) => {
        document.body.classList.toggle('menuOpen', isOpen);
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menu.setAttribute('aria-hidden', String(!isOpen));
        overlay.hidden = !isOpen;
        if (isOpen && typeof closeProfileDropdown === 'function') closeProfileDropdown();
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

    window.closeSideMenu = () => setMenuState(false);
}

// ─── CAROUSEL DEL HERO ───
const themeToggle = document.querySelector('[data-theme-toggle]');
const heroSlides = Array.from(document.querySelectorAll('.heroSlide'));

if (heroSlides.length > 1) {
    let activeSlideIndex = 0;
    const showHeroSlide = (index) => {
        heroSlides.forEach((slide, slideIndex) => {
            slide.classList.toggle('active', slideIndex === index);
        });
    };
    setInterval(() => {
        activeSlideIndex = (activeSlideIndex + 1) % heroSlides.length;
        showHeroSlide(activeSlideIndex);
    }, 5000);
}

// ─── TEMA CLARO / OSCURO ───
const setTheme = (theme) => {
    document.body.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('dark', theme === 'dark');
    if (themeToggle) {
        // El ícono muestra lo que vas a ACTIVAR (destino)
        themeToggle.setAttribute('aria-label', theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro');
    }
    localStorage.setItem('siteTheme', theme);
};

const toggleTheme = () => {
    const currentTheme = document.body.classList.contains('light') ? 'light' : 'dark';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
};

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    // Sincronizar el aria-label al cargar según el tema ya aplicado por el
    // script inline del <head>, para que el lector de pantalla anuncie la
    // acción correcta (activar claro/oscuro) desde el primer render.
    const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
    themeToggle.setAttribute('aria-label', currentTheme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro');
}

// ─── TABS DE FORMATOS ───
const tabButtons = document.querySelectorAll('.tabBtn');
const tabPanels = document.querySelectorAll('.tabPanel');

if (tabButtons.length && tabPanels.length) {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            button.classList.add('active');
            const activePanel = document.getElementById(targetTab);
            if (activePanel) activePanel.classList.add('active');
        });
    });
}

// ─── CONTADORES ANIMADOS ───
const counters = document.querySelectorAll('.statNumber');

const animateCount = (element) => {
    const targetNumber = parseInt(element.getAttribute('data-target'), 10);
    const suffix = element.getAttribute('data-suffix') || '';
    const duration = 2000;
    let startTime = null;

    const tick = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        element.textContent = Math.round(targetNumber * easedProgress) + suffix;

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    };
    requestAnimationFrame(tick);
};

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCount(entry.target);
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.4 });

counters.forEach(counter => statsObserver.observe(counter));

// ─── AÑO DINÁMICO EN EL FOOTER ───
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
