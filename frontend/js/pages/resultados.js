// ─── RESULTADOS Y POSICIONES — vista pública de solo lectura ───

const params = new URLSearchParams(window.location.search);
const torneoId = Number(params.get('id'));

const notFoundState = document.getElementById('notFoundState');
const resultadosLayout = document.getElementById('resultadosLayout');

const torneos = JSON.parse(localStorage.getItem('codeflexTorneos') || '[]');
const torneo = torneos.find(t => t.id === torneoId);

if (!torneo) {
    if (notFoundState) notFoundState.hidden = false;
} else {
    if (resultadosLayout) resultadosLayout.hidden = false;
    initResultados(torneo);
}

/* Mismo motor de cálculo que el panel de gestión (detalleTorneo.js).
   Se duplica acá a propósito: son páginas separadas y no comparten scope. */
function isKnockout(t) {
    return t.formatKey === 'knockout';
}

function isDouble(t) {
    return t.formatKey === 'double-elimination';
}

function isMulti(t) {
    return t.formatKey === 'multi-stage';
}

function isBracketFormat(t) {
    return isKnockout(t) || isDouble(t);
}

// Formatos donde no se muestra una tabla global de puntos en la vista pública.
function hidesGlobalStandings(t) {
    return isBracketFormat(t) || isMulti(t);
}

function deAllMatches(de) {
    if (!de) return [];
    const gf = (de.GF || []).filter(m => m.teamA !== 'TBD' && m.teamB !== 'TBD');
    return [...(de.W || []).flat(), ...(de.L || []).flat(), ...gf];
}

function allRealMatches(t) {
    let list;
    if (isKnockout(t)) list = t.bracket ? t.bracket.flat() : [];
    else if (isDouble(t)) list = deAllMatches(t.de);
    else if (isMulti(t)) {
        const gm = (t.groups || []).flatMap(g => g.matches);
        const pb = t.playoffBracket ? t.playoffBracket.flat() : [];
        list = [...gm, ...pb];
    } else list = t.matches || [];
    return list.filter(m => m.teamA && m.teamB
        && m.teamA !== 'BYE' && m.teamB !== 'BYE'
        && m.teamA !== 'TBD' && m.teamB !== 'TBD');
}

function playedMatchesOf(t) {
    return allRealMatches(t).filter(m => m.scoreA != null && m.scoreB != null);
}

function matchWinner(match) {
    const a = match.teamA, b = match.teamB;
    if (a === 'TBD' || b === 'TBD' || a === 'BYE' || b === 'BYE') {
        if (a === 'BYE' && b !== 'BYE') return b;
        if (b === 'BYE' && a !== 'BYE') return a;
        return null;
    }
    if (match.scoreA == null || match.scoreB == null) return null;
    const sa = Number(match.scoreA), sb = Number(match.scoreB);
    if (sa > sb) return a;
    if (sb > sa) return b;
    return null;
}

function matchLoser(match) {
    const w = matchWinner(match);
    if (!w) return null;
    return w === match.teamA ? match.teamB : match.teamA;
}

function bracketChampion(t) {
    if (!isKnockout(t) || !t.bracket || !t.bracket.length) return null;
    return matchWinner(t.bracket[t.bracket.length - 1][0]);
}

function doubleChampion(de) {
    if (!de || !de.GF) return null;
    const gf0 = de.GF[0], gf1 = de.GF[1];
    if (gf1 && gf1.active) return matchWinner(gf1);
    const w = matchWinner(gf0);
    if (!w) return null;
    return w === gf0.teamA ? w : null;
}

// Campeón según el formato (knockout, doble eliminación o multi-etapa).
function tournamentChampion(t) {
    if (isKnockout(t)) return bracketChampion(t);
    if (isDouble(t)) return doubleChampion(t.de);
    if (isMulti(t)) {
        const pb = t.playoffBracket;
        return (pb && pb.length) ? matchWinner(pb[pb.length - 1][0]) : null;
    }
    return null;
}

