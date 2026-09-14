const loginProjectRoot = window.location.pathname.includes('/html/')
    ? window.location.pathname.split('/html/')[0]
    : '';
const apiUrl = (path) => `${loginProjectRoot}/php/api/auth/${path}`;

const showFieldError = (input, error, text) => {
    if (error) error.textContent = text;
    if (input) input.setAttribute('aria-invalid', text ? 'true' : 'false');
};

const submitAuth = async (form, endpoint, payload, message) => {
    const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    if (data.requiere_2fa) {
        const twoFactorForm = document.getElementById('twoFactorForm');
        const twoFactorMessage = document.getElementById('twoFactorMessage');
        form.hidden = true;
        twoFactorForm.hidden = false;
        twoFactorMessage.textContent = `Código temporal: ${data.codigo_demo}. Válido durante 5 minutos.`;
        return;
    }
    if (data.usuario && window.setSession) {
        window.setSession({
            id: data.usuario.id_usuario,
            name: data.usuario.nombre,
            email: data.usuario.email,
            role: data.usuario.rol || payload.rol || 'participante'
        });
    }
    if (message) message.textContent = 'Operación realizada correctamente.';
    form.reset();
    window.location.href = 'inicio.html';
};

const twoFactorForm = document.getElementById('twoFactorForm');
if (twoFactorForm) {
    twoFactorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const codeInput = document.getElementById('twoFactorCode');
        const message = document.getElementById('twoFactorMessage');
        try {
            const response = await fetch(apiUrl('verificar-2fa.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ codigo: codeInput.value })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo verificar el código.');
            if (data.usuario && window.setSession) {
                window.setSession({ id: data.usuario.id_usuario, name: data.usuario.nombre, email: data.usuario.email, role: data.usuario.rol });
            }
            window.location.href = 'inicio.html';
        } catch (error) {
            message.textContent = error.message;
        }
    });
}

const authForm = document.getElementById('authForm');
const registerForm = document.getElementById('registerForm');

// La Constraint Validation API mejora la UX; la seguridad real se valida en PHP.
if (authForm) {
    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const message = document.getElementById('message');
        if (!authForm.checkValidity()) {
            authForm.reportValidity();
            showFieldError(email, document.getElementById('emailError'), email.validationMessage);
            showFieldError(password, document.getElementById('passwordError'), password.validationMessage);
            return;
        }
        try {
            await submitAuth(authForm, 'login.php', { email: email.value, password: password.value }, message);
        } catch (error) {
            message.textContent = error.message;
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        const message = document.getElementById('message');
        showFieldError(confirmPassword, document.getElementById('confirmPasswordError'),
            password.value === confirmPassword.value ? '' : 'Las contraseñas no coinciden.');
        if (!registerForm.checkValidity() || password.value !== confirmPassword.value) {
            registerForm.reportValidity();
            [name, email, password].forEach((input) => showFieldError(input,
                document.getElementById(`${input.id}Error`), input.validationMessage));
            return;
        }
        try {
            await submitAuth(registerForm, 'registro.php', {
                nombre: name.value,
                email: email.value,
                password: password.value
                ,rol: document.querySelector('input[name="rol"]:checked')?.value || 'participante'
            }, message);
        } catch (error) {
            message.textContent = error.message;
        }
    });
}
