// ─── DETALLE DE TORNEO — panel de gestión ───

const STORAGE_KEY = 'codeflexTorneos';

const getTorneos = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveTorneos = (torneos) => localStorage.setItem(STORAGE_KEY, JSON.stringify(torneos));

const params = new URLSearchParams(window.location.search);
const torneoId = Number(params.get('id'));

const notFoundState = document.getElementById('notFoundState');
const detalleLayout = document.getElementById('detalleLayout');

let torneos = getTorneos();
let torneoIndex = torneos.findIndex(t => t.id === torneoId);

if (torneoIndex === -1) {
    if (notFoundState) notFoundState.hidden = false;
} else {
    // Completar campos que puedan faltar en torneos creados antes de este panel.
    const torneo = torneos[torneoIndex];
    const defaults = {
        description: '',
        visibility: 'private',
        legs: 1,
        placements: 'Solo 1°/2° puesto',
        formatKey: 'knockout',
        teams: Array.from({ length: torneo.participants || 0 }, (_, i) => ({ id: i + 1, name: `Team ${i + 1}` })),
        bracket: null,
        matches: null,
        collaborators: [],
        onboardingDismissed: false
    };
    Object.keys(defaults).forEach(key => {
        if (torneo[key] === undefined) torneo[key] = defaults[key];
    });
    saveTorneos(torneos);

    if (detalleLayout) detalleLayout.hidden = false;
    initDetallePanel(torneo);
}

function persist(torneo) {
    torneos[torneoIndex] = torneo;
    saveTorneos(torneos);
}

/* ─────────────────────────────────────────────────────────────
   MOTOR DE COMPETICIÓN (funciones puras, sin tocar el DOM)

   Dos motores según el formato:
   - "bracket" (eliminatoria directa / knockout): el ganador de cada
     partido avanza automáticamente a la ronda siguiente hasta el campeón.
   - "league" (todos contra todos): se generan todos los cruces y se
     calcula la tabla de posiciones por puntos.

   El resto de formatos (liga, suizo, doble eliminación, multi-etapa) usan
   el motor de liga como implementación funcional en esta versión frontend.
   ───────────────────────────────────────────────────────────── */

function isKnockout(torneo) {
    return torneo.formatKey === 'knockout';
}

function nextPowerOfTwo(n) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

// Ganador de un partido: maneja BYE (avanza el rival) y empate (sin ganador).
function matchWinner(match) {
    const a = match.teamA, b = match.teamB;
    if (a === 'TBD' || b === 'TBD') return null;
    if (a === 'BYE' && b === 'BYE') return null;
    if (a === 'BYE') return b;
    if (b === 'BYE') return a;
    if (match.scoreA == null || match.scoreB == null) return null;
    const sa = Number(match.scoreA), sb = Number(match.scoreB);
    if (sa > sb) return a;
    if (sb > sa) return b;
    return null; // empate: en knockout no define, hay que desempatar
}

// Perdedor de un partido (para alimentar la llave de perdedores).
function matchLoser(match) {
    const w = matchWinner(match);
    if (!w) return null;
    return w === match.teamA ? match.teamB : match.teamA;
}

// Propaga los ganadores de cada ronda a la ronda siguiente. Si el equipo que
// alimenta un hueco cambia, se limpia el resultado viejo de ese partido.
function propagateBracket(rounds) {
    for (let r = 0; r < rounds.length - 1; r++) {
        rounds[r].forEach((match, i) => {
            const winner = matchWinner(match);
            const next = rounds[r + 1][Math.floor(i / 2)];
            const slot = (i % 2 === 0) ? 'teamA' : 'teamB';
            const value = winner || 'TBD';
            if (next[slot] !== value) {
                next[slot] = value;
                if (slot === 'teamA') next.scoreA = undefined; else next.scoreB = undefined;
                next.playedAt = undefined;
            }
        });
    }
}

function bracketChampion(rounds) {
    if (!rounds || !rounds.length) return null;
    return matchWinner(rounds[rounds.length - 1][0]);
}

function buildBracket(teams) {
    const names = teams.map(t => t.name);
    const size = nextPowerOfTwo(Math.max(names.length, 2));
    const padded = names.slice();
    while (padded.length < size) padded.push('BYE');

    const rounds = [];
    const first = [];
    for (let i = 0; i < padded.length; i += 2) {
        first.push({ teamA: padded[i], teamB: padded[i + 1], scoreA: undefined, scoreB: undefined, playedAt: undefined });
    }
    rounds.push(first);

    let count = first.length;
    while (count > 1) {
        count = Math.floor(count / 2);
        rounds.push(Array.from({ length: count }, () => ({ teamA: 'TBD', teamB: 'TBD', scoreA: undefined, scoreB: undefined, playedAt: undefined })));
    }
    propagateBracket(rounds); // resuelve los BYE de la primera ronda de una
    return rounds;
}

/* ─────────────────────────────────────────────────────────────
   DOBLE ELIMINACIÓN
   Modelo de "feeds": cada hueco sabe de qué partido sale su equipo
   (ganador `w` o perdedor `l`), o si es un cabeza de serie (`seed`).
   `propagateDouble` resuelve todos los huecos en orden de dependencia
   (Ganadores → Perdedores → Gran Final) y limpia resultados aguas abajo
   cuando cambia quién alimenta un partido. Incluye reset de gran final:
   si el que viene de perdedores gana la 1ª final, se juega una 2ª.
   ───────────────────────────────────────────────────────────── */
function isDouble(torneo) {
    return torneo.formatKey === 'double-elimination';
}

function deAllMatches(de) {
    if (!de) return [];
    const gf = de.GF.filter(m => m.teamA !== 'TBD' && m.teamB !== 'TBD');
    return [...de.W.flat(), ...de.L.flat(), ...gf];
}

function deMatchMap(de) {
    const map = {};
    [...de.W.flat(), ...de.L.flat(), ...de.GF].forEach(m => { map[m.id] = m; });
    return map;
}

function resolveFeed(feed, map) {
    if (!feed) return 'TBD';
    if (feed.seed !== undefined) return feed.seed;
    const src = map[feed.ref];
    if (!src) return 'TBD';
    const val = feed.kind === 'loser' ? matchLoser(src) : matchWinner(src);
    return val || 'TBD';
}

// Asigna un valor a un hueco limpiando el resultado si el equipo cambió.
function deSetSlot(match, slot, value) {
    if (match[slot] === value) return;
    match[slot] = value;
    if (slot === 'teamA') match.scoreA = undefined; else match.scoreB = undefined;
    match.playedAt = undefined;
}

function propagateDouble(de) {
    const map = deMatchMap(de);
    // Ganadores y perdedores en orden (las dependencias ya están resueltas).
    [...de.W, ...de.L].forEach(round => round.forEach(m => {
        deSetSlot(m, 'teamA', resolveFeed(m.a, map));
        deSetSlot(m, 'teamB', resolveFeed(m.b, map));
    }));
    // Gran final.
    const gf0 = de.GF[0], gf1 = de.GF[1];
    deSetSlot(gf0, 'teamA', resolveFeed(gf0.a, map));
    deSetSlot(gf0, 'teamB', resolveFeed(gf0.b, map));
    // Reset: solo si el equipo que viene de perdedores (teamB) gana la 1ª final.
    const gf0w = matchWinner(gf0);
    const reset = !!gf0w && gf0w === gf0.teamB
        && gf0.teamA !== 'BYE' && gf0.teamB !== 'BYE';
    gf1.active = reset;
    deSetSlot(gf1, 'teamA', reset ? gf0.teamA : 'TBD');
    deSetSlot(gf1, 'teamB', reset ? gf0.teamB : 'TBD');
}

function doubleChampion(de) {
    if (!de) return null;
    const gf0 = de.GF[0], gf1 = de.GF[1];
    if (gf1.active) return matchWinner(gf1);
    const w = matchWinner(gf0);
    if (!w) return null;
    // Si gana el de perdedores hace falta el reset; todavía no hay campeón.
    return w === gf0.teamA ? w : null;
}

