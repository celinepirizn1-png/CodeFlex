// ─── CREAR TORNEO — lógica específica de esta página ───

const sportsList = [
    "American Football", "Badminton", "Baseball", "Basketball", "Beach Soccer",
    "Beach Tennis", "Beach volleyball", "Beer pong", "Bowls", "Chess",
    "Cricket", "Darts", "Dodgeball", "Eight-a-side Football", "Fencing",
    "Field Hockey", "FIFA", "Five-a-side Football", "Football", "Futsal",
    "Handball", "Hockey", "Ice Hockey", "Judo", "Karate", "Lawn Bowls",
    "Netball", "NFL", "Other", "Padel", "Pickleball", "Ping-pong", "Pool",
    "Pro Evolution Soccer", "Racquetball", "Rounders", "Rugby", "Seven-a-side Football",
    "Six-a-side Football", "Snooker", "Softball", "Squash",
    "Street Football", "Table football", "Table Tennis", "Taekwondo", "Tennis",
    "Touch Rugby", "Videogame", "Volleyball", "Water polo"
];

const sportIcons = {
    football: '⚽', futsal: '⚽', 'beach-soccer': '⚽',
    'five-a-side-football': '⚽', 'six-a-side-football': '⚽', 'seven-a-side-football': '⚽',
    'eight-a-side-football': '⚽', 'street-football': '⚽', 'table-football': '⚽',
    basketball: '🏀',
    tennis: '🎾', 'beach-tennis': '🎾', padel: '🎾', squash: '🎾', racquetball: '🎾',
    'table-tennis': '🏓', 'ping-pong': '🏓', pickleball: '🏓',
    volleyball: '🏐', 'beach-volleyball': '🏐', netball: '🏐',
    chess: '♟️',
    taekwondo: '🥋', karate: '🥋', judo: '🥋',
    rugby: '🏉', 'touch-rugby': '🏉',
    baseball: '⚾', rounders: '⚾',
    softball: '🥎',
    cricket: '🏏',
    hockey: '🏒', 'field-hockey': '🏑', 'ice-hockey': '🏒',
    handball: '🤾', dodgeball: '🤾',
    badminton: '🏸',
    'american-football': '🏈', nfl: '🏈',
    darts: '🎯',
    pool: '🎱', snooker: '🎱',
    fifa: '🎮', 'pro-evolution-soccer': '🎮', videogame: '🎮',
    bowls: '🎳', 'lawn-bowls': '🎳',
    fencing: '🤺',
    'water-polo': '🤽',
    'beer-pong': '🍺',
    other: '🏆'
};

const descriptions = {
    "knockout": "Pierdes una vez y quedas fuera del torneo.",
    "double-elimination": "Los participantes tienen una segunda oportunidad en una llave de perdedores.",
    "round-robin": "Todos contra todos. Tablas de clasificaciones por puntos acumulados.",
    "swiss": "Competición sin eliminación directa donde te enfrentas a rivales con tu misma puntuación.",
    "groups": "Los participantes se dividen en grupos y los mejores de cada uno avanzan a la siguiente etapa.",
    "cup-consolation": "Además del cuadro principal, hay una copa de consuelo para quienes quedan eliminados temprano."
};

const sportDropdown = document.getElementById('sportDropdown');
const sportTrigger = document.getElementById('sportTrigger');
const sportValue = document.getElementById('sportValue');
const sportList = document.getElementById('sportList');
const sportHidden = document.getElementById('tournamentSport');
const sportClearBtn = document.getElementById('sportClearBtn');

let selectedSportIndex = 0;

// Poblar lista
if (sportList) {
    sportsList.forEach((sport, idx) => {
        const li = document.createElement('li');
        li.textContent = sport;
        li.dataset.value = sport.toLowerCase().replace(/\s+/g, '-');
        li.dataset.index = idx;
        if (sport === "Football") {
            li.classList.add('selected');
            selectedSportIndex = idx;
        }
        sportList.appendChild(li);
    });
}

const toggleDropdown = (force) => {
    const shouldOpen = force !== undefined ? force : !sportDropdown.classList.contains('open');
    sportDropdown.classList.toggle('open', shouldOpen);
};

const selectSport = (li) => {
    if (!li) return;
    sportList.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
    li.classList.add('selected');
    sportValue.textContent = li.textContent;
    sportHidden.value = li.dataset.value;
    selectedSportIndex = parseInt(li.dataset.index);
    toggleDropdown(false);
    updatePreview();
};

