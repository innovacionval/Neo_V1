const pool = require('../config/db');

// Obtener todos los clientes
async function obtenerClientes() {
    const [rows] = await pool.query('SELECT * FROM tercero');
    return rows;
}

// Obtener un cliente por ID
async function obtenerClientePorId(id) {
    const [rows] = await pool.query('SELECT * FROM tercero WHERE idcliente = ?', [id]);
    return rows[0];
}

// Agregar un nuevo cliente
async function agregarCliente(datos) {
    const query = `
        INSERT INTO tercero 
        (primernombre, segundonombre, primerapellido, segundopellido, tipoid, idcliente, telefono, celular, correo, fechanacimiento, fechaexpdoc, estadocivil, genero, ciudadresidencia, direccionresidencia, niveleducativo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        datos.primernombre,
        datos.segundonombre,
        datos.primerapellido,
        datos.segundopellido,
        datos.tipoid,
        datos.idcliente,
        datos.telefono,
        datos.celular,
        datos.correo,
        datos.fechanacimiento,
        datos.fechaexpdoc,
        datos.estadocivil,
        datos.genero,
        datos.ciudadresidencia,
        datos.direccionresidencia,
        datos.niveleducativo,
    ];
    await pool.query(query, values);
}

// Actualizar un cliente existente
async function actualizarCliente(idcliente, datos) {
    const query = `
        UPDATE tercero 
        SET 
            primernombre = ?, 
            segundonombre = ?, 
            primerapellido = ?, 
            segundopellido = ?, 
            tipoid = ?, 
            telefono = ?, 
            celular = ?, 
            correo = ?, 
            fechanacimiento = ?, 
            fechaexpdoc = ?, 
            estadocivil = ?, 
            genero = ?, 
            ciudadresidencia = ?, 
            direccionresidencia = ?, 
            niveleducativo = ?
        WHERE idcliente = ?
    `;
    const values = [
        datos.primernombre,
        datos.segundonombre,
        datos.primerapellido,
        datos.segundopellido,
        datos.tipoid,
        datos.telefono,
        datos.celular,
        datos.correo,
        datos.fechanacimiento,
        datos.fechaexpdoc,
        datos.estadocivil,
        datos.genero,
        datos.ciudadresidencia,
        datos.direccionresidencia,
        datos.niveleducativo,
        idcliente, // Clave para identificar el cliente a actualizar
    ];

    await pool.query(query, values);
}


// Eliminar un cliente
async function eliminarCliente(id) {
    await pool.query('DELETE FROM tercero WHERE idcliente = ?', [id]);
}

module.exports = {
    obtenerClientes,
    obtenerClientePorId,
    agregarCliente,
    actualizarCliente,
    eliminarCliente,
};
