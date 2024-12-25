const pool = require('../config/db'); // Configuración de la conexión a la base de datos
const { cifrar, descifrar } = require('../services/authtokenServices'); // Servicios de cifrado y descifrado

// Guardar un token en la base de datos
const guardarToken = async (nombre, usuario, contrasena, token, fechaExpiracion, metadata = null) => {
  try {
    const query = `
      INSERT INTO authtokens (nombre, usuario, contrasena, token, fecha_expiracion, metadata) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      nombre,
      cifrar(usuario), // Cifrar usuario usando el servicio
      cifrar(contrasena), // Cifrar contraseña usando el servicio
      cifrar(token), // Cifrar token usando el servicio
      fechaExpiracion, // Fecha de expiración (en formato TIMESTAMP)
      metadata ? JSON.stringify(metadata) : null, // Metadatos en formato JSON (si existen)
    ];
    const [result] = await pool.query(query, values);
    return result.insertId; // Retorna el ID del registro insertado
  } catch (error) {
    console.error('Error al guardar el token:', error.message);
    throw new Error('No se pudo guardar el token en la base de datos.');
  }
};

const actualizarTokenPorNombre = async (nombre, usuario, contrasena, token, fechaExpiracion, metadata = null) => {
  try {
    // La consulta UPDATE usa el campo 'nombre' para encontrar el registro a actualizar
    const query = `
      UPDATE authtokens 
      SET 
        nombre = ?, 
        usuario = ?, 
        contrasena = ?, 
        token = ?, 
        fecha_expiracion = ?, 
        metadata = ? 
      WHERE nombre = ?`; // Buscar por 'nombre' en lugar de 'usuario'

    // Definimos los valores para el UPDATE
    const values = [
      nombre,
      cifrar(usuario), // Cifrar usuario
      cifrar(contrasena), // Cifrar contraseña
      cifrar(token), // Cifrar token
      fechaExpiracion, // Fecha de expiración
      metadata ? JSON.stringify(metadata) : null, // Metadatos
      nombre // Condición para buscar el registro por 'nombre'
    ];

    // Ejecutar la consulta
    const [result] = await pool.query(query, values);

    // Verificar si la actualización fue exitosa
    if (result.affectedRows > 0) {
      return { mensaje: 'Token actualizado con éxito', id: result.insertId }; // O id del registro afectado
    } else {
      throw new Error('No se encontró el nombre para actualizar el token.');
    }
  } catch (error) {
    console.error('Error al actualizar el token:', error.message);
    throw new Error('No se pudo actualizar el token en la base de datos.');
  }
};


// Obtener un token por nombre de servicio
const obtenerToken = async (nombre) => {
  try {
    const query = `
      SELECT id, nombre, usuario, contrasena, token, fecha_creacion, fecha_expiracion, metadata
      FROM authtokens
      WHERE nombre = ?
    `;
    const [rows] = await pool.query(query, [nombre]);

    if (rows.length === 0) {
      throw new Error('No se encontró el token para el servicio especificado.');
    }

    const tokenData = rows[0];
    return {
      id: tokenData.id,
      nombre: tokenData.nombre,
      usuario: descifrar(tokenData.usuario), // Descifrar usuario usando el servicio
      contrasena: descifrar(tokenData.contrasena), // Descifrar contraseña usando el servicio
      token: descifrar(tokenData.token), // Descifrar token usando el servicio
      fecha_creacion: tokenData.fecha_creacion,
      fecha_expiracion: tokenData.fecha_expiracion,
      metadata: tokenData.metadata ? JSON.parse(tokenData.metadata) : null, // Parsear JSON si existe
    };
  } catch (error) {
    console.error('Error al obtener el token:', error.message);
    throw new Error('No se pudo obtener el token de la base de datos.');
  }
};

// Exportar las funciones para usarlas en otros archivos
module.exports = {
  guardarToken,
  actualizarTokenPorNombre,
  obtenerToken,
};