if (sportTrigger) {
    sportTrigger.addEventListener('click', (e) => {
        if (e.target === sportClearBtn || e.target.closest('.sportClear')) return;
        toggleDropdown();
    });
}

if (sportList) {
    sportList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) selectSport(li);
    });
}

if (sportClearBtn) {
    sportClearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const firstLi = sportList.querySelector('li');
        if (firstLi) selectSport(firstLi);
    });
}

document.addEventListener('click', (e) => {
    if (sportDropdown && !sportDropdown.contains(e.target)) {
        sportDropdown.classList.remove('open');
    }
});

document.addEventListener('keydown', (e) => {
    if (!sportDropdown || !sportDropdown.classList.contains('open')) return;
    const items = Array.from(sportList.querySelectorAll('li'));
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSportIndex = (selectedSportIndex + 1) % items.length;
        items[selectedSportIndex].scrollIntoView({ block: 'nearest' });
        items[selectedSportIndex].focus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSportIndex = (selectedSportIndex - 1 + items.length) % items.length;
        items[selectedSportIndex].scrollIntoView({ block: 'nearest' });
        items[selectedSportIndex].focus();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        selectSport(items[selectedSportIndex]);
    } else if (e.key === 'Escape') {
        toggleDropdown(false);
    }
});

const partInput = document.getElementById('tournamentParticipants');
const btnMinus = document.getElementById('btnMinus');
const btnPlus = document.getElementById('btnPlus');

if (partInput && btnMinus && btnPlus) {
    // min/max se leen del atributo del input (string) y se cachean como número.
    const MIN_PART = parseInt(partInput.min, 10) || 2;
    const MAX_PART = parseInt(partInput.max, 10) || 128;

    // Deja el valor dentro de [MIN_PART, MAX_PART]; si está vacío o no es un
    // número, cae al mínimo. Se usa al escribir a mano y antes de crear.
    const clampParticipants = () => {
        let val = parseInt(partInput.value, 10);
        if (Number.isNaN(val)) val = MIN_PART;
        val = Math.min(MAX_PART, Math.max(MIN_PART, val));
        partInput.value = val;
        return val;
    };

    btnMinus.addEventListener('click', () => {
        const val = parseInt(partInput.value, 10) || MIN_PART;
        if (val > MIN_PART) partInput.value = val - 1;
        updatePreview();
    });
    btnPlus.addEventListener('click', () => {
        const val = parseInt(partInput.value, 10) || MIN_PART;
        if (val < MAX_PART) partInput.value = val + 1;
        updatePreview();
    });
    // Mientras escribe solo actualizamos la preview (no interrumpimos el tipeo);
    // al salir del campo sí forzamos el valor a un rango válido.
    partInput.addEventListener('input', updatePreview);
    partInput.addEventListener('blur', () => { clampParticipants(); updatePreview(); });

    // Expuesto para que el submit garantice un valor válido aunque no haya
    // habido blur (ej.: click directo en "Crear Torneo" tras escribir).
    partInput.clampParticipants = clampParticipants;
}

function initCustomDropdown(dropdownId, triggerId, valueId, listId, hiddenId, onSelect) {
    const dropdown = document.getElementById(dropdownId);
    const trigger = document.getElementById(triggerId);
    const valueSpan = document.getElementById(valueId);
    const list = document.getElementById(listId);
    const hidden = document.getElementById(hiddenId);
    if (!dropdown || !trigger || !list) return null;

    let selectedIndex = 0;
    const items = Array.from(list.querySelectorAll('li'));
    items.forEach((item, idx) => {
        if (item.classList.contains('selected')) selectedIndex = idx;
    });

    const toggle = (force) => {
        const shouldOpen = force !== undefined ? force : !dropdown.classList.contains('open');
        dropdown.classList.toggle('open', shouldOpen);
    };

    const select = (li) => {
        if (!li) return;
        items.forEach(i => i.classList.remove('selected'));
        li.classList.add('selected');
        valueSpan.textContent = li.textContent;
        hidden.value = li.dataset.value;
        selectedIndex = items.indexOf(li);
        toggle(false);
        if (onSelect) onSelect(li.dataset.value);
    };

    trigger.addEventListener('click', () => toggle());
    list.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) select(li);
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    document.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('open')) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            select(items[selectedIndex]);
        } else if (e.key === 'Escape') {
            toggle(false);
        }
    });

    return { select, toggle };
}

const singleDesc = document.getElementById('singleDesc');

