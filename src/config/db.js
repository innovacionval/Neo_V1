const mysql = require('mysql2/promise');

// Configuración de la base de datos
const pool = mysql.createPool({
    host: 'neptuno.valcredit.co', // Dirección del servidor
    port: 3306,                  // Puerto
    user: 'neo',                 // Usuario
    password: 'V4lCr3d1t*',      // Contraseña
    database: 'neo',             // Nombre de la base de datos
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

module.exports = pool;