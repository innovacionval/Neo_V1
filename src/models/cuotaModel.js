const pool = require('../config/db');
const { marcarComoEnviado } = require('./gestionModel');

// Obtener todas las cuotas
async function obtenerCuotas() {
    const [rows] = await pool.query('SELECT * FROM cuota');
    return rows;
}

// Obtener una cuota por ID
async function obtenerCuotaPorId(id) {
    const [rows] = await pool.query('SELECT * FROM cuota WHERE idcuota = ?', [id]);
    return rows[0];
}

// Obtener una cuota por ID
async function obtenerCuotaPorIdCredito(id) {
    const [rows] = await pool.query('SELECT * FROM cuota WHERE idcredito = ?', [id]);
    return rows[0];
}

// Agregar una nueva cuota
async function agregarCuota(datos) {
    const query = `
        INSERT INTO cuota 
        (idcredito, fechaactualizacion, saldointeres, saldomora, saldootros, saldohonorarios, saldovencido, pagodia, fecharegistro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
        datos.idcredito,
        datos.fechaactualizacion,
        datos.saldointeres,
        datos.saldomora,
        datos.saldootros,
        datos.saldohonorarios,
        datos.saldovencido,
        datos.pagodia,
    ];
    await pool.query(query, values);
}

// Actualizar una cuota
async function actualizarCuota(id, datos) {
    const query = `
        UPDATE cuota 
        SET 
            idcredito = ?, 
            fechaactualizacion = ?, 
            saldointeres = ?, 
            saldomora = ?, 
            saldootros = ?, 
            saldohonorarios = ?, 
            saldovencido = ?, 
            pagodia = ?, 
            fecharegistro = ?
        WHERE idcuota = ?
    `;
    const values = [
        datos.idcredito,
        datos.fechaactualizacion,
        datos.saldointeres,
        datos.saldomora,
        datos.saldootros,
        datos.saldohonorarios,
        datos.saldovencido,
        datos.pagodia,
        datos.fecharegistro,
        id,
    ];
    await pool.query(query, values);
}

// Actualizar una cuota
async function actualizarCuotaPorIdCredito(id, datos) {
    const query = `
        UPDATE cuota 
        SET 
            fechaactualizacion = ?, 
            saldointeres = ?, 
            saldomora = ?, 
            saldootros = ?, 
            saldohonorarios = ?, 
            saldovencido = ?, 
            pagodia = ?, 
            fecharegistro = ?,
            wurth = ? 
        WHERE idcredito = ?
    `;
    const values = [
        datos.fechaactualizacion,
        datos.saldointeres,
        datos.saldomora,
        datos.saldootros,
        datos.saldohonorarios,
        datos.saldovencido,
        datos.pagodia,
        datos.fecharegistro,
        datos.wurth,
        id,
    ];
    await pool.query(query, values);
}

// Eliminar una cuota
async function eliminarCuota(id) {
    await pool.query('DELETE FROM cuota WHERE idcuota = ?', [id]);
}

/**
 * Obtiene los registros de la tabla `cuota` que no han sido exportados (enviado = 'N').
 * @returns {Promise<Array>} Lista de registros pendientes de exportación.
 */
async function obtenerRegistrosPendientesWurth() {
    const query = "SELECT * FROM cuota WHERE wurth = 'N'";
    const [rows] = await pool.query(query);
    return rows;
}

/**
 * Marca un registro como exportado cambiando `enviado` a 'S'.
 * @param {number} id - El ID del registro a actualizar.
 * @returns {Promise<void>} 
 */
async function marcarComoEnviadowurth(id) {
    const query = "UPDATE cuota SET wurth = 'S' WHERE idcuota = ?";
    await pool.query(query, [id]);
}

module.exports = {
    obtenerCuotas,
    obtenerCuotaPorId,
    obtenerCuotaPorIdCredito,
    agregarCuota,
    actualizarCuota,
    actualizarCuotaPorIdCredito,
    eliminarCuota,
    obtenerRegistrosPendientesWurth,
    marcarComoEnviadowurth
};