function stdConfig(t) {
    const c = (t && t.standingsConfig) || {};
    const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    return {
        win: num(c.win, 3),
        draw: num(c.draw, 1),
        loss: num(c.loss, 0),
        tiebreakers: (Array.isArray(c.tiebreakers) && c.tiebreakers.length) ? c.tiebreakers : ['dg', 'gf']
    };
}

function tbValue(row, key) {
    if (key === 'dg') return row.gf - row.ga;
    if (key === 'gf') return row.gf;
    if (key === 'wins') return row.wins;
    return 0;
}

function computeStandings(t) {
    const cfg = stdConfig(t);
    const table = new Map();
    (t.teams || []).forEach(team => {
        table.set(team.name, { name: team.name, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 });
    });
    playedMatchesOf(t).forEach(m => {
        const a = table.get(m.teamA), b = table.get(m.teamB);
        if (!a || !b) return; // equipo renombrado/eliminado desde que se generó
        const sa = Number(m.scoreA), sb = Number(m.scoreB);
        a.played++; b.played++;
        a.gf += sa; a.ga += sb; b.gf += sb; b.ga += sa;
        if (sa > sb) { a.wins++; a.points += cfg.win; b.losses++; b.points += cfg.loss; }
        else if (sb > sa) { b.wins++; b.points += cfg.win; a.losses++; a.points += cfg.loss; }
        else { a.draws++; b.draws++; a.points += cfg.draw; b.points += cfg.draw; }
    });
    // Descansos del sistema suizo: valen como victoria (según config).
    if (t.swissByeByRound) {
        Object.values(t.swissByeByRound).forEach(name => {
            const row = table.get(name);
            if (row) { row.played++; row.wins++; row.points += cfg.win; }
        });
    }
    return Array.from(table.values()).sort((x, y) => {
        if (y.points !== x.points) return y.points - x.points;
        for (const k of cfg.tiebreakers) { const d = tbValue(y, k) - tbValue(x, k); if (d) return d; }
        return x.name.localeCompare(y.name);
    });
}

function getResults(t) {
    return playedMatchesOf(t)
        .slice()
        .sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));
}

