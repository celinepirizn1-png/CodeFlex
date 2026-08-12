// ─── TORNEOS PÚBLICOS — búsqueda y exploración ───

const STATUS_LABELS = {
    activo: 'Activo',
    borrador: 'Borrador',
    finalizado: 'Finalizado'
};

const emptyState = document.getElementById('emptyState');
const emptyStateTitle = document.getElementById('emptyStateTitle');
const emptyStateText = document.getElementById('emptyStateText');
const emptyStateAction = document.getElementById('emptyStateAction');
const torneosGrid = document.getElementById('torneosGrid');
const torneosCount = document.getElementById('torneosCount');
const searchInput = document.getElementById('torneosSearchInput');
const sportFilter = document.getElementById('sportFilter');
const formatFilter = document.getElementById('formatFilter');
const statusChips = document.querySelectorAll('#statusFilters .filterChip');
const showMoreWrap = document.getElementById('showMoreTorneosWrap');
const showMoreBtn = document.getElementById('showMoreTorneosBtn');
const mobileQuery = window.matchMedia('(max-width: 580px)');

const INITIAL_VISIBLE = 6;
const STEP = 6;
let visibleCount = INITIAL_VISIBLE;

const getPublicTorneos = () => {
    const torneos = JSON.parse(localStorage.getItem('codeflexTorneos') || '[]');
    // Un torneo solo es público si además de la visibilidad está Activo:
    // un Borrador no debería listarse aunque su visibilidad sea "Público".
    return torneos.filter(t => t.status === 'activo' && t.visibility === 'public');
};

const populateSelectOptions = (select, values, allLabel) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = allLabel;
    select.appendChild(allOption);

    values.forEach(value => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        select.appendChild(opt);
    });

    if (values.includes(current)) select.value = current;
};

const buildTorneoCard = (torneo) => {
    // Cada torneo es una unidad de contenido autónoma → <article> con un enlace
    // interno que cubre toda la tarjeta.
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

const getActiveStatus = () => {
    const active = document.querySelector('#statusFilters .filterChip.active');
    return active ? active.dataset.status : '';
};

const applyFilters = (all) => {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const sport = sportFilter ? sportFilter.value : '';
    const format = formatFilter ? formatFilter.value : '';
    const status = getActiveStatus();

    return all.filter(t => {
        if (query && !t.name.toLowerCase().includes(query)) return false;
        if (sport && t.sport !== sport) return false;
        if (format && t.format !== format) return false;
        if (status && t.status !== status) return false;
        return true;
    });
};

const hasActiveFilters = () => {
    return Boolean(
        (searchInput && searchInput.value.trim())
        || (sportFilter && sportFilter.value)
        || (formatFilter && formatFilter.value)
        || getActiveStatus()
    );
};

const setEmptyState = (variant) => {
    if (!emptyState) return;
    if (variant === 'no-public') {
        if (emptyStateTitle) emptyStateTitle.textContent = 'Todavía no hay torneos públicos';
        if (emptyStateText) emptyStateText.textContent = 'Cuando alguien cree un torneo y lo comparta, vas a poder encontrarlo y seguirlo acá.';
        if (emptyStateAction) {
            emptyStateAction.textContent = 'Crear el primer torneo';
            emptyStateAction.href = 'crearTorneo.html';
        }
    } else {
        if (emptyStateTitle) emptyStateTitle.textContent = 'Ningún torneo coincide con tu búsqueda';
        if (emptyStateText) emptyStateText.textContent = 'Probá con otro nombre o quitá algunos filtros.';
        if (emptyStateAction) {
            emptyStateAction.textContent = 'Limpiar filtros';
            emptyStateAction.href = '#';
        }
    }
};

const clearFilters = () => {
    if (searchInput) searchInput.value = '';
    if (sportFilter) sportFilter.value = '';
    if (formatFilter) formatFilter.value = '';
    statusChips.forEach(c => c.classList.toggle('active', c.dataset.status === ''));
    visibleCount = INITIAL_VISIBLE;
    renderTorneos();
};

const renderTorneos = () => {
    const all = getPublicTorneos();

    populateSelectOptions(sportFilter, [...new Set(all.map(t => t.sport).filter(Boolean))].sort(), 'Todos los deportes');
    populateSelectOptions(formatFilter, [...new Set(all.map(t => t.format).filter(Boolean))].sort(), 'Todos los formatos');

    const filtered = applyFilters(all);

    if (torneosCount) {
        torneosCount.textContent = `${filtered.length} torneo${filtered.length === 1 ? '' : 's'}`;
    }

    if (!all.length) {
        setEmptyState('no-public');
        if (emptyState) emptyState.hidden = false;
        if (torneosGrid) torneosGrid.hidden = true;
        if (showMoreWrap) showMoreWrap.hidden = true;
        return;
    }

    if (!filtered.length) {
        setEmptyState(hasActiveFilters() ? 'no-match' : 'no-public');
        if (emptyState) emptyState.hidden = false;
        if (torneosGrid) torneosGrid.hidden = true;
        if (showMoreWrap) showMoreWrap.hidden = true;
        return;
    }

    if (emptyState) emptyState.hidden = true;
    if (torneosGrid) {
        torneosGrid.hidden = false;
        torneosGrid.innerHTML = '';

        const cardsToShow = mobileQuery.matches ? filtered.slice(0, visibleCount) : filtered;
        cardsToShow.forEach(torneo => torneosGrid.appendChild(buildTorneoCard(torneo)));

        if (showMoreWrap) {
            showMoreWrap.hidden = !(mobileQuery.matches && visibleCount < filtered.length);
        }
    }
};

if (searchInput) {
    searchInput.addEventListener('input', () => {
        visibleCount = INITIAL_VISIBLE;
        renderTorneos();
    });
}

if (sportFilter) {
    sportFilter.addEventListener('change', () => {
        visibleCount = INITIAL_VISIBLE;
        renderTorneos();
    });
}

if (formatFilter) {
    formatFilter.addEventListener('change', () => {
        visibleCount = INITIAL_VISIBLE;
        renderTorneos();
    });
}

statusChips.forEach(chip => {
    chip.addEventListener('click', () => {
        statusChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        visibleCount = INITIAL_VISIBLE;
        renderTorneos();
    });
});

if (emptyStateAction) {
    emptyStateAction.addEventListener('click', (e) => {
        if (emptyStateAction.textContent === 'Limpiar filtros') {
            e.preventDefault();
            clearFilters();
        }
    });
}

if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
        visibleCount += STEP;
        renderTorneos();
    });
}

mobileQuery.addEventListener('change', () => {
    visibleCount = INITIAL_VISIBLE;
    renderTorneos();
});

renderTorneos();
