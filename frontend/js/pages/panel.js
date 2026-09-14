// ─── PANEL DE CONTROL — dashboards por rol (organizador / admin / participante) ───
// Una sola lógica para las tres páginas: el rol se lee de data-panel-role en el
// <body>. Todo sale de la misma clave de localStorage que el resto del sitio.

const STATUS_LABELS = {
    activo: 'Activo',
    borrador: 'Borrador',
    finalizado: 'Finalizado'
};

const getTorneos = () => JSON.parse(localStorage.getItem('codeflexTorneos') || '[]');
const saveTorneos = (torneos) => localStorage.setItem('codeflexTorneos', JSON.stringify(torneos));

// Cuenta partidos jugados de un torneo (bracket knockout o liga), igual criterio
// que el panel de gestión y la página pública de resultados.
const countPlayed = (t) => {
    const list = t.formatKey === 'knockout'
        ? (t.bracket ? t.bracket.flat() : [])
        : (t.matches || []);
    return list.filter(m => m.teamA && m.teamB
        && m.teamA !== 'BYE' && m.teamB !== 'BYE'
        && m.teamA !== 'TBD' && m.teamB !== 'TBD'
        && m.scoreA != null && m.scoreB != null).length;
};

const role = document.body.dataset.panelRole || 'organizador';

// Nodos comunes
const panelTitle = document.getElementById('panelTitle');
const panelSub = document.getElementById('panelSub');
const panelHeroCta = document.getElementById('panelHeroCta');
const panelListTitle = document.getElementById('panelListTitle');
const panelStats = document.getElementById('panelStats');
const panelGrid = document.getElementById('panelGrid');
const panelAdminList = document.getElementById('panelAdminList');
const panelEmpty = document.getElementById('panelEmpty');
const panelEmptyTitle = document.getElementById('panelEmptyTitle');
const panelEmptyText = document.getElementById('panelEmptyText');
const panelEmptyAction = document.getElementById('panelEmptyAction');
const panelRequests = document.getElementById('panelRequests');
const panelRequestsList = document.getElementById('panelRequestsList');

// Marca la pestaña activa del switcher según el rol de la página.
document.querySelectorAll('.panelSwitcher a').forEach(a => {
    a.classList.toggle('active', a.dataset.role === role);
});

const buildStatCard = (value, label) => {
    const el = document.createElement('div');
    el.className = 'panelStatCard';
    el.innerHTML = `<span class="panelStatValue">${value}</span><span class="panelStatLabel">${label}</span>`;
    return el;
};

// Tarjeta de torneo (reutiliza .torneoCard global). base define el destino:
// 'detalle' para gestionar, 'resultados' para la vista pública.
const buildTorneoCard = (torneo, base) => {
    // Unidad de contenido autónoma → <article> con enlace interno que la cubre.
    const card = document.createElement('article');
    card.className = 'torneoCard';

    const link = document.createElement('a');
    link.className = 'torneoCardLink';
    link.href = `../${base === 'resultados' ? 'resultados' : 'detalleTorneo'}.html?id=${torneo.id}`;

    const top = document.createElement('div');
    top.className = 'torneoCardTop';

    const sportTag = document.createElement('span');
    sportTag.className = 'torneoSportTag';
    sportTag.textContent = torneo.sport;

    const badge = document.createElement('span');
    badge.className = `torneoBadge ${torneo.status}`;
    badge.textContent = STATUS_LABELS[torneo.status] || torneo.status;

    top.append(sportTag, badge);

    const title = document.createElement('h3');
    title.textContent = torneo.name;

    const meta = document.createElement('div');
    meta.className = 'torneoCardMeta';
    const formatSpan = document.createElement('span');
    formatSpan.textContent = torneo.format || 'Formato a definir';
    const participantsSpan = document.createElement('span');
    participantsSpan.textContent = `${torneo.participants} participantes`;
    meta.append(formatSpan, participantsSpan);

    link.append(top, title, meta);
    card.append(link);
    return card;
};

const showEmpty = (title, text, actionText, actionHref) => {
    panelGrid.hidden = true;
    panelAdminList.hidden = true;
    panelEmpty.hidden = false;
    if (panelEmptyTitle) panelEmptyTitle.textContent = title;
    if (panelEmptyText) panelEmptyText.textContent = text;
    if (panelEmptyAction) {
        panelEmptyAction.textContent = actionText;
        panelEmptyAction.href = actionHref;
    }
};

const renderGrid = (torneos, base) => {
    panelEmpty.hidden = true;
    panelAdminList.hidden = true;
    panelGrid.hidden = false;
    panelGrid.innerHTML = '';
    torneos.forEach(t => panelGrid.appendChild(buildTorneoCard(t, base)));
};

const renderRequests = async () => {
    if (!panelRequests || !panelRequestsList || role !== 'organizador') return;
    const session = window.getSession?.();
    const torneos = (await loadTournamentsFromApi().catch(() => getTorneos()))
        .filter(torneo => torneo.ownerEmail && torneo.ownerEmail === session?.email);
    const requests = await loadRequestsFromApi().catch(() => []);
    const pending = requests.filter(request => request.estado === 'pendiente'
        && torneos.some(torneo => torneo.id === Number(request.torneo_id)));

    panelRequests.hidden = false;
    panelRequestsList.innerHTML = '';
    if (!pending.length) {
        panelRequestsList.textContent = 'No hay solicitudes pendientes.';
        return;
    }

    pending.forEach(request => {
        const torneo = torneos.find(item => item.id === Number(request.torneo_id));
        const row = document.createElement('div');
        row.className = 'adminTorneoRow';
        const info = document.createElement('div');
        info.className = 'adminTorneoInfo';
        info.textContent = `${request.participante_email} quiere entrar a ${torneo.name}`;
        const actions = document.createElement('div');
        actions.className = 'adminTorneoActions';
        ['Aprobar', 'Rechazar'].forEach(label => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = label === 'Aprobar' ? 'btn btnPrimary' : 'btn btnSecondary';
            button.textContent = label;
            button.addEventListener('click', async () => {
                await apiRequest('inscripciones.php', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id_inscripcion: Number(request.id_inscripcion),
                        estado: label === 'Aprobar' ? 'aceptada' : 'rechazada'
                    })
                });
                renderRequests();
            });
            actions.appendChild(button);
        });
        row.append(info, actions);
        panelRequestsList.appendChild(row);
    });
};

// ─── Vista ADMIN: lista con acciones (abrir / resultados / eliminar) ───
const renderAdminList = (torneos) => {
    panelEmpty.hidden = true;
    panelGrid.hidden = true;
    panelAdminList.hidden = false;
    panelAdminList.innerHTML = '';

    torneos.forEach(t => {
        const row = document.createElement('div');
        row.className = 'adminTorneoRow';

        const info = document.createElement('div');
        info.className = 'adminTorneoInfo';
        const name = document.createElement('div');
        name.className = 'adminTorneoName';
        name.textContent = t.name;
        const meta = document.createElement('div');
        meta.className = 'adminTorneoMeta';
        meta.innerHTML = `<span>${t.sport || 'Deporte'}</span><span>${STATUS_LABELS[t.status] || t.status || 'Borrador'}</span>` +
            `<span>${t.visibility === 'public' ? 'Público' : 'Privado'}</span>` +
            `<span>${(t.teams || []).length} equipos</span>`;
        info.append(name, meta);

        const actions = document.createElement('div');
        actions.className = 'adminTorneoActions';

        const open = document.createElement('a');
        open.className = 'btn btnSecondary';
        open.href = `../detalleTorneo.html?id=${t.id}`;
        open.textContent = 'Abrir';

        const results = document.createElement('a');
        results.className = 'btn btnSecondary';
        results.href = `../resultados.html?id=${t.id}`;
        results.textContent = 'Resultados';

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btnDanger';
        del.textContent = 'Eliminar';
        del.addEventListener('click', () => {
            if (!window.confirm(`¿Eliminar el torneo "${t.name}"? Esta acción no se puede deshacer.`)) return;
            const all = getTorneos().filter(x => x.id !== t.id);
            saveTorneos(all);
            render();
        });

        actions.append(open, results, del);
        row.append(info, actions);
        panelAdminList.appendChild(row);
    });
};