function buildDouble(teams) {
    const names = teams.map(t => t.name);
    const size = nextPowerOfTwo(Math.max(names.length, 2));
    const seeds = names.slice();
    while (seeds.length < size) seeds.push('BYE');
    const k = Math.log2(size);

    const mk = (id, a, b) => ({
        id, teamA: 'TBD', teamB: 'TBD',
        scoreA: undefined, scoreB: undefined, playedAt: undefined, a, b
    });
    const seed = (name) => ({ seed: name });
    const win = (ref) => ({ ref, kind: 'winner' });
    const lose = (ref) => ({ ref, kind: 'loser' });

    // Llave de ganadores.
    const W = [];
    const w1 = [];
    for (let j = 0; j < size / 2; j++) {
        w1.push(mk(`W-1-${j}`, seed(seeds[2 * j]), seed(seeds[2 * j + 1])));
    }
    W.push(w1);
    for (let r = 2; r <= k; r++) {
        const cnt = size / Math.pow(2, r);
        const arr = [];
        for (let j = 0; j < cnt; j++) {
            arr.push(mk(`W-${r}-${j}`, win(`W-${r - 1}-${2 * j}`), win(`W-${r - 1}-${2 * j + 1}`)));
        }
        W.push(arr);
    }

    // Llave de perdedores: 2k-2 rondas, alternando "empareja" y "bajada".
    const L = [];
    const totalL = 2 * k - 2;
    for (let r = 1; r <= totalL; r++) {
        const arr = [];
        if (r === 1) {
            for (let j = 0; j < size / 4; j++) {
                arr.push(mk(`L-1-${j}`, lose(`W-1-${2 * j}`), lose(`W-1-${2 * j + 1}`)));
            }
        } else if (r % 2 === 0) {
            // Bajada: ganador de L(r-1) vs perdedor de la ronda W correspondiente.
            const wbRound = r / 2 + 1;
            const cnt = W[wbRound - 1].length;
            for (let j = 0; j < cnt; j++) {
                arr.push(mk(`L-${r}-${j}`, win(`L-${r - 1}-${j}`), lose(`W-${wbRound}-${j}`)));
            }
        } else {
            // Empareja ganadores de L(r-1) entre sí.
            const cnt = L[r - 2].length / 2;
            for (let j = 0; j < cnt; j++) {
                arr.push(mk(`L-${r}-${j}`, win(`L-${r - 1}-${2 * j}`), win(`L-${r - 1}-${2 * j + 1}`)));
            }
        }
        L.push(arr);
    }

    // Gran final (+ reset).
    const GF = [
        mk('GF-0', win(`W-${k}-0`), win(`L-${totalL}-0`)),
        mk('GF-1', null, null)
    ];
    GF[1].active = false;

    const de = { W, L, GF, size, k };
    propagateDouble(de);
    return de;
}

function leagueMatchesFor(names) {
    const matches = [];
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            matches.push({ teamA: names[i], teamB: names[j], scoreA: undefined, scoreB: undefined, playedAt: undefined });
        }
    }
    return matches;
}

function buildLeague(teams) {
    return leagueMatchesFor(teams.map(t => t.name));
}

// Tabla de posiciones a partir de una lista de equipos y sus partidos
// (se usa por grupo en el formato multi-etapa; no incluye descansos suizos).
function computeStandingsFrom(teamNames, matches, cfg) {
    cfg = cfg || stdConfig(null);
    const table = new Map();
    teamNames.forEach(n => table.set(n, { name: n, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 }));
    matches.filter(m => m.scoreA != null && m.scoreB != null
        && m.teamA !== 'BYE' && m.teamB !== 'BYE' && m.teamA !== 'TBD' && m.teamB !== 'TBD')
        .forEach(m => {
            const a = table.get(m.teamA), b = table.get(m.teamB);
            if (!a || !b) return;
            tallyMatch(a, b, Number(m.scoreA), Number(m.scoreB), cfg);
        });
    return sortStandings(Array.from(table.values()), cfg);
}

/* ─────────────────────────────────────────────────────────────
   MULTI-ETAPA: fase de grupos (round-robin) → playoffs (knockout)
   Etapa 1 en `torneo.groups = [{ name, teamNames, matches }]`.
   Etapa 2 reutiliza el motor de knockout en `torneo.playoffBracket`.
   ───────────────────────────────────────────────────────────── */
function isMulti(torneo) {
    return torneo.formatKey === 'multi-stage';
}

// Config con defaults sensatos según la cantidad de equipos.
function msConfig(torneo) {
    const n = (torneo.teams || []).length;
    let numGroups = torneo.msConfig && torneo.msConfig.numGroups;
    if (!numGroups) numGroups = n >= 8 ? Math.max(2, Math.round(n / 4)) : (n >= 4 ? 2 : 1);
    numGroups = Math.max(1, Math.min(numGroups, Math.floor(n / 2) || 1));
    const advancePerGroup = (torneo.msConfig && torneo.msConfig.advancePerGroup) || 2;
    return { numGroups, advancePerGroup };
}

function buildGroups(torneo) {
    const { numGroups } = msConfig(torneo);
    const names = torneo.teams.map(t => t.name);
    const groups = Array.from({ length: numGroups }, (_, i) => ({
        name: `Grupo ${String.fromCharCode(65 + i)}`, teamNames: [], matches: []
    }));
    names.forEach((nm, i) => groups[i % numGroups].teamNames.push(nm)); // reparto en serpentina simple
    groups.forEach(g => { g.matches = leagueMatchesFor(g.teamNames); });
    return groups;
}

function groupsComplete(torneo) {
    return !!torneo.groups && torneo.groups.every(g =>
        g.matches.length > 0 && g.matches.every(m => m.scoreA != null && m.scoreB != null));
}

// Clasificados a playoffs, sembrados con cruce (1º de un grupo vs 2º de otro).
function playoffSeeds(torneo) {
    const { advancePerGroup } = msConfig(torneo);
    const cfg = stdConfig(torneo);
    const tables = torneo.groups.map(g => computeStandingsFrom(g.teamNames, g.matches, cfg));
    const k = torneo.groups.length;
    const seeds = [];
    if (advancePerGroup === 2 && k > 1) {
        for (let i = 0; i < k; i++) {
            if (tables[i][0]) seeds.push(tables[i][0].name);               // 1º del grupo i
            if (tables[(i + 1) % k][1]) seeds.push(tables[(i + 1) % k][1].name); // 2º del grupo siguiente
        }
    } else {
        for (let r = 0; r < advancePerGroup; r++) {
            for (let i = 0; i < k; i++) if (tables[i][r]) seeds.push(tables[i][r].name);
        }
    }
    return seeds;
}

function generatePlayoffs(torneo) {
    const seeds = playoffSeeds(torneo);
    torneo.playoffBracket = buildBracket(seeds.map(name => ({ name })));
}

// Campeón según el formato (llaves y multi-etapa).
function tournamentChampion(torneo) {
    if (isKnockout(torneo)) return bracketChampion(torneo.bracket);
    if (isDouble(torneo)) return doubleChampion(torneo.de);
    if (isMulti(torneo)) return bracketChampion(torneo.playoffBracket);
    return null;
}

// ¿Se muestra una única tabla global? Solo en liga y suizo (no en llaves ni grupos).
function showsGlobalStandings(torneo) {
    return !isBracketFormat(torneo) && !isMulti(torneo);
}

// Marcador por sets: el resultado de cada equipo son los "sets ganados".
// Así matchWinner, la propagación y las posiciones funcionan sin cambios.
function isSetsScoring(torneo) {
    return torneo && torneo.scoring === 'sets';
}

function setsBestOf(torneo) {
    return torneo.setsBestOf === 5 ? 5 : 3;
}

function setsToWin(torneo) {
    return Math.ceil(setsBestOf(torneo) / 2); // 2 en best-of-3, 3 en best-of-5
}

// Goleadores ordenados (goles, luego asistencias, luego nombre).
function topScorers(torneo) {
    return (torneo.players || [])
        .filter(p => (p.goals || 0) > 0)
        .sort((a, b) => (b.goals || 0) - (a.goals || 0)
            || (b.assists || 0) - (a.assists || 0)
            || a.name.localeCompare(b.name));
}

/* ─────────────────────────────────────────────────────────────
   SISTEMA SUIZO
   Se reutiliza el arreglo plano `torneo.matches` (igual que la liga),
   agregando a cada partido un campo `round`. Los descansos (BYE) por
   ronda se guardan aparte en `torneo.swissByeByRound = { round: nombre }`
   y valen como victoria en la tabla, sin ensuciar la lista de partidos.
   Así, stats, TV, calendario y posiciones siguen funcionando sin cambios.
   ───────────────────────────────────────────────────────────── */
function isSwiss(torneo) {
    return torneo.formatKey === 'swiss';
}

const swissPairKey = (a, b) => [a, b].sort().join(' ');

// Última ronda ya generada (0 si todavía no hay fixture).
function swissCurrentRound(torneo) {
    if (!torneo.matches || !torneo.matches.length) return 0;
    return torneo.matches.reduce((max, m) => Math.max(max, m.round || 1), 0);
}

// Cruces ya disputados, para no repetir emparejamientos.
function swissPlayedPairs(torneo) {
    const set = new Set();
    (torneo.matches || []).forEach(m => {
        if (m.teamA && m.teamB) set.add(swissPairKey(m.teamA, m.teamB));
    });
    return set;
}

// Equipos que ya descansaron alguna vez.
function swissByedSet(torneo) {
    return new Set(Object.values(torneo.swissByeByRound || {}));
}

// ¿Está completa una ronda? (todos sus partidos con resultado cargado)
function swissRoundComplete(torneo, round) {
    const games = (torneo.matches || []).filter(m => (m.round || 1) === round);
    return games.length > 0 && games.every(m => m.scoreA != null && m.scoreB != null);
}

// Rondas útiles máximas: n-1 (más allá sería un todos-contra-todos completo).
function swissMaxRounds(torneo) {
    return Math.max(1, (torneo.teams || []).length - 1);
}

