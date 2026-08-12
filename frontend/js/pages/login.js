// ─── LOGIN STANDALONE (login.html) ───
// Esta página comparte la MISMA sesión que el resto del sitio: usa setSession()
// de js/auth.js (clave 'codeflexSession'), no una clave propia. Así, iniciar
// sesión acá se refleja en el navbar, el perfil y "Mis torneos" como en el modal.

const authForm = document.getElementById('authForm');
const message = document.getElementById('message');

if (authForm) {
    authForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            if (message) message.textContent = 'Por favor, ingresá tu correo y contraseña.';
            return;
        }
        if (message) message.textContent = '';

        // setSession vive en js/auth.js (cargado en esta página). Guardamos la
        // sesión unificada y volvemos al inicio ya autenticados.
        if (typeof setSession === 'function') {
            setSession({ name: email.split('@')[0], email, avatarUrl: '', tournaments: [] });
        }
        window.location.href = '../index.html';
    });
}
