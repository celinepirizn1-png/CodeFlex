const apiRoot = window.location.pathname.includes('/html/')
    ? window.location.pathname.split('/html/')[0]
    : '';

const apiRequest = async (path, options = {}) => {
    const response = await fetch(`${apiRoot}/php/api/${path}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
};

const mapTournament = (row) => ({
    id: Number(row.id_torneo ?? row.id),
    name: row.nombre ?? row.name,
    sport: row.formato ?? row.sport ?? 'Torneo',
    format: row.formato ?? row.format ?? 'Formato a definir',
    formatKey: row.formato === 'liga' ? 'round-robin' : row.formato === 'sistema_suizo' ? 'swiss' : 'knockout',
    participants: Number(row.participants || 0),
    status: row.estado === 'en_progreso' ? 'activo' : row.estado === 'finalizado' ? 'finalizado' : 'borrador',
    visibility: 'public',
    ownerEmail: row.owner_email || row.ownerEmail || '',
    createdAt: row.fecha_inicio || row.createdAt,
    description: row.descripcion || '',
    teams: row.teams || [],
    bracket: row.bracket || null,
    matches: row.matches || null,
});

const loadTournamentsFromApi = async () => {
    const data = await apiRequest('torneos.php');
    return (data.torneos || []).map(mapTournament);
};

const loadRequestsFromApi = async () => {
    const data = await apiRequest('inscripciones.php');
    return data.inscripciones || [];
};

const loadTeamsFromApi = async (tournamentId) => {
    const data = await apiRequest(`equipos.php?torneo_id=${tournamentId}`);
    return data.equipos || [];
};

const loadMatchesFromApi = async (tournamentId) => {
    const data = await apiRequest(`partidos.php?torneo_id=${tournamentId}`);
    return data.partidos || [];
};

const syncTeamsToApi = (tournamentId, teams) => apiRequest(`equipos.php?torneo_id=${tournamentId}`, {
    method: 'POST',
    body: JSON.stringify({ equipos: teams.map(team => team.name || team.nombre) })
});

const syncMatchesToApi = (tournamentId, matches) => apiRequest(`partidos.php?torneo_id=${tournamentId}`, {
    method: 'POST',
    body: JSON.stringify({ partidos: matches })
});
