const db = require('../config/db');
const dbgiitic = require('../config/giiticDb');
/**
 * Obtener todas las gestiones de la base de datos.
 * @returns {Promise<Array>} Lista de gestiones.
 */
async function obtenerGestiones() {
    const query = 'SELECT * FROM gestion';
    const [result] = await db.query(query);
    return result;
}

/**
 * Obtener una gestión por su ID.
 * @param {number} idGestion - ID de la gestión.
 * @returns {Promise<Object|null>} La gestión correspondiente o null si no existe.
 */
async function obtenerGestionPorId(idGestion) {
    const query = 'SELECT * FROM gestion WHERE idgestion = ?';
    const [result] = await db.query(query, [idGestion]);
    return result.length > 0 ? result[0] : null;
}

/**
 * Agregar una nueva gestión a la base de datos.
 * Nota: el `idgestion` se genera automáticamente en la base de datos si está configurado como autoincremental.
 * @param {Object} gestion - Objeto con los datos de la gestión (sin incluir `idgestion`).
 * @returns {Promise<number>} El ID de la gestión insertada.
 */
async function agregarGestion(gestion) {
    const query = 'INSERT INTO gestion (idgestion, idcredito, fechagestion, accion, gestion, fecharegistro) VALUES (?, ?, ?, ?, ?, NOW())';
    const params = [
        gestion.idgestion,
        gestion.idcredito,
        gestion.fechagestion,
        gestion.accion,
        gestion.gestion
    ];
    const [result] = await db.query(query, params);
    return result.insertId; // Retornar el ID generado por la base de datos.
}

/**
 * Actualizar una gestión existente.
 * @param {number} idGestion - ID de la gestión.
 * @param {Object} gestion - Objeto con los datos actualizados de la gestión.
 * @returns {Promise<void>}
 */
async function actualizarGestion(idGestion, gestion) {
    const query = `
        UPDATE gestion 
        SET idcredito = ?, 
            fechagestion = ?, 
            accion = ?, 
            gestion = ?, 
            fecharegistro = ?
        WHERE idgestion = ?`;
    const params = [
        gestion.idcredito,
        gestion.fechagestion,
        gestion.accion,
        gestion.gestion,
        gestion.fecharegistro,
        idGestion
    ];
    await db.query(query, params);
}

/**
 * Eliminar una gestión por su ID.
 * @param {number} idGestion - ID de la gestión.
 * @returns {Promise<void>}
 */
async function eliminarGestion(idGestion) {
    const query = 'DELETE FROM gestion WHERE idgestion = ?';
    await db.query(query, [idGestion]);
}

/**
 * Obtiene los registros de la tabla `gestion` que no han sido exportados (enviado = 'N').
 * @returns {Promise<Array>} Lista de registros pendientes de exportación.
 */
async function obtenerRegistrosPendienteswurth() {
    const query = "SELECT * FROM gestion WHERE wurth = 'N'";
    const [rows] = await db.query(query);
    return rows;
}

/**
 * Marca un registro como exportado cambiando `enviado` a 'S'.
 * @param {number} id - El ID del registro a actualizar.
 * @returns {Promise<void>} 
 */
async function marcarComoEnviadowurth(id) {
    const query = "UPDATE gestion SET wurth = 'S' WHERE idgestion = ?";
    await db.query(query, [id]);
}



/**
 * Obtener todas las gestiones de la base de datos de GIITIC
 * @returns {Promise<Array>} Lista de gestiones.
 */
async function obtenerGestionesGiitic() {
    const query = 'SELECT * from bitacora.bitacora b order by registro desc';
    const [result] = await dbgiitic.query(query);
    return result;
}

/**
 * Obtener una gestión por su ID CREDITO en giitic.
 * @param {number} idCredito - ID del credito.
 * @returns {Promise<Object|null>} La gestión correspondiente o null si no existe.
 */
async function obtenerGestionGiiticPorId(idCredito) {
    const query = `
    SELECT 
        b.llave as idgestion,
        b.tarea,
        b.registro as fechagestion,
        b.accion,
        b.comentario as gestion,
        c.nombretercero,
        d.id as idcredito
    FROM 
        bitacora.bitacora b
    LEFT JOIN 
        cuentacobrarpagar c ON b.tarea = c.tarea
    LEFT JOIN 
        carteradeuda d ON c.carteradeuda = d.llave
    WHERE d.id = ? AND b.registro > '2024-12-13 00:00:00'`;
    
    const [result] = await dbgiitic.query(query, [idCredito]);
    return result.length > 0 ? result[0] : null;
}

module.exports = {
    obtenerGestiones,
    obtenerGestionPorId,
    agregarGestion,
    actualizarGestion,
    eliminarGestion,
    obtenerRegistrosPendienteswurth,
    marcarComoEnviadowurth,
    obtenerGestionesGiitic,
    obtenerGestionGiiticPorId
};
