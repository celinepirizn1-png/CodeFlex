/* Roles temporales de interfaz; esto no reemplaza el control del servidor. */
const ROLES_PERMISOS = {
    publico: new Set(['ver_torneos', 'ver_detalle', 'ver_informacion', 'registrarse', 'iniciar_sesion']),
    participante: new Set(['ver_torneos', 'ver_detalle', 'ver_informacion', 'inscribirse', 'gestionar_equipo', 'ver_mis_torneos', 'ver_partidas', 'ver_resultados', 'editar_perfil', 'cerrar_sesion']),
    organizador: new Set(['ver_torneos', 'ver_detalle', 'ver_informacion', 'inscribirse', 'gestionar_equipo', 'ver_mis_torneos', 'ver_partidas', 'ver_resultados', 'editar_perfil', 'cerrar_sesion', 'crear_torneo', 'editar_torneo', 'gestionar_inscripciones', 'gestionar_llaves', 'cargar_resultado', 'panel_organizador']),
    administrador: new Set(['ver_torneos', 'ver_detalle', 'ver_informacion', 'inscribirse', 'gestionar_equipo', 'ver_mis_torneos', 'ver_partidas', 'ver_resultados', 'editar_perfil', 'cerrar_sesion', 'crear_torneo', 'editar_torneo', 'gestionar_inscripciones', 'gestionar_llaves', 'cargar_resultado', 'panel_organizador', 'gestionar_usuarios', 'ver_auditoria', 'supervisar_torneos', 'panel_administrador'])
};

const ROL_KEY = 'sgdmRolTemporal';
const rolActual = () => window.getSession?.()?.role || localStorage.getItem(ROL_KEY) || 'publico';

function tienePermiso(rol, accion) {
    return ROLES_PERMISOS[rol]?.has(accion) || false;
}

function establecerRolTemporal(rol) {
    if (ROLES_PERMISOS[rol]) localStorage.setItem(ROL_KEY, rol);
    aplicarPermisos();
}

function aplicarPermisos() {
    const rol = rolActual();
    document.querySelectorAll('.panelSwitcher [data-role]').forEach((element) => {
        element.dataset.roleLink = element.dataset.role === 'admin' ? 'administrador' : element.dataset.role;
    });
    document.querySelectorAll('a[href], button[id]').forEach((element) => {
        const target = element.getAttribute('href') || element.id;
        if (target.includes('crearTorneo')) element.dataset.permission = 'crear_torneo';
        if (target.includes('mistorneos')) element.dataset.permission = 'ver_mis_torneos';
        if (target.includes('panel/organizador')) element.dataset.permission = 'panel_organizador';
        if (target.includes('panel/admin')) element.dataset.permission = 'panel_administrador';
        if (target.includes('usuarios')) element.dataset.permission = 'gestionar_usuarios';
        if (target.includes('auditoria')) element.dataset.permission = 'ver_auditoria';
        if (target.includes('supervisar')) element.dataset.permission = 'supervisar_torneos';
        if (element.id === 'panelHeroCta' || element.id === 'panelEmptyAction') element.dataset.permission = 'crear_torneo';
        if (['btnSubmitTournament', 'editNameBtn', 'nameSaveBtn', 'toggleStatusBtn', 'deleteTorneoBtn', 'addTeamBtn'].includes(element.id)) {
            element.dataset.permission = 'editar_torneo';
        }
    });
    document.querySelectorAll('[data-permission]').forEach((element) => {
        if (!tienePermiso(rol, element.dataset.permission)) element.remove();
    });
    document.querySelectorAll('[data-role-link]').forEach((element) => {
        if (element.dataset.roleLink !== rol && rol !== 'administrador') element.remove();
    });
    const requiredRole = document.body.dataset.requiredRole;
    if (requiredRole && rol !== requiredRole && rol !== 'administrador') {
        const root = window.location.pathname.split('/html/')[0];
        window.location.href = `${root}/html/nologin/inicio.html`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('roleDevelopmentSelector');
    if (selector) {
        selector.hidden = new URLSearchParams(window.location.search).get('dev') !== '1';
        selector.value = rolActual();
        selector.addEventListener('change', () => establecerRolTemporal(selector.value));
    }
});

window.addEventListener('sgdm:session-changed', aplicarPermisos);
window.addEventListener('sgdm:session-ready', aplicarPermisos);