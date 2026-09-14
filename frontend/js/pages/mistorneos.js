const STATUS_LABELS = {
    activo: 'Activo',
    borrador: 'Borrador',
    finalizado: 'Finalizado'
};

// El estado a filtrar se lee de data-status en cada chip (string vacío = Todos).
// Antes se mapeaba por el texto visible del botón, lo que se rompía si cambiaba
// la etiqueta; con data-status el filtro es independiente del texto.

const emptyState = document.getElementById('emptyState');
const torneosGrid = document.getElementById('torneosGrid');
const torneosCount = document.querySelector('.torneosCount');
const filterChips = document.querySelectorAll('.filterChip');
const showMoreWrap = document.getElementById('showMoreTorneosWrap');
const showMoreBtn = document.getElementById('showMoreTorneosBtn');
const mobileQuery = window.matchMedia('(max-width: 580px)');

const INITIAL_VISIBLE = 2;
const STEP = 2;
let visibleCount = INITIAL_VISIBLE;

const getTorneos = () => loadTournamentsFromApi();
const getSessionRequests = () => loadRequestsFromApi();

const buildTorneoCard = (torneo) => {
    // Cada torneo es una unidad de contenido autónoma → <article>. La navegación
    // se resuelve con un <a> interno que cubre toda la tarjeta.
    const card = document.createElement('article');
    card.className = 'torneoCard';

    const link = document.createElement('a');
    link.className = 'torneoCardLink';
    link.href = `detalleTorneo.html?id=${torneo.id}`;

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

const renderTorneos = async (statusFilter) => {
    const session = window.getSession?.();
    const allTorneos = await getTorneos().catch(() => []);
    const requests = await getSessionRequests().catch(() => []);
    const approvedIds = new Set(requests
        .filter(request => request.estado === 'aceptada')
        .map(request => Number(request.torneo_id)));
    const torneos = session?.role === 'participante'
        ? allTorneos.filter(torneo => approvedIds.has(torneo.id))
        : allTorneos.filter(torneo => !torneo.ownerEmail || torneo.ownerEmail === session?.email);
    const visible = statusFilter ? torneos.filter(t => t.status === statusFilter) : torneos;

    if (torneosCount) {
        torneosCount.textContent = `${visible.length} torneo${visible.length === 1 ? '' : 's'}`;
    }

    if (!torneos.length) {
        const title = session?.role === 'participante'
            ? 'Todavía no participás en ningún torneo'
            : 'Todavía no creaste ningún torneo';
        const text = session?.role === 'participante'
            ? 'Cuando el organizador apruebe una solicitud, el torneo aparecerá acá.'
            : 'Cuando crees tu primer torneo, aparecerá acá.';
        const emptyTitle = document.getElementById('emptyStateTitle');
        const emptyText = document.getElementById('emptyStateText');
        if (emptyTitle) emptyTitle.textContent = title;
        if (emptyText) emptyText.textContent = text;
        if (emptyState) emptyState.hidden = false;
        if (torneosGrid) torneosGrid.hidden = true;
        if (showMoreWrap) showMoreWrap.hidden = true;
        return;
    }

    if (emptyState) emptyState.hidden = true;
    if (torneosGrid) {
        torneosGrid.hidden = false;
        torneosGrid.innerHTML = '';

        const cardsToShow = mobileQuery.matches ? visible.slice(0, visibleCount) : visible;
        cardsToShow.forEach(torneo => torneosGrid.appendChild(buildTorneoCard(torneo)));

        if (showMoreWrap) {
            showMoreWrap.hidden = !(mobileQuery.matches && visibleCount < visible.length);
        }
    }
};

if (filterChips.length) {
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            visibleCount = INITIAL_VISIBLE;
            renderTorneos(chip.dataset.status || null);
        });
    });
}

const getActiveFilter = () => {
    const activeChip = document.querySelector('.filterChip.active');
    return activeChip ? (activeChip.dataset.status || null) : null;
};

if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
        visibleCount += STEP;
        renderTorneos(getActiveFilter());
    });
}

mobileQuery.addEventListener('change', () => {
    visibleCount = INITIAL_VISIBLE;
    renderTorneos(getActiveFilter());
});

renderTorneos(null);