// Empareja una ronda a partir de un orden de equipos (seed en R1, posiciones
// en R2+), evitando revanchas y asignando el descanso al de más abajo que aún
// no descansó. Devuelve { matches, byeTeam }.
function swissPairRound(order, playedPairs, byedSet, round) {
    const remaining = order.slice();
    const matches = [];
    let byeTeam = null;

    if (remaining.length % 2 === 1) {
        for (let i = remaining.length - 1; i >= 0; i--) {
            if (!byedSet.has(remaining[i])) { byeTeam = remaining[i]; break; }
        }
        if (!byeTeam) byeTeam = remaining[remaining.length - 1];
        remaining.splice(remaining.indexOf(byeTeam), 1);
    }

    while (remaining.length) {
        const a = remaining.shift();
        let idx = remaining.findIndex(b => !playedPairs.has(swissPairKey(a, b)));
        if (idx === -1) idx = 0; // sin opción sin revancha: se toma la primera
        const b = remaining.splice(idx, 1)[0];
        matches.push({ teamA: a, teamB: b, scoreA: undefined, scoreB: undefined, playedAt: undefined, round });
    }
    return { matches, byeTeam };
}

function buildSwissRoundOne(torneo) {
    const order = torneo.teams.map(t => t.name);
    const { matches, byeTeam } = swissPairRound(order, new Set(), new Set(), 1);
    torneo.matches = matches;
    torneo.swissByeByRound = byeTeam ? { 1: byeTeam } : {};
}

function buildSwissNextRound(torneo) {
    const round = swissCurrentRound(torneo) + 1;
    const order = computeStandings(torneo).map(r => r.name);
    const { matches, byeTeam } = swissPairRound(order, swissPlayedPairs(torneo), swissByedSet(torneo), round);
    torneo.matches = (torneo.matches || []).concat(matches);
    if (byeTeam) {
        torneo.swissByeByRound = torneo.swissByeByRound || {};
        torneo.swissByeByRound[round] = byeTeam;
    }
}

// Formatos que se muestran como llave (sin tabla de posiciones ni líder).
function isBracketFormat(torneo) {
    return isKnockout(torneo) || isDouble(torneo);
}

// Lista plana de todos los partidos "reales" (sin TBD/BYE), jugados o no.
function allRealMatches(torneo) {
    let list;
    if (isKnockout(torneo)) list = torneo.bracket ? torneo.bracket.flat() : [];
    else if (isDouble(torneo)) list = deAllMatches(torneo.de);
    else if (isMulti(torneo)) {
        const gm = (torneo.groups || []).flatMap(g => g.matches);
        const pb = torneo.playoffBracket ? torneo.playoffBracket.flat() : [];
        list = [...gm, ...pb];
    } else list = torneo.matches || [];
    return list.filter(m => m.teamA && m.teamB
        && m.teamA !== 'BYE' && m.teamB !== 'BYE'
        && m.teamA !== 'TBD' && m.teamB !== 'TBD');
}

function playedMatches(torneo) {
    return allRealMatches(torneo).filter(m => m.scoreA != null && m.scoreB != null);
}

function hasFixture(torneo) {
    if (isKnockout(torneo)) return !!torneo.bracket;
    if (isDouble(torneo)) return !!torneo.de;
    if (isMulti(torneo)) return Array.isArray(torneo.groups) && torneo.groups.length > 0;
    return Array.isArray(torneo.matches) && torneo.matches.length > 0;
}

// Propaga un cambio de nombre de equipo a los partidos ya generados, sin
// perder los resultados cargados (a diferencia de invalidar todo el fixture).
function renameInFixture(torneo, oldName, newName) {
    const apply = (m) => {
        if (m.teamA === oldName) m.teamA = newName;
        if (m.teamB === oldName) m.teamB = newName;
    };
    if (torneo.bracket) torneo.bracket.forEach(round => round.forEach(apply));
    if (torneo.matches) torneo.matches.forEach(apply);
    if (torneo.de) {
        deAllMatches(torneo.de).forEach(m => {
            apply(m);
            if (m.a && m.a.seed === oldName) m.a.seed = newName;
            if (m.b && m.b.seed === oldName) m.b.seed = newName;
        });
        propagateDouble(torneo.de);
    }
    if (torneo.groups) {
        torneo.groups.forEach(g => {
            g.teamNames = g.teamNames.map(n => (n === oldName ? newName : n));
            g.matches.forEach(apply);
        });
    }
    if (torneo.playoffBracket) {
        torneo.playoffBracket.forEach(round => round.forEach(apply));
    }
    if (torneo.players) {
        torneo.players.forEach(p => { if (p.team === oldName) p.team = newName; });
    }
    if (torneo.swissByeByRound) {
        Object.keys(torneo.swissByeByRound).forEach(k => {
            if (torneo.swissByeByRound[k] === oldName) torneo.swissByeByRound[k] = newName;
        });
    }
}

// Config de la tabla de posiciones (puntos, desempates, columnas ocultas),
// con valores por defecto clásicos (3/1/0, desempate por DG y luego GF).
function stdConfig(torneo) {
    const c = (torneo && torneo.standingsConfig) || {};
    const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    return {
        win: num(c.win, 3),
        draw: num(c.draw, 1),
        loss: num(c.loss, 0),
        tiebreakers: (Array.isArray(c.tiebreakers) && c.tiebreakers.length) ? c.tiebreakers : ['dg', 'gf'],
        hidden: Array.isArray(c.hidden) ? c.hidden : []
    };
}

function tbValue(row, key) {
    if (key === 'dg') return row.gf - row.ga;
    if (key === 'gf') return row.gf;
    if (key === 'wins') return row.wins;
    return 0;
}

// Columnas de la tabla de posiciones. Equipo y Pts siempre se muestran;
// el resto se puede ocultar desde Ajustes (standingsConfig.hidden).
// Es una función (declaración, hoisted) para no caer en la TDZ de `const`
// cuando el panel se inicializa al principio del archivo.
function standingCols() {
    return [
        { key: 'played', label: 'PJ' },
        { key: 'wins', label: 'G' },
        { key: 'draws', label: 'E' },
        { key: 'losses', label: 'P' },
        { key: 'gf', label: 'GF' },
        { key: 'ga', label: 'GC' },
        { key: 'dg', label: 'DG', calc: r => r.gf - r.ga, fmt: v => (v > 0 ? '+' + v : String(v)) },
        { key: 'points', label: 'Pts', cls: 'standingsPts', always: true }
    ];
}

// Ordena por puntos y luego por los desempates configurados (y nombre al final).
function sortStandings(rows, cfg) {
    const tb = cfg.tiebreakers;
    return rows.sort((x, y) => {
        if (y.points !== x.points) return y.points - x.points;
        for (const k of tb) { const d = tbValue(y, k) - tbValue(x, k); if (d) return d; }
        return x.name.localeCompare(y.name);
    });
}

// Acumula el resultado de un partido en las filas a/b según la config de puntos.
function tallyMatch(a, b, sa, sb, cfg) {
    a.played++; b.played++;
    a.gf += sa; a.ga += sb; b.gf += sb; b.ga += sa;
    if (sa > sb) { a.wins++; a.points += cfg.win; b.losses++; b.points += cfg.loss; }
    else if (sb > sa) { b.wins++; b.points += cfg.win; a.losses++; a.points += cfg.loss; }
    else { a.draws++; b.draws++; a.points += cfg.draw; b.points += cfg.draw; }
}

function computeStandings(torneo) {
    const cfg = stdConfig(torneo);
    const table = new Map();
    (torneo.teams || []).forEach(t => {
        table.set(t.name, { name: t.name, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 });
    });
    playedMatches(torneo).forEach(m => {
        const a = table.get(m.teamA), b = table.get(m.teamB);
        if (!a || !b) return; // equipo renombrado/eliminado luego de generar
        tallyMatch(a, b, Number(m.scoreA), Number(m.scoreB), cfg);
    });
    // Descansos del sistema suizo: cuentan como victoria (según config), sin goles.
    if (torneo.swissByeByRound) {
        Object.values(torneo.swissByeByRound).forEach(name => {
            const row = table.get(name);
            if (row) { row.played++; row.wins++; row.points += cfg.win; }
        });
    }
    return sortStandings(Array.from(table.values()), cfg);
}

