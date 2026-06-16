const welcomeText = document.getElementById('welcomeText');
const logoutButton = document.getElementById('logoutButton');

const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
const userEmail = localStorage.getItem('userEmail') || 'Usuario';

if (!isLoggedIn) {
    window.location.href = '../index.html';
} else {
    welcomeText.textContent = `Has iniciado sesión como ${userEmail}.`;
}

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    window.location.href = '../index.html';
});
