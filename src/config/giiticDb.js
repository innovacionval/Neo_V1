const mysql = require('mysql2/promise');

// Configuración de la base de datos giitic
const pool = mysql.createPool({
    host: '54.159.9.1', // Dirección del servidor
    port: 3306,                  // Puerto
    user: 'valcredito',                 // Usuario
    password: 'Rfv.951',      // Contraseña
    database: 'sigi',             // Nombre de la base de datos
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;