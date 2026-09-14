const profileLayout = document.getElementById('profileLayout');
const profileProjectRoot = window.location.pathname.split('/html/')[0];

const loadProfile = async () => {
    try {
        const data = await apiRequest('perfil.php');
        const usuario = data.usuario;
        const session = {
            id: usuario.id_usuario,
            name: usuario.nombre,
            email: usuario.email,
            createdAt: null,
        };

        if (profileLayout) profileLayout.hidden = false;
        initPerfil({ ...session, stats: data });
    } catch (error) {
        window.location.href = '../nologin/login.html';
    }
};

loadProfile();

function formatMemberSince(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' });
}

function initPerfil(session) {
    // ─── Avatar + nombre + email ───
    const avatarBig = document.getElementById('profileAvatarBig');
    const avatarBigInitial = document.getElementById('profileAvatarBigInitial');
    const displayName = document.getElementById('profileDisplayName');
    const emailStatic = document.getElementById('profileEmailStatic');
    const memberSince = document.getElementById('profileMemberSince');

    const renderIdentity = (current) => {
        displayName.textContent = current.name || 'Tu cuenta';
        emailStatic.textContent = current.email;
        memberSince.textContent = formatMemberSince(current.createdAt);

        if (current.avatarUrl) {
            avatarBig.src = current.avatarUrl;
            avatarBig.hidden = false;
            avatarBigInitial.hidden = true;
        } else {
            avatarBig.hidden = true;
            avatarBigInitial.textContent = (current.name || current.email || '?').trim().charAt(0).toUpperCase();
            avatarBigInitial.hidden = false;
        }
    };
    renderIdentity(session);

    // ─── Editar nombre ───
    const editNameBtn = document.getElementById('editProfileNameBtn');
    const nameEditRow = document.getElementById('profileNameEditRow');
    const nameInput = document.getElementById('profileNameInput');
    const nameSaveBtn = document.getElementById('profileNameSaveBtn');
    const nameCancelBtn = document.getElementById('profileNameCancelBtn');

    const openNameEdit = () => {
        nameInput.value = session.name || '';
        displayName.hidden = true;
        editNameBtn.hidden = true;
        nameEditRow.hidden = false;
        nameInput.focus();
    };

    const closeNameEdit = () => {
        displayName.hidden = false;
        editNameBtn.hidden = false;
        nameEditRow.hidden = true;
    };

    editNameBtn.addEventListener('click', openNameEdit);
    nameCancelBtn.addEventListener('click', closeNameEdit);
    nameSaveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName) {
            session.name = newName;
            renderIdentity(session);
        }
        closeNameEdit();
    });

    // ─── Torneos creados y participados ───
    const torneosCount = document.getElementById('profileTorneosCount');
    if (torneosCount) {
        torneosCount.textContent = session.stats?.torneos_participados || 0;
        const torneosLabel = document.querySelector('.profileTorneosLabel');
        if (torneosLabel) torneosLabel.textContent = 'torneos en los que participás';
    }

    // ─── Tema claro/oscuro ───
    const themeLightBtn = document.getElementById('profileThemeLight');
    const themeDarkBtn = document.getElementById('profileThemeDark');

    const syncThemeButtons = () => {
        const isLight = document.body.classList.contains('light');
        themeLightBtn.classList.toggle('active', isLight);
        themeDarkBtn.classList.toggle('active', !isLight);
    };
    syncThemeButtons();

    themeLightBtn.addEventListener('click', () => {
        setTheme('light');
        syncThemeButtons();
    });
    themeDarkBtn.addEventListener('click', () => {
        setTheme('dark');
        syncThemeButtons();
    });

    // ─── Cambio de contraseña (simulado) ───
    const newPasswordInput = document.getElementById('newPasswordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const passwordError = document.getElementById('passwordError');
    const passwordSuccess = document.getElementById('passwordSuccess');
    const changePasswordBtn = document.getElementById('changePasswordBtn');

    changePasswordBtn.addEventListener('click', () => {
        passwordError.hidden = true;
        passwordSuccess.hidden = true;

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!newPassword || newPassword.length < 6) {
            passwordError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            passwordError.hidden = false;
            return;
        }
        if (newPassword !== confirmPassword) {
            passwordError.textContent = 'Las contraseñas no coinciden.';
            passwordError.hidden = false;
            return;
        }

        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        passwordSuccess.hidden = false;
    });

    // ─── Cerrar sesión ───
    const logoutBtn = document.getElementById('profileLogoutBtn');
    logoutBtn.addEventListener('click', async () => {
        await fetch(`${profileProjectRoot}/php/api/auth/logout.php`, {
            method: 'POST',
            credentials: 'same-origin'
        });
        window.clearSession?.();
        window.location.href = '../nologin/inicio.html';
    });
}