function topScorers(t) {
    return (t.players || [])
        .filter(p => (p.goals || 0) > 0)
        .sort((a, b) => (b.goals || 0) - (a.goals || 0)
            || (b.assists || 0) - (a.assists || 0)
            || a.name.localeCompare(b.name));
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initResultados(torneo) {
    const resIcon = document.getElementById('resIcon');
    const resName = document.getElementById('resName');
    const resSportChip = document.getElementById('resSportChip');
    const resFormatChip = document.getElementById('resFormatChip');
    const resBackLink = document.getElementById('resBackLink');

    if (resName) resName.textContent = torneo.name;
    if (resSportChip) resSportChip.textContent = torneo.sport || '';
    if (resFormatChip) resFormatChip.textContent = torneo.format || '';
    if (resBackLink) resBackLink.href = `detalleTorneo.html?id=${torneo.id}`;
    if (resIcon) resIcon.textContent = '🏆';

    // ─── Campeón (knockout o doble eliminación) ───
    const resChampion = document.getElementById('resChampion');
    const champ = tournamentChampion(torneo);
    if (resChampion) {
        if (champ) {
            resChampion.hidden = false;
            resChampion.innerHTML = `<span class="championIcon" aria-hidden="true">🏆</span> Campeón: <strong>${champ}</strong>`;
        } else {
            resChampion.hidden = true;
        }
    }

    // ─── Posiciones ───
    const standingsTitle = document.getElementById('standingsTitle');
    const standingsWrap = document.getElementById('standingsWrap');
    const standingsBody = document.getElementById('standingsBody');
    const standingsCards = document.getElementById('standingsCards');
    const standingsEmpty = document.getElementById('standingsEmpty');

    const knockout = hidesGlobalStandings(torneo);
    const standings = computeStandings(torneo).filter(row => row.played > 0);

    if (knockout) {
        // En llaves y multi-etapa no se muestra tabla global: manda el campeón.
        if (standingsTitle) standingsTitle.textContent = 'Campeón';
        if (standingsWrap) standingsWrap.hidden = true;
        if (standingsEmpty) {
            standingsEmpty.hidden = !!champ;
            standingsEmpty.textContent = 'El torneo sigue en juego. Cuando se defina la final, acá va a aparecer el campeón.';
        }
    } else if (!standings.length) {
        if (standingsWrap) standingsWrap.hidden = true;
        if (standingsEmpty) {
            standingsEmpty.hidden = false;
            standingsEmpty.textContent = 'Todavía no hay partidos jugados para calcular la tabla de posiciones.';
        }
    } else {
        if (standingsEmpty) standingsEmpty.hidden = true;
        if (standingsWrap) standingsWrap.hidden = false;

        if (standingsBody) {
            standingsBody.innerHTML = '';
            standings.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="standingsTeamCol">${row.name}</td>
                    <td>${row.played}</td>
                    <td>${row.wins}</td>
                    <td>${row.draws}</td>
                    <td>${row.losses}</td>
                    <td class="standingsPts">${row.points}</td>
                `;
                standingsBody.appendChild(tr);
            });
        }

        if (standingsCards) {
            standingsCards.innerHTML = '';
            standings.forEach((row, idx) => {
                const card = document.createElement('div');
                card.className = 'standingsCard';
                card.innerHTML = `
                    <span class="standingsCardRank">${idx + 1}</span>
                    <div class="standingsCardBody">
                        <h3>${row.name}</h3>
                        <div class="standingsCardStats">
                            <span><strong>PJ</strong>${row.played}</span>
                            <span><strong>G</strong>${row.wins}</span>
                            <span><strong>E</strong>${row.draws}</span>
                            <span><strong>P</strong>${row.losses}</span>
                            <span class="standingsCardPts"><strong>Pts</strong>${row.points}</span>
                        </div>
                    </div>
                `;
                standingsCards.appendChild(card);
            });
        }
    }

    // ─── Resultados ───
    const resultsList = document.getElementById('resultsList');
    const resultsEmpty = document.getElementById('resultsEmpty');
    const results = getResults(torneo);

    if (!results.length) {
        if (resultsList) resultsList.hidden = true;
        if (resultsEmpty) resultsEmpty.hidden = false;
    } else {
        if (resultsEmpty) resultsEmpty.hidden = true;
        if (resultsList) {
            resultsList.hidden = false;
            resultsList.innerHTML = '';
            results.forEach(match => {
                const card = document.createElement('div');
                card.className = 'resultCard';
                card.innerHTML = `
                    <span class="resultTeams">${match.teamA} <span class="resultScore">${match.scoreA} - ${match.scoreB}</span> ${match.teamB}</span>
                    <span class="resultDate">${formatDate(match.playedAt)}</span>
                `;
                resultsList.appendChild(card);
            });
        }
    }

    // ─── Goleadores ───
    const scorersSection = document.getElementById('scorersSection');
    const publicScorersList = document.getElementById('publicScorersList');
    const scorers = topScorers(torneo);
    if (scorersSection && publicScorersList) {
        if (!scorers.length) {
            scorersSection.hidden = true;
        } else {
            scorersSection.hidden = false;
            publicScorersList.innerHTML = '';
            scorers.slice(0, 10).forEach((p, i) => {
                const row = document.createElement('div');
                row.className = 'scorerRow';
                row.innerHTML = `<span class="scorerRank">${i + 1}</span>`
                    + `<span class="scorerName">${p.name}</span>`
                    + `<span class="scorerTeam">${p.team}</span>`
                    + `<span class="scorerGoals">${p.goals}<span class="scorerGoalsUnit">goles</span></span>`;
                publicScorersList.appendChild(row);
            });
        }
    }
}
