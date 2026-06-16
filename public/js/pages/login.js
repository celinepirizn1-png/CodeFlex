const authForm = document.getElementById('authForm');
const message = document.getElementById('message');

authForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
        message.textContent = 'Por favor, ingresa tu correo.';
        return;
    }

    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userEmail', email);
    window.location.href = '../index.html';
});