const singleDropdownCtrl = initCustomDropdown(
    'singleDropdown', 'singleTrigger', 'singleValue', 'singleList', 'singleFormat',
    (val) => { if (singleDesc) singleDesc.textContent = descriptions[val] || ""; updatePreview(); }
);

const multi1DropdownCtrl = initCustomDropdown(
    'multi1Dropdown', 'multi1Trigger', 'multi1Value', 'multi1List', 'multiStage1',
    () => updatePreview()
);

const multi2DropdownCtrl = initCustomDropdown(
    'multi2Dropdown', 'multi2Trigger', 'multi2Value', 'multi2List', 'multiStage2',
    () => updatePreview()
);

const stageRadios = document.querySelectorAll('input[name="stageType"]');
const singleContainer = document.getElementById('singleStageSelects');
const multiContainer = document.getElementById('multiStageSelects');

if (stageRadios.length) {
    stageRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'single') {
                singleContainer.classList.remove('disabledStage');
                multiContainer.classList.add('disabledStage');
            } else {
                singleContainer.classList.add('disabledStage');
                multiContainer.classList.remove('disabledStage');
            }
            updatePreview();
        });
    });
}

const tournamentNameInput = document.getElementById('tournamentName');
const previewIcon = document.getElementById('previewIcon');
const previewName = document.getElementById('previewName');
const previewFormat = document.getElementById('previewFormat');
const previewParticipants = document.getElementById('previewParticipants');
const tipBox = document.getElementById('tipBox');

function getCurrentFormatLabel() {
    const stageType = (document.querySelector('input[name="stageType"]:checked') || {}).value || 'single';
    if (stageType === 'single') {
        return document.getElementById('singleValue')?.textContent || '';
    }
    return `${document.getElementById('multi1Value')?.textContent || ''} + ${document.getElementById('multi2Value')?.textContent || ''}`;
}

function getCurrentFormatTip() {
    const stageType = (document.querySelector('input[name="stageType"]:checked') || {}).value || 'single';
    if (stageType === 'single') {
        const val = document.getElementById('singleFormat')?.value;
        return descriptions[val] || '';
    }
    const stage2 = document.getElementById('multiStage2')?.value;
    return descriptions[stage2] || descriptions['groups'] || '';
}

function updatePreview() {
    const sportLabel = sportValue ? sportValue.textContent : 'Football';
    const sportKey = sportHidden ? sportHidden.value : 'football';
    const participants = partInput ? (parseInt(partInput.value, 10) || 0) : 0;
    const enteredName = tournamentNameInput ? tournamentNameInput.value.trim() : '';

    if (previewIcon) previewIcon.textContent = sportIcons[sportKey] || '🏆';
    if (previewName) previewName.textContent = enteredName || `Torneo de ${sportLabel}`;
    if (previewFormat) previewFormat.textContent = getCurrentFormatLabel();
    if (previewParticipants) previewParticipants.textContent = `${participants} participantes`;
    if (tipBox) tipBox.textContent = getCurrentFormatTip();
}

if (tournamentNameInput) tournamentNameInput.addEventListener('input', updatePreview);

updatePreview();

const btnSubmitTournament = document.getElementById('btnSubmitTournament');
if (btnSubmitTournament) {
    btnSubmitTournament.addEventListener('click', async () => {
        const sportLabel = sportValue ? sportValue.textContent : 'Torneo';
        const participants = partInput
            ? (partInput.clampParticipants ? partInput.clampParticipants() : (parseInt(partInput.value, 10) || 2))
            : 0;
        const formatLabel = getCurrentFormatLabel();
        const enteredName = tournamentNameInput ? tournamentNameInput.value.trim() : '';

        const stageType = (document.querySelector('input[name="stageType"]:checked') || {}).value || 'single';
        const singleFormat = document.getElementById('singleFormat')?.value || 'knockout';

        const databaseFormat = singleFormat === 'round-robin' ? 'liga'
            : singleFormat === 'swiss' ? 'sistema_suizo' : 'eliminacion_directa';
        try {
            const created = await apiRequest('torneos.php', {
                method: 'POST',
                body: JSON.stringify({
                    nombre: enteredName || `Torneo de ${sportLabel}`,
                    formato: databaseFormat,
                    fecha_inicio: new Date().toISOString().slice(0, 10)
                })
            });
            await syncTeamsToApi(created.torneo.id_torneo, Array.from({ length: participants }, (_, index) => ({
                name: `Team ${index + 1}`
            })));
            window.location.href = 'mistorneos.html';
        } catch (error) {
            window.alert(error.message);
        }
    });
}
