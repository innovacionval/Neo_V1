const pool = require('../config/db');

// Obtener todos los abonos
async function obtenerAbonos() {
    const [rows] = await pool.query('SELECT * FROM abono');
    return rows;
}

// Obtener un abono por ID transaccion
async function obtenerAbonoPorId(id) {
    const [rows] = await pool.query('SELECT * FROM abono WHERE idtransaccion = ?', [id]);
    return rows[0];
}

// Agregar un nuevo abono
async function agregarAbono(datos) {
    const query = `
        INSERT INTO abono 
        (idabono, idcredito, idtransaccion, fechapago, fechaasiento, formapago, valor, observaciones, fecharegistro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
        datos.idabono,
        datos.idcredito,
        datos.idtransaccion,
        datos.fechapago,
        datos.fechaasiento,
        datos.formapago,
        datos.valor,
        datos.observaciones,
    ];
    await pool.query(query, values);
}

// Actualizar un abono
async function actualizarAbono(id, datos) {
    const query = `
        UPDATE abono 
        SET 
            idcredito = ?,  
            fechapago = ?, 
            fechaasiento = ?, 
            formapago = ?, 
            valor = ?, 
            observaciones = ?
        WHERE idtransaccion = ?
    `;
    const values = [
        datos.idcredito,
        datos.fechapago,
        datos.fechaasiento,
        datos.formapago,
        datos.valor,
        datos.observaciones,
        id,
    ];
    try {
        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            throw new Error(`No se encontró un abono con idtransaccion = ${id}`);
        }

        return result;
    } catch (error) {
        console.error('Error al actualizar el abono:', error.message);
        console.log('SQL Query:', query);
        console.log('Valores:', values);
        const formattedSQL = query.replace(/\?/g, (_, i) => `'${values[i]}'`);
        console.log('SQL Final:', formattedSQL);
        throw new Error('Error al actualizar el abono en la base de datos.');
    }
}

// Eliminar un abono
async function eliminarAbono(id) {
    await pool.query('DELETE FROM abono WHERE idabono = ?', [id]);
}

/**
 * Obtiene los registros de la tabla `credito` que no han sido exportados (giitic = 'N').
 * @returns {Promise<Array>} Lista de registros pendientes de exportación.
 */
async function obtenerRegistrosPendientesGiitic() {
    const query = "SELECT * FROM abono WHERE giitic = 'N'";
    const [rows] = await pool.query(query);
    return rows;
}

/**
 * Marca un registro como exportado cambiando `enviado` a 'S'.
 * @param {number} id - El ID del registro a actualizar.
 * @returns {Promise<void>} 
 */
async function marcarComoEnviadoGiitic(id) {
    const query = "UPDATE abono SET giitic = 'S' WHERE idtransaccion = ?";
    await pool.query(query, [id]);
}

module.exports = {
    obtenerAbonos,
    obtenerAbonoPorId,
    agregarAbono,
    actualizarAbono,
    eliminarAbono,
    obtenerRegistrosPendientesGiitic,
    marcarComoEnviadoGiitic
};
