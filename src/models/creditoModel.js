const pool = require('../config/db');
const dbgiitic = require('../config/giiticDb');

// Obtener todos los créditos
async function obtenerCreditos() {
    const [rows] = await pool.query('SELECT * FROM credito');
    return rows;
}

// Obtener un crédito por ID
async function obtenerCreditoPorId(id) {
    const [rows] = await pool.query('SELECT * FROM credito WHERE idcredito = ?', [id]);
    return rows[0];
}

// Agregar un nuevo crédito
async function agregarCredito(datos) {
    const query = `
        INSERT INTO credito 
        (idempresa, idcredito, idcliente, idrepresentantelegal, idcodeudor, clasificacioncredito, fechacreacion, fechaprimerpago, valortotal, diasmora, periodicidad, numcuotas, interescorriente, diasdegracia, interesmora, observaciones, idtercerointermediario, institucion, programa, periodoprograma, fuente, fecharegistro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
        datos.idempresa,
        datos.idcredito,
        datos.idcliente,
        datos.idrepresentantelegal,
        datos.idcodeudor,
        datos.clasificacioncredito,
        datos.fechacreacion,
        datos.fechaprimerpago,
        datos.valortotal,
        datos.diasmora,
        datos.periodicidad,
        datos.numcuotas,
        datos.interescorriente,
        datos.diasdegracia,
        datos.interesmora,
        datos.observaciones,
        datos.idtercerointermediario,
        datos.institucion,
        datos.programa,
        datos.periodoprograma,
        datos.fuente,
    ];
    await pool.query(query, values);
}

// Actualizar un crédito
async function actualizarCredito(id, datos) {
    const query = `
        UPDATE credito 
        SET 
            idempresa = ?, 
            idcliente = ?, 
            idrepresentantelegal = ?, 
            idcodeudor = ?, 
            clasificacioncredito = ?, 
            fechacreacion = ?, 
            fechaprimerpago = ?, 
            valortotal = ?, 
            diasmora = ?, 
            periodicidad = ?, 
            numcuotas = ?, 
            interescorriente = ?, 
            diasdegracia = ?, 
            interesmora = ?, 
            observaciones = ?, 
            fecharegistro = ?, 
            idtercerointermediario = ?, 
            institucion = ?, 
            programa = ?, 
            periodoprograma = ?,
            fuente = ?
        WHERE idcredito = ?
    `;
    const values = [
        datos.idempresa,
        datos.idcliente,
        datos.idrepresentantelegal,
        datos.idcodeudor,
        datos.clasificacioncredito,
        datos.fechacreacion,
        datos.fechaprimerpago,
        datos.valortotal,
        datos.diasmora,
        datos.periodicidad,
        datos.numcuotas,
        datos.interescorriente,
        datos.diasdegracia,
        datos.interesmora,
        datos.observaciones,
        datos.fecharegistro,
        datos.idtercerointermediario,
        datos.institucion,
        datos.programa,
        datos.periodoprograma,
        datos.fuente,
        id,
    ];
    await pool.query(query, values);
}

// Eliminar un crédito
async function eliminarCredito(id) {
    await pool.query('DELETE FROM credito WHERE idcredito = ?', [id]);
}

/**
 * Obtiene los registros de la tabla `credito` que no han sido exportados (giitic = 'N').
 * @returns {Promise<Array>} Lista de registros pendientes de exportación.
 */
async function obtenerRegistrosPendientesGiitic() {
    const query = "SELECT * FROM credito WHERE giitic = 'N'";
    const [rows] = await pool.query(query);
    return rows;
}

/**
 * Marca un registro como exportado cambiando `enviado` a 'S'.
 * @param {number} id - El ID del registro a actualizar.
 * @returns {Promise<void>} 
 */
async function marcarComoEnviadoGiitic(id) {
    const query = "UPDATE credito SET giitic = 'S' WHERE idcredito = ?";
    await pool.query(query, [id]);
}

/**
 * Obtener llave de deuda de la base de datos de GIITIC
 * @returns Llave deuda giitic.
 */
async function obtenerllaveDeudaGiitic(id) {
    const query = 'SELECT llave from carteradeuda where id = ? ';
    const [result] = await dbgiitic.query(query, [id]);
    return result[0];
}

module.exports = {
    obtenerCreditos,
    obtenerCreditoPorId,
    agregarCredito,
    actualizarCredito,
    eliminarCredito,
    obtenerRegistrosPendientesGiitic,
    marcarComoEnviadoGiitic,
    obtenerllaveDeudaGiitic
};