function initDetallePanel(torneo) {
    // Referencias que varias secciones necesitan; se asignan más abajo.
    let renderMatches = () => {};
    let renderStats = () => {};
    let renderScheduler = () => {};
    let renderTV = () => {};
    let renderRegistration = () => {};
    let renderPlayers = () => {};

    // Refresca todo lo que depende de equipos/resultados de una sola vez.
    const refreshAll = () => {
        renderMatches();
        renderStats();
        renderScheduler();
        renderTV();
        renderRegistration();
        renderPlayers();
    };

    // ─── Navegación lateral ───
    const navButtons = document.querySelectorAll('.detalleNavItem');
    const panels = document.querySelectorAll('.detallePanel');

    // ─── Sidebar del torneo (el toggle ☰ vive en el navbar) ───
    // El mismo botón cumple dos roles según el ancho:
    //   · Escritorio (>980px): colapsa/expande el riel lateral.
    //   · Móvil (≤980px): abre/cierra un drawer anclado al borde izquierdo.
    const collapseBtn = document.getElementById('detalleCollapseBtn');
    const sidebarOverlay = document.getElementById('detalleSidebarOverlay');
    const mobileMQ = window.matchMedia('(max-width: 980px)');

    const closeMobileSidebar = () => {
        detalleLayout.classList.remove('sidebarOpen');
        if (collapseBtn) {
            collapseBtn.setAttribute('aria-expanded', 'false');
            collapseBtn.setAttribute('aria-label', 'Abrir menú del torneo');
            collapseBtn.setAttribute('title', 'Abrir menú del torneo');
        }
    };

    if (collapseBtn) {
        // Estado ARIA inicial coherente con el ancho actual.
        if (mobileMQ.matches) collapseBtn.setAttribute('aria-expanded', 'false');

        collapseBtn.addEventListener('click', () => {
            if (mobileMQ.matches) {
                const open = detalleLayout.classList.toggle('sidebarOpen');
                collapseBtn.setAttribute('aria-expanded', String(open));
                const label = open ? 'Cerrar menú del torneo' : 'Abrir menú del torneo';
                collapseBtn.setAttribute('aria-label', label);
                collapseBtn.setAttribute('title', label);
            } else {
                const collapsed = detalleLayout.classList.toggle('sidebarCollapsed');
                collapseBtn.setAttribute('aria-expanded', String(!collapsed));
                const label = collapsed ? 'Expandir menú del torneo' : 'Colapsar menú del torneo';
                collapseBtn.setAttribute('aria-label', label);
                collapseBtn.setAttribute('title', label);
            }
        });
    }

    // Clic en el fondo oscuro cierra el drawer.
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    // Elegir una sección cierra el drawer en móvil.
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (mobileMQ.matches) closeMobileSidebar();
        });
    });

    // Al cruzar el breakpoint, limpiar el estado que no corresponde.
    mobileMQ.addEventListener('change', (e) => {
        if (e.matches) {
            // Entrando a móvil: el drawer siempre se muestra completo.
            detalleLayout.classList.remove('sidebarCollapsed');
            closeMobileSidebar();
        } else {
            // Volviendo a escritorio: cerrar el drawer y restablecer el riel.
            detalleLayout.classList.remove('sidebarOpen');
            if (collapseBtn) {
                collapseBtn.setAttribute('aria-expanded', 'true');
                collapseBtn.setAttribute('aria-label', 'Colapsar menú del torneo');
                collapseBtn.setAttribute('title', 'Colapsar menú del torneo');
            }
        }
    });

    // ─── Compartir torneo ───
    const shareBtn = document.getElementById('detalleShareBtn');
    const shareLabel = shareBtn ? shareBtn.querySelector('.detalleShareLabel') : null;

    // Copia texto al portapapeles con fallback para navegadores sin la API.
    const copyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                resolve();
            } catch (e) { reject(e); }
        });
    };

    const flashLabel = (el, temp, original, ms = 1600) => {
        if (!el) return;
        el.textContent = temp;
        setTimeout(() => { el.textContent = original; }, ms);
    };

    const shareTorneo = () => {
        const original = shareLabel ? shareLabel.textContent : '';
        copyToClipboard(window.location.href).catch(() => {}).finally(() => {
            flashLabel(shareLabel, '¡Copiado!', original);
        });
    };

    if (shareBtn) shareBtn.addEventListener('click', shareTorneo);

    // ─── Getting started (onboarding) ───
    const onboardingCard = document.getElementById('onboardingCard');
    const onboardingCloseBtn = document.getElementById('onboardingCloseBtn');

    if (onboardingCard) {
        onboardingCard.hidden = !!torneo.onboardingDismissed;

        document.querySelectorAll('.onboardingStep').forEach(step => {
            step.addEventListener('click', () => {
                const target = step.dataset.onboarding;
                if (target === 'share') {
                    shareTorneo();
                    return;
                }
                const navBtn = document.querySelector(`.detalleNavItem[data-panel="${target}"]`);
                if (navBtn) navBtn.click();
            });
        });

        if (onboardingCloseBtn) {
            onboardingCloseBtn.addEventListener('click', () => {
                torneo.onboardingDismissed = true;
                persist(torneo);
                onboardingCard.hidden = true;
            });
        }
    }

    // ─── Encabezado: nombre, sport, formato ───
    const nameEl = document.getElementById('detalleName');
    const sportChip = document.getElementById('detalleSportChip');
    const formatChip = document.getElementById('detalleFormatChip');
    const viewSport = document.getElementById('viewSport');
    const viewFormat = document.getElementById('viewFormat');
    const publicResultsLink = document.getElementById('publicResultsLink');

    const renderHeader = () => {
        nameEl.textContent = torneo.name;
        sportChip.textContent = torneo.sport;
        formatChip.textContent = torneo.format;
        if (viewSport) viewSport.textContent = torneo.sport;
        if (viewFormat) viewFormat.textContent = torneo.format;
    };
    renderHeader();

    if (publicResultsLink) publicResultsLink.href = `resultados.html?id=${torneo.id}`;

    const editNameBtn = document.getElementById('editNameBtn');
    const nameEditRow = document.getElementById('nameEditRow');
    const nameEditInput = document.getElementById('nameEditInput');
    const nameSaveBtn = document.getElementById('nameSaveBtn');
    const nameCancelBtn = document.getElementById('nameCancelBtn');

    editNameBtn.addEventListener('click', () => {
        nameEditInput.value = torneo.name;
        nameEl.hidden = true;
        editNameBtn.hidden = true;
        nameEditRow.hidden = false;
        nameEditInput.focus();
    });

    const closeNameEdit = () => {
        nameEl.hidden = false;
        editNameBtn.hidden = false;
        nameEditRow.hidden = true;
    };

    nameSaveBtn.addEventListener('click', () => {
        const newName = nameEditInput.value.trim();
        if (newName) torneo.name = newName;
        persist(torneo);
        renderHeader();
        closeNameEdit();
    });

    nameCancelBtn.addEventListener('click', closeNameEdit);

    // ─── Details block (sport + description) ───
    const viewDescription = document.getElementById('viewDescription');
    const editDescription = document.getElementById('editDescription');
    const detailsActions = document.getElementById('detailsActions');
    const editDetailsBtn = document.querySelector('[data-edit="details"]');

    const renderDetails = () => {
        viewDescription.textContent = torneo.description || 'Agregar una descripción';
    };
    renderDetails();

    const openDetailsEdit = () => {
        editDescription.value = torneo.description || '';
        viewDescription.hidden = true;
        editDescription.hidden = false;
        detailsActions.hidden = false;
        editDetailsBtn.hidden = true;
    };

    const closeDetailsEdit = () => {
        viewDescription.hidden = false;
        editDescription.hidden = true;
        detailsActions.hidden = true;
        editDetailsBtn.hidden = false;
    };

    editDetailsBtn.addEventListener('click', openDetailsEdit);
    document.querySelector('[data-cancel="details"]').addEventListener('click', closeDetailsEdit);
    document.querySelector('[data-save="details"]').addEventListener('click', () => {
        torneo.description = editDescription.value.trim();
        persist(torneo);
        renderDetails();
        closeDetailsEdit();
    });

    // ─── Tournament Settings block (legs, placements, visibility) ───
    const viewLegs = document.getElementById('viewLegs');
    const editLegs = document.getElementById('editLegs');
    const viewPlacements = document.getElementById('viewPlacements');
    const editPlacements = document.getElementById('editPlacements');
    const viewVisibility = document.getElementById('viewVisibility');
    const editVisibility = document.getElementById('editVisibility');
    const settingsActions = document.getElementById('settingsActions');
    const editSettingsBtn = document.querySelector('[data-edit="settings"]');

    const VISIBILITY_LABELS = { public: 'Público', private: 'Privado' };

    const renderSettings = () => {
        viewLegs.textContent = torneo.legs;
        viewPlacements.textContent = torneo.placements;
        viewVisibility.textContent = VISIBILITY_LABELS[torneo.visibility] || torneo.visibility;
    };
    renderSettings();

    const settingsFields = [
        [viewLegs, editLegs],
        [viewPlacements, editPlacements],
        [viewVisibility, editVisibility]
    ];

    const openSettingsEdit = () => {
        editLegs.value = torneo.legs;
        editPlacements.value = torneo.placements;
        editVisibility.value = torneo.visibility;
        settingsFields.forEach(([view, edit]) => { view.hidden = true; edit.hidden = false; });
        settingsActions.hidden = false;
        editSettingsBtn.hidden = true;
    };

    const closeSettingsEdit = () => {
        settingsFields.forEach(([view, edit]) => { view.hidden = false; edit.hidden = true; });
        settingsActions.hidden = true;
        editSettingsBtn.hidden = false;
    };

    editSettingsBtn.addEventListener('click', openSettingsEdit);
    document.querySelector('[data-cancel="settings"]').addEventListener('click', closeSettingsEdit);
    document.querySelector('[data-save="settings"]').addEventListener('click', () => {
        const legsVal = parseInt(editLegs.value, 10);
        torneo.legs = legsVal > 0 ? legsVal : 1;
        torneo.placements = editPlacements.value.trim() || torneo.placements;
        torneo.visibility = editVisibility.value;
        persist(torneo);
        renderSettings();
        closeSettingsEdit();
    });

    // ─── Estado del torneo (Borrador / Activo / Eliminar) ───
    const STATUS_LABELS_DETALLE = { activo: 'Activo', borrador: 'Borrador', finalizado: 'Finalizado' };
    const viewStatusBadge = document.getElementById('viewStatusBadge');
    const toggleStatusBtn = document.getElementById('toggleStatusBtn');
    const deleteTorneoBtn = document.getElementById('deleteTorneoBtn');
    const confirmOverlay = document.getElementById('confirmOverlay');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    const renderStatus = () => {
        viewStatusBadge.className = `torneoBadge ${torneo.status}`;
        viewStatusBadge.textContent = STATUS_LABELS_DETALLE[torneo.status] || torneo.status;
        toggleStatusBtn.textContent = torneo.status === 'activo' ? 'Volver a borrador' : 'Activar torneo';
    };
    renderStatus();

    toggleStatusBtn.addEventListener('click', () => {
        torneo.status = torneo.status === 'activo' ? 'borrador' : 'activo';
        persist(torneo);
        renderStatus();
    });

    const openConfirmDelete = () => {
        confirmOverlay.hidden = false;
        document.body.classList.add('modalOpen');
    };

    const closeConfirmDelete = () => {
        confirmOverlay.hidden = true;
        document.body.classList.remove('modalOpen');
    };

    deleteTorneoBtn.addEventListener('click', openConfirmDelete);
    confirmCancelBtn.addEventListener('click', closeConfirmDelete);
    confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) closeConfirmDelete();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !confirmOverlay.hidden) closeConfirmDelete();
    });
    confirmDeleteBtn.addEventListener('click', () => {
        torneos.splice(torneoIndex, 1);
        saveTorneos(torneos);
        window.location.href = 'mistorneos.html';
    });

    // ─── Teams ───
    const teamsList = document.getElementById('teamsList');
    const addTeamBtn = document.getElementById('addTeamBtn');
    const MIN_TEAMS = 2;

    // Al cambiar la cantidad de equipos, el fixture generado queda inválido:
    // se descarta para forzar a regenerarlo con los equipos actuales.
    const invalidateFixture = () => {
        let changed = false;
        if (torneo.bracket) { torneo.bracket = null; changed = true; }
        if (torneo.matches) { torneo.matches = null; changed = true; }
        persist(torneo);
        if (changed) refreshAll();
    };

    const addTeam = () => {
        torneo.teams.push({ id: Date.now(), name: `Team ${torneo.teams.length + 1}` });
        torneo.participants = torneo.teams.length;
        persist(torneo);
        invalidateFixture();
        renderTeams();
    };

    const renderTeams = () => {
        teamsList.innerHTML = '';
        torneo.teams.forEach((team, idx) => {
            const row = document.createElement('div');
            row.className = 'teamRow';

            const label = document.createElement('span');
            label.className = 'teamRowIndex';
            label.textContent = idx + 1;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'authInput';
            input.value = team.name;
            input.addEventListener('change', () => {
                const oldName = torneo.teams[idx].name;
                const newName = input.value.trim() || `Team ${idx + 1}`;
                input.value = newName;
                if (newName === oldName) return;
                torneo.teams[idx].name = newName;
                // Actualiza el nombre en los partidos ya generados conservando
                // los resultados (no hace falta regenerar el fixture).
                renameInFixture(torneo, oldName, newName);
                persist(torneo);
                refreshAll();
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'teamRowRemove';
            removeBtn.setAttribute('aria-label', `Quitar ${team.name}`);
            removeBtn.textContent = '✕';
            removeBtn.disabled = torneo.teams.length <= MIN_TEAMS;
            removeBtn.addEventListener('click', () => {
                if (torneo.teams.length <= MIN_TEAMS) return;
                const removed = torneo.teams[idx].name;
                torneo.teams.splice(idx, 1);
                torneo.participants = torneo.teams.length;
                if (torneo.players) torneo.players = torneo.players.filter(p => p.team !== removed);
                persist(torneo);
                invalidateFixture();
                renderTeams();
                renderPlayers();
            });

            row.append(label, input, removeBtn);
            teamsList.appendChild(row);
        });
    };
    renderTeams();

    if (addTeamBtn) addTeamBtn.addEventListener('click', addTeam);

    // ─── Matches (bracket knockout con avance / liga todos contra todos) ───
    const generateBtn = document.getElementById('generateBracketBtn');
    const matchesHint = document.getElementById('matchesHint');
    const matchesEmpty = document.getElementById('matchesEmpty');
    const bracketWrap = document.getElementById('bracketWrap');
    const leagueWrap = document.getElementById('leagueWrap');
    const championBanner = document.getElementById('championBanner');

    // Sincroniza brackets creados antes de existir el avance de ganadores:
    // recalcula qué equipo va en cada ronda a partir de los resultados guardados.
    if (isKnockout(torneo) && torneo.bracket) {
        propagateBracket(torneo.bracket);
        persist(torneo);
    }
    if (isDouble(torneo) && torneo.de) {
        propagateDouble(torneo.de);
        persist(torneo);
    }
    if (isMulti(torneo) && torneo.playoffBracket) {
        propagateBracket(torneo.playoffBracket);
        persist(torneo);
    }

    // Crea un input de resultado para un partido concreto y su callback.
    const makeScoreInput = (match, scoreKey, onChange) => {
        const sets = isSetsScoring(torneo);
        const cap = sets ? setsToWin(torneo) : Infinity;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        if (sets) input.max = String(cap);
        input.className = 'bracketScoreInput';
        input.value = match[scoreKey] != null ? match[scoreKey] : '';
        const teamName = match[scoreKey === 'scoreA' ? 'teamA' : 'teamB'];
        input.setAttribute('aria-label', `${sets ? 'Sets ganados' : 'Resultado'} de ${teamName}`);
        input.addEventListener('change', () => {
            const raw = input.value.trim();
            match[scoreKey] = raw === '' ? undefined : Math.max(0, Math.min(cap, parseInt(raw, 10) || 0));
            if (match[scoreKey] != null) input.value = match[scoreKey];
            if (match.scoreA != null && match.scoreB != null) match.playedAt = new Date().toISOString();
            else match.playedAt = undefined;
            onChange();
        });
        return input;
    };

    // Celda de partido de llave reutilizable (knockout y doble eliminación).
    const buildBracketMatchCell = (match, onChange) => {
        const matchEl = document.createElement('div');
        matchEl.className = 'bracketMatch';

        const playable = match.teamA !== 'BYE' && match.teamB !== 'BYE'
            && match.teamA !== 'TBD' && match.teamB !== 'TBD';
        const winner = matchWinner(match);

        [['teamA', 'scoreA'], ['teamB', 'scoreB']].forEach(([teamKey, scoreKey]) => {
            const teamRow = document.createElement('div');
            teamRow.className = 'bracketMatchTeam';
            if (winner && match[teamKey] === winner) teamRow.classList.add('bracketMatchWinner');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'bracketTeamName';
            nameSpan.textContent = match[teamKey];
            teamRow.appendChild(nameSpan);

            if (playable) teamRow.appendChild(makeScoreInput(match, scoreKey, onChange));
            matchEl.appendChild(teamRow);
        });
        return matchEl;
    };

    // Renderiza un arreglo de rondas (columnas) en un contenedor.
    const renderRoundsInto = (container, rounds, labelFn, onChange) => {
        rounds.forEach((round, roundIdx) => {
            const col = document.createElement('div');
            col.className = 'bracketRound';
            const heading = document.createElement('h3');
            heading.textContent = labelFn(roundIdx, rounds.length);
            col.appendChild(heading);
            round.forEach(match => col.appendChild(buildBracketMatchCell(match, onChange)));
            container.appendChild(col);
        });
    };

    const renderBracket = () => {
        bracketWrap.innerHTML = '';
        bracketWrap.classList.remove('deMode');
        if (!torneo.bracket) return;
        const onChange = () => { propagateBracket(torneo.bracket); persist(torneo); refreshAll(); };
        renderRoundsInto(
            bracketWrap, torneo.bracket,
            (i, n) => (i === n - 1 ? 'Final' : `Ronda ${i + 1}`),
            onChange
        );
    };

    const renderDouble = () => {
        bracketWrap.innerHTML = '';
        bracketWrap.classList.add('deMode');
        const de = torneo.de;
        if (!de) return;
        const onChange = () => { propagateDouble(de); persist(torneo); refreshAll(); };

        const section = (title, buildBody) => {
            const wrap = document.createElement('div');
            wrap.className = 'deSection';
            const h = document.createElement('h4');
            h.className = 'deSectionTitle';
            h.textContent = title;
            wrap.appendChild(h);
            const cols = document.createElement('div');
            cols.className = 'bracketWrap deColumns';
            buildBody(cols);
            wrap.appendChild(cols);
            bracketWrap.appendChild(wrap);
        };

        section('Llave de ganadores', (cols) => {
            renderRoundsInto(cols, de.W, (i, n) => (i === n - 1 ? 'Final de ganadores' : `Ronda ${i + 1}`), onChange);
        });
        section('Llave de perdedores', (cols) => {
            renderRoundsInto(cols, de.L, (i, n) => (i === n - 1 ? 'Final de perdedores' : `Ronda ${i + 1}`), onChange);
        });
        section('Gran final', (cols) => {
            const col = document.createElement('div');
            col.className = 'bracketRound';
            const h = document.createElement('h3');
            h.textContent = 'Final';
            col.appendChild(h);
            col.appendChild(buildBracketMatchCell(de.GF[0], onChange));
            if (de.GF[1].active) {
                const h2 = document.createElement('h3');
                h2.textContent = 'Reset (2ª final)';
                col.appendChild(h2);
                col.appendChild(buildBracketMatchCell(de.GF[1], onChange));
            }
            cols.appendChild(col);
        });
    };

    // Fila de partido reutilizable (liga y sistema suizo).
    const buildMatchRow = (match) => {
        const row = document.createElement('div');
        row.className = 'leagueMatch';

        const teamA = document.createElement('span');
        teamA.className = 'leagueTeam leagueTeamA';
        teamA.textContent = match.teamA;

        const score = document.createElement('div');
        score.className = 'leagueScore';
        score.appendChild(makeScoreInput(match, 'scoreA', () => { persist(torneo); refreshAll(); }));
        const dash = document.createElement('span');
        dash.textContent = '–';
        score.appendChild(dash);
        score.appendChild(makeScoreInput(match, 'scoreB', () => { persist(torneo); refreshAll(); }));

        const teamB = document.createElement('span');
        teamB.className = 'leagueTeam leagueTeamB';
        teamB.textContent = match.teamB;

        const winner = matchWinner(match);
        if (winner === match.teamA) teamA.classList.add('leagueWinner');
        if (winner === match.teamB) teamB.classList.add('leagueWinner');

        row.append(teamA, score, teamB);
        return row;
    };

    const renderLeague = () => {
        leagueWrap.innerHTML = '';
        if (!torneo.matches || !torneo.matches.length) return;

        // Tabla de posiciones arriba del fixture.
        if (playedMatches(torneo).length) {
            leagueWrap.appendChild(buildStandingsTable(computeStandings(torneo)));
        }

        const list = document.createElement('div');
        list.className = 'leagueMatches';
        torneo.matches.forEach(match => list.appendChild(buildMatchRow(match)));
        leagueWrap.appendChild(list);
    };

    const renderSwiss = () => {
        leagueWrap.innerHTML = '';
        if (!torneo.matches || !torneo.matches.length) return;

        if (playedMatches(torneo).length) {
            leagueWrap.appendChild(buildStandingsTable(computeStandings(torneo)));
        }

        const rounds = swissCurrentRound(torneo);
        for (let r = 1; r <= rounds; r++) {
            const section = document.createElement('div');
            section.className = 'swissRound';

            const heading = document.createElement('h3');
            heading.textContent = `Ronda ${r}`;
            section.appendChild(heading);

            const list = document.createElement('div');
            list.className = 'leagueMatches';
            torneo.matches
                .filter(m => (m.round || 1) === r)
                .forEach(match => list.appendChild(buildMatchRow(match)));
            section.appendChild(list);

            const byeName = torneo.swissByeByRound && torneo.swissByeByRound[r];
            if (byeName) {
                const bye = document.createElement('p');
                bye.className = 'swissBye';
                bye.textContent = `Descansa: ${byeName} (victoria automática)`;
                section.appendChild(bye);
            }
            leagueWrap.appendChild(section);
        }

        // Botón para generar la siguiente ronda.
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'btn btnPrimary swissNextBtn';
        if (rounds >= swissMaxRounds(torneo)) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Todas las rondas generadas';
        } else if (!swissRoundComplete(torneo, rounds)) {
            nextBtn.disabled = true;
            nextBtn.textContent = `Completá la Ronda ${rounds} para continuar`;
        } else {
            nextBtn.textContent = `Generar Ronda ${rounds + 1}`;
            nextBtn.addEventListener('click', () => {
                buildSwissNextRound(torneo);
                persist(torneo);
                refreshAll();
            });
        }
        leagueWrap.appendChild(nextBtn);
    };

    // Tabla de posiciones de un grupo (multi-etapa).
    const buildGroupStandingsTable = (standings) => buildStandingsTable(standings);

    const renderMulti = () => {
        leagueWrap.innerHTML = '';
        if (!torneo.groups) return;

        // Fase de grupos: cada grupo con su tabla y sus partidos.
        torneo.groups.forEach(group => {
            const section = document.createElement('div');
            section.className = 'msGroup';

            const heading = document.createElement('h3');
            heading.className = 'msGroupTitle';
            heading.textContent = group.name;
            section.appendChild(heading);

            if (group.matches.some(m => m.scoreA != null && m.scoreB != null)) {
                section.appendChild(buildGroupStandingsTable(computeStandingsFrom(group.teamNames, group.matches, stdConfig(torneo))));
            }

            const list = document.createElement('div');
            list.className = 'leagueMatches';
            group.matches.forEach(match => list.appendChild(buildMatchRow(match)));
            section.appendChild(list);
            leagueWrap.appendChild(section);
        });

        // Playoffs.
        if (torneo.playoffBracket) {
            const poSection = document.createElement('div');
            poSection.className = 'msGroup msPlayoffs';
            const h = document.createElement('h3');
            h.className = 'msGroupTitle';
            h.textContent = 'Playoffs';
            poSection.appendChild(h);

            const cols = document.createElement('div');
            cols.className = 'bracketWrap';
            const onChange = () => { propagateBracket(torneo.playoffBracket); persist(torneo); refreshAll(); };
            renderRoundsInto(cols, torneo.playoffBracket, (i, n) => (i === n - 1 ? 'Final' : `Ronda ${i + 1}`), onChange);
            poSection.appendChild(cols);

            const regen = document.createElement('button');
            regen.type = 'button';
            regen.className = 'btn btnSecondary msRegenBtn';
            regen.textContent = 'Regenerar playoffs desde los grupos';
            regen.addEventListener('click', () => { generatePlayoffs(torneo); persist(torneo); refreshAll(); });
            poSection.appendChild(regen);
            leagueWrap.appendChild(poSection);
        } else {
            const genBtn = document.createElement('button');
            genBtn.type = 'button';
            genBtn.className = 'btn btnPrimary msGenBtn';
            if (groupsComplete(torneo)) {
                genBtn.textContent = 'Generar playoffs';
                genBtn.addEventListener('click', () => { generatePlayoffs(torneo); persist(torneo); refreshAll(); });
            } else {
                genBtn.disabled = true;
                genBtn.textContent = 'Completá todos los grupos para generar los playoffs';
            }
            leagueWrap.appendChild(genBtn);
        }
    };

    const renderChampion = () => {
        if (!championBanner) return;
        const champ = tournamentChampion(torneo);
        if (champ) {
            championBanner.hidden = false;
            championBanner.innerHTML = `<span class="championIcon" aria-hidden="true">🏆</span> Campeón: <strong>${champ}</strong>`;
        } else {
            championBanner.hidden = true;
            championBanner.innerHTML = '';
        }
    };

    renderMatches = () => {
        const knockout = isKnockout(torneo);
        const swiss = isSwiss(torneo);
        const double = isDouble(torneo);
        const multi = isMulti(torneo);
        generateBtn.textContent = hasFixture(torneo)
            ? (knockout ? 'Regenerar bracket' : double ? 'Regenerar llaves' : multi ? 'Regenerar grupos' : swiss ? 'Reiniciar torneo suizo' : 'Regenerar fixture')
            : (knockout ? 'Generar bracket' : double ? 'Generar llaves' : multi ? 'Generar grupos' : swiss ? 'Generar Ronda 1' : 'Generar fixture');

        matchesHint.textContent = knockout
            ? 'Cargá los resultados de cada ronda: el ganador avanza automáticamente hasta la final.'
            : double
                ? 'Doble eliminación: quien pierde en la llave de ganadores baja a la de perdedores. Perdés dos veces y quedás afuera.'
                : multi
                    ? 'Fase de grupos y luego playoffs. Completá todos los grupos y generá la llave con los mejores de cada uno.'
                    : swiss
                        ? 'Sistema suizo: cada ronda te enfrenta a rivales de puntaje parecido. Cargá los resultados y generá la siguiente ronda.'
                        : 'Todos contra todos. Cargá cada resultado y la tabla se actualiza sola.';

        if (isSetsScoring(torneo)) {
            matchesHint.textContent += ` Marcador por sets (al mejor de ${setsBestOf(torneo)}): cargá los sets ganados por cada uno.`;
        }

        if (!hasFixture(torneo)) {
            matchesEmpty.hidden = false;
            bracketWrap.innerHTML = '';
            leagueWrap.innerHTML = '';
            renderChampion();
            return;
        }
        matchesEmpty.hidden = true;
        if (isBracketFormat(torneo)) {
            leagueWrap.innerHTML = '';
            if (double) renderDouble();
            else renderBracket();
        } else {
            bracketWrap.innerHTML = '';
            if (multi) renderMulti();
            else if (swiss) renderSwiss();
            else renderLeague();
        }
        renderChampion();
    };

    generateBtn.addEventListener('click', () => {
        torneo.bracket = null;
        torneo.matches = null;
        torneo.de = null;
        torneo.swissByeByRound = undefined;
        torneo.groups = null;
        torneo.playoffBracket = null;
        if (isKnockout(torneo)) torneo.bracket = buildBracket(torneo.teams);
        else if (isDouble(torneo)) torneo.de = buildDouble(torneo.teams);
        else if (isMulti(torneo)) torneo.groups = buildGroups(torneo);
        else if (isSwiss(torneo)) buildSwissRoundOne(torneo);
        else torneo.matches = buildLeague(torneo.teams);
        persist(torneo);
        refreshAll();
    });

    // Construye una tabla de posiciones reutilizable (Matches, Stats, TV),
    // respetando las columnas ocultas configuradas en Ajustes.
    function buildStandingsTable(standings) {
        const hidden = stdConfig(torneo).hidden;
        const cols = standingCols().filter(c => c.always || !hidden.includes(c.key));
        // En modo sets, GF/GC/DG representan sets ganados/perdidos.
        const sets = isSetsScoring(torneo);
        const labelOf = (c) => (sets && { gf: 'SG', ga: 'SP', dg: '±S' }[c.key]) || c.label;

        const wrap = document.createElement('div');
        wrap.className = 'detalleStandingsWrap';
        const table = document.createElement('table');
        table.className = 'detalleStandings';

        const thead = document.createElement('thead');
        thead.innerHTML = `<tr><th class="standingsTeamCol">Equipo</th>`
            + cols.map(c => `<th class="${c.cls || ''}">${labelOf(c)}</th>`).join('')
            + `</tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        standings.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="standingsTeamCol">${row.name}</td>`
                + cols.map(c => {
                    const v = c.calc ? c.calc(row) : row[c.key];
                    return `<td class="${c.cls || ''}">${c.fmt ? c.fmt(v) : v}</td>`;
                }).join('');
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        return wrap;
    }

    // ─── Stats ───
    const statsSummary = document.getElementById('statsSummary');
    const statsStandingsWrap = document.getElementById('statsStandingsWrap');
    const statsStandingsBody = document.getElementById('statsStandingsBody');
    const statsEmpty = document.getElementById('statsEmpty');

    renderStats = () => {
        const played = playedMatches(torneo);
        const goals = played.reduce((acc, m) => acc + Number(m.scoreA) + Number(m.scoreB), 0);
        const champ = tournamentChampion(torneo);
        const standings = computeStandings(torneo);
        const leader = (showsGlobalStandings(torneo) && played.length) ? standings[0].name : null;

        const cards = [
            { label: 'Equipos', value: torneo.teams.length },
            { label: 'Partidos jugados', value: played.length },
            { label: 'Goles/puntos', value: goals }
        ];
        if (champ) cards.push({ label: 'Campeón', value: champ, highlight: true });
        else if (leader) cards.push({ label: 'Líder', value: leader, highlight: true });

        const scorers = topScorers(torneo);
        if (scorers.length) cards.push({ label: `Goleador (${scorers[0].goals})`, value: scorers[0].name });

        statsSummary.innerHTML = '';
        cards.forEach(c => {
            const el = document.createElement('div');
            el.className = 'statCard' + (c.highlight ? ' statCardHighlight' : '');
            el.innerHTML = `<span class="statCardValue">${c.value}</span><span class="statCardLabel">${c.label}</span>`;
            statsSummary.appendChild(el);
        });

        // Tabla completa solo para formatos con tabla global (liga/suizo).
        if (showsGlobalStandings(torneo) && played.length) {
            statsStandingsWrap.hidden = false;
            // Reemplaza la tabla previa por una respetando puntos/columnas configurados.
            statsStandingsWrap.querySelectorAll('.detalleStandingsWrap').forEach(e => e.remove());
            statsStandingsWrap.appendChild(buildStandingsTable(standings));
        } else {
            statsStandingsWrap.hidden = true;
        }

        statsEmpty.hidden = played.length > 0;
    };

    // ─── Jugadores (estadísticas por jugador) ───
    const playerNameInput = document.getElementById('playerNameInput');
    const playerTeamSelect = document.getElementById('playerTeamSelect');
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    const playersEmpty = document.getElementById('playersEmpty');
    const playersTableWrap = document.getElementById('playersTableWrap');
    const playersTableBody = document.getElementById('playersTableBody');
    const scorersWrap = document.getElementById('scorersWrap');
    const scorersList = document.getElementById('scorersList');

    if (!Array.isArray(torneo.players)) torneo.players = [];

    const STAT_KEYS = ['goals', 'assists', 'yellow', 'red'];

    const makeStatInput = (player, key) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.className = 'bracketScoreInput playerStatInput';
        input.value = player[key] || 0;
        input.setAttribute('aria-label', `${key} de ${player.name}`);
        input.addEventListener('change', () => {
            player[key] = Math.max(0, parseInt(input.value, 10) || 0);
            input.value = player[key];
            persist(torneo);
            renderPlayers();
            renderStats();
        });
        return input;
    };

    renderPlayers = () => {
        if (!playerTeamSelect) return;

        // Opciones del select de equipo (conservando la selección si sigue vigente).
        const current = playerTeamSelect.value;
        playerTeamSelect.innerHTML = '';
        torneo.teams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.textContent = t.name;
            playerTeamSelect.appendChild(opt);
        });
        if ([...playerTeamSelect.options].some(o => o.value === current)) playerTeamSelect.value = current;

        const players = torneo.players;
        playersEmpty.hidden = players.length > 0;
        playersTableWrap.hidden = players.length === 0;

        playersTableBody.innerHTML = '';
        players.forEach((p, idx) => {
            const tr = document.createElement('tr');
            const nameTd = document.createElement('td');
            nameTd.className = 'standingsTeamCol';
            nameTd.textContent = p.name;
            const teamTd = document.createElement('td');
            teamTd.className = 'playerTeamCell';
            teamTd.textContent = p.team;
            tr.append(nameTd, teamTd);

            STAT_KEYS.forEach(key => {
                const td = document.createElement('td');
                td.appendChild(makeStatInput(p, key));
                tr.appendChild(td);
            });

            const delTd = document.createElement('td');
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'teamRowRemove';
            del.textContent = '✕';
            del.setAttribute('aria-label', `Quitar ${p.name}`);
            del.addEventListener('click', () => {
                torneo.players.splice(idx, 1);
                persist(torneo);
                renderPlayers();
                renderStats();
            });
            delTd.appendChild(del);
            tr.appendChild(delTd);
            playersTableBody.appendChild(tr);
        });

        // Tabla de goleadores.
        const scorers = topScorers(torneo);
        scorersWrap.hidden = scorers.length === 0;
        scorersList.innerHTML = '';
        scorers.slice(0, 10).forEach((p, i) => {
            const row = document.createElement('div');
            row.className = 'scorerRow';
            row.innerHTML = `<span class="scorerRank">${i + 1}</span>`
                + `<span class="scorerName">${p.name}</span>`
                + `<span class="scorerTeam">${p.team}</span>`
                + `<span class="scorerGoals">${p.goals}<span class="scorerGoalsUnit">goles</span></span>`;
            scorersList.appendChild(row);
        });
    };

    const addPlayer = () => {
        const name = (playerNameInput.value || '').trim();
        const team = playerTeamSelect.value;
        if (!name || !team) return;
        torneo.players.push({ id: Date.now(), name, team, goals: 0, assists: 0, yellow: 0, red: 0 });
        playerNameInput.value = '';
        persist(torneo);
        renderPlayers();
    };
    if (addPlayerBtn) addPlayerBtn.addEventListener('click', addPlayer);
    if (playerNameInput) playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPlayer(); } });

    // ─── TV (vista de solo lectura) ───
    const tvContent = document.getElementById('tvContent');
    const tvEmpty = document.getElementById('tvEmpty');
    const tvOpenPublic = document.getElementById('tvOpenPublic');
    if (tvOpenPublic) tvOpenPublic.href = `resultados.html?id=${torneo.id}`;

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
    };

    renderTV = () => {
        const played = playedMatches(torneo);
        tvContent.innerHTML = '';
        if (!played.length) {
            tvEmpty.hidden = false;
            return;
        }
        tvEmpty.hidden = true;

        const champ = tournamentChampion(torneo);
        if (champ) {
            const banner = document.createElement('div');
            banner.className = 'championBanner';
            banner.innerHTML = `<span class="championIcon" aria-hidden="true">🏆</span> Campeón: <strong>${champ}</strong>`;
            tvContent.appendChild(banner);
        }
        if (showsGlobalStandings(torneo)) {
            tvContent.appendChild(buildStandingsTable(computeStandings(torneo)));
        }

        const recent = played.slice().sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || '')).slice(0, 6);
        const list = document.createElement('div');
        list.className = 'tvResults';
        recent.forEach(m => {
            const row = document.createElement('div');
            row.className = 'tvResultRow';
            row.innerHTML = `<span>${m.teamA} <strong>${m.scoreA} - ${m.scoreB}</strong> ${m.teamB}</span><span class="tvResultDate">${formatDate(m.playedAt)}</span>`;
            list.appendChild(row);
        });
        tvContent.appendChild(list);
    };

    // ─── Inscripciones ───
    const registrationLink = document.getElementById('registrationLink');
    const copyRegistrationLink = document.getElementById('copyRegistrationLink');
    const registrationCount = document.getElementById('registrationCount');
    const registrationAddTeam = document.getElementById('registrationAddTeam');

    if (registrationLink) registrationLink.value = window.location.href;

    renderRegistration = () => {
        if (registrationCount) registrationCount.textContent = torneo.teams.length;
    };

    if (copyRegistrationLink) {
        copyRegistrationLink.addEventListener('click', () => {
            const original = copyRegistrationLink.textContent;
            copyToClipboard(registrationLink.value).catch(() => {}).finally(() => {
                flashLabel(copyRegistrationLink, '¡Copiado!', original);
            });
        });
    }
    if (registrationAddTeam) {
        registrationAddTeam.addEventListener('click', () => {
            addTeam();
            flashLabel(registrationAddTeam, 'Equipo agregado ✓', '+ Agregar equipo');
        });
    }

    // ─── Calendario (fecha/hora por partido) ───
    const schedulerList = document.getElementById('schedulerList');
    const schedulerEmpty = document.getElementById('schedulerEmpty');

    renderScheduler = () => {
        const matches = allRealMatches(torneo);
        schedulerList.innerHTML = '';
        if (!matches.length) {
            schedulerEmpty.hidden = false;
            return;
        }
        schedulerEmpty.hidden = true;
        matches.forEach(match => {
            const row = document.createElement('div');
            row.className = 'schedulerRow';

            const teams = document.createElement('span');
            teams.className = 'schedulerTeams';
            teams.textContent = `${match.teamA} vs ${match.teamB}`;

            const input = document.createElement('input');
            input.type = 'datetime-local';
            input.className = 'authInput schedulerInput';
            if (match.scheduledAt) input.value = match.scheduledAt;
            input.addEventListener('change', () => {
                match.scheduledAt = input.value || undefined;
                persist(torneo);
            });

            row.append(teams, input);
            schedulerList.appendChild(row);
        });
    };

    // ─── Accesos (co-organizadores, demo local) ───
    const collaboratorEmail = document.getElementById('collaboratorEmail');
    const collaboratorAdd = document.getElementById('collaboratorAdd');
    const collaboratorList = document.getElementById('collaboratorList');
    const collaboratorEmpty = document.getElementById('collaboratorEmpty');
    const collaboratorError = document.getElementById('collaboratorError');

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const renderCollaborators = () => {
        collaboratorList.innerHTML = '';
        const list = torneo.collaborators || [];
        collaboratorEmpty.hidden = list.length > 0;
        list.forEach((email, idx) => {
            const row = document.createElement('div');
            row.className = 'collaboratorRow';

            const span = document.createElement('span');
            span.className = 'collaboratorEmailText';
            span.textContent = email;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'teamRowRemove';
            remove.setAttribute('aria-label', `Quitar ${email}`);
            remove.textContent = '✕';
            remove.addEventListener('click', () => {
                torneo.collaborators.splice(idx, 1);
                persist(torneo);
                renderCollaborators();
            });

            row.append(span, remove);
            collaboratorList.appendChild(row);
        });
    };

    if (collaboratorAdd) {
        collaboratorAdd.addEventListener('click', () => {
            const email = (collaboratorEmail.value || '').trim().toLowerCase();
            collaboratorError.hidden = true;
            if (!EMAIL_RE.test(email)) {
                collaboratorError.textContent = 'Ingresá un correo válido.';
                collaboratorError.hidden = false;
                return;
            }
            if (!torneo.collaborators) torneo.collaborators = [];
            if (torneo.collaborators.includes(email)) {
                collaboratorError.textContent = 'Ese correo ya está invitado.';
                collaboratorError.hidden = false;
                return;
            }
            torneo.collaborators.push(email);
            persist(torneo);
            collaboratorEmail.value = '';
            renderCollaborators();
        });
    }
    renderCollaborators();

    // ─── Personalizar posiciones ───
    const stdWin = document.getElementById('stdWin');
    const stdDraw = document.getElementById('stdDraw');
    const stdLoss = document.getElementById('stdLoss');
    const stdTiebreak = document.getElementById('stdTiebreak');
    const stdColChecks = [...document.querySelectorAll('.stdConfigCols input[data-col]')];

    if (stdWin) {
        // Carga inicial de los controles desde la config vigente.
        const cfg = stdConfig(torneo);
        stdWin.value = cfg.win;
        stdDraw.value = cfg.draw;
        stdLoss.value = cfg.loss;
        stdTiebreak.value = cfg.tiebreakers[0] || 'dg';
        stdColChecks.forEach(chk => { chk.checked = !cfg.hidden.includes(chk.dataset.col); });

        const secondaryFor = (primary) => {
            if (primary === 'dg') return ['dg', 'gf'];
            if (primary === 'gf') return ['gf', 'dg'];
            return ['wins', 'dg', 'gf']; // victorias
        };

        const saveStdConfig = () => {
            const num = (el, d) => (Number.isFinite(Number(el.value)) && el.value !== '' ? Number(el.value) : d);
            torneo.standingsConfig = {
                win: num(stdWin, 3),
                draw: num(stdDraw, 1),
                loss: num(stdLoss, 0),
                tiebreakers: secondaryFor(stdTiebreak.value),
                hidden: stdColChecks.filter(chk => !chk.checked).map(chk => chk.dataset.col)
            };
            persist(torneo);
            refreshAll();
        };

        [stdWin, stdDraw, stdLoss].forEach(el => el.addEventListener('change', saveStdConfig));
        stdTiebreak.addEventListener('change', saveStdConfig);
        stdColChecks.forEach(chk => chk.addEventListener('change', saveStdConfig));
    }

    // ─── Marcador (simple / por sets) ───
    const scoringMode = document.getElementById('scoringMode');
    const setsBestOfSel = document.getElementById('setsBestOf');
    const setsBestOfRow = document.getElementById('setsBestOfRow');

    if (scoringMode) {
        scoringMode.value = isSetsScoring(torneo) ? 'sets' : 'simple';
        setsBestOfSel.value = String(setsBestOf(torneo));
        setsBestOfRow.hidden = scoringMode.value !== 'sets';

        const saveScoring = () => {
            torneo.scoring = scoringMode.value === 'sets' ? 'sets' : 'simple';
            torneo.setsBestOf = Number(setsBestOfSel.value) === 5 ? 5 : 3;
            setsBestOfRow.hidden = torneo.scoring !== 'sets';
            persist(torneo);
            refreshAll();
        };
        scoringMode.addEventListener('change', saveScoring);
        setsBestOfSel.addEventListener('change', saveScoring);
    }

    // ─── Ajustes (exportar / duplicar / eliminar) ───
    const exportTorneoBtn = document.getElementById('exportTorneoBtn');
    const duplicateTorneoBtn = document.getElementById('duplicateTorneoBtn');
    const settingsDeleteBtn = document.getElementById('settingsDeleteBtn');

    if (exportTorneoBtn) {
        exportTorneoBtn.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(torneo, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const slug = (torneo.name || 'torneo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            a.download = `torneo-${slug || torneo.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    if (duplicateTorneoBtn) {
        duplicateTorneoBtn.addEventListener('click', () => {
            const copy = JSON.parse(JSON.stringify(torneo));
            copy.id = Date.now();
            copy.name = `${torneo.name} (copia)`;
            copy.status = 'borrador';
            copy.createdAt = new Date().toISOString();
            copy.bracket = null;   // el nuevo torneo arranca sin fixture generado
            copy.matches = null;
            const all = getTorneos();
            all.push(copy);
            saveTorneos(all);
            window.location.href = `detalleTorneo.html?id=${copy.id}`;
        });
    }
    if (settingsDeleteBtn) settingsDeleteBtn.addEventListener('click', openConfirmDelete);

    // ─── Navegación lateral: cambiar de sección ───
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeNameEdit();
            closeDetailsEdit();
            closeSettingsEdit();

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.panel;
            panels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === target));
        });
    });

    // Primer render de todas las secciones dependientes de datos.
    refreshAll();
}
