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