async function render() {
    const torneos = await loadTournamentsFromApi().catch(() => getTorneos());

    if (role === 'admin') {
        panelTitle.textContent = 'Panel de administración';
        panelSub.textContent = 'Vista global de todos los torneos del sistema.';
        panelListTitle.textContent = 'Todos los torneos';
        if (panelHeroCta) { panelHeroCta.textContent = '+ Crear torneo'; panelHeroCta.href = '../crearTorneo.html'; }

        const equipos = torneos.reduce((acc, t) => acc + (t.teams || []).length, 0);
        const jugados = torneos.reduce((acc, t) => acc + countPlayed(t), 0);
        const publicos = torneos.filter(t => t.visibility === 'public').length;

        panelStats.innerHTML = '';
        panelStats.append(
            buildStatCard(torneos.length, 'Torneos'),
            buildStatCard(publicos, 'Públicos'),
            buildStatCard(equipos, 'Equipos'),
            buildStatCard(jugados, 'Partidos jugados')
        );

        if (!torneos.length) {
            showEmpty('No hay torneos en el sistema', 'Cuando se cree el primer torneo, vas a poder administrarlo desde acá.', 'Crear un torneo', '../crearTorneo.html');
            return;
        }
        renderAdminList(torneos);
        return;
    }

    if (role === 'participante') {
        panelTitle.textContent = 'Panel del participante';
        panelSub.textContent = 'Seguí torneos públicos y mirá los resultados en vivo.';
        panelListTitle.textContent = 'Torneos para seguir';
        if (panelHeroCta) { panelHeroCta.textContent = 'Explorar torneos'; panelHeroCta.href = '../torneos.html'; }

        const publicActivos = torneos.filter(t => t.status === 'activo' && t.visibility === 'public');
        const deportes = new Set(publicActivos.map(t => t.sport)).size;

        panelStats.innerHTML = '';
        panelStats.append(
            buildStatCard(publicActivos.length, 'Torneos públicos'),
            buildStatCard(torneos.filter(t => t.status === 'activo').length, 'Activos'),
            buildStatCard(deportes, 'Deportes')
        );

        if (!publicActivos.length) {
            showEmpty('Todavía no hay torneos públicos', 'Cuando un organizador active y comparta un torneo, vas a poder seguirlo desde acá.', 'Explorar torneos', '../torneos.html');
            return;
        }
        renderGrid(publicActivos, 'resultados');
        return;
    }

    // ─── organizador (rol por defecto) ───
    panelTitle.textContent = 'Panel del organizador';
    panelSub.textContent = 'Creá, activá y gestioná todos tus torneos.';
    panelListTitle.textContent = 'Tus torneos';
    if (panelHeroCta) { panelHeroCta.textContent = '+ Crear torneo'; panelHeroCta.href = '../crearTorneo.html'; }

    panelStats.innerHTML = '';
    panelStats.append(
        buildStatCard(torneos.length, 'Torneos'),
        buildStatCard(torneos.filter(t => t.status === 'activo').length, 'Activos'),
        buildStatCard(torneos.filter(t => t.status === 'borrador').length, 'Borradores'),
        buildStatCard(torneos.filter(t => t.status === 'finalizado').length, 'Finalizados')
    );

    if (!torneos.length) {
        showEmpty('Todavía no creaste ningún torneo', 'Armá tu primer torneo en menos de 2 minutos y gestionalo desde acá.', 'Crear un torneo', '../crearTorneo.html');
        return;
    }
    renderGrid(torneos, 'detalle');
    renderRequests();
}

render();
