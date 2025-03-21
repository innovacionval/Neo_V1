const mysql = require('mysql2/promise');

const config = require('../config/config');

const DB_HOST_G = config.DBG_HOST;
const DB_PORT_G = config.DBG_PORT;
const DB_USER_G = config.DBG_USER;
const DB_PASS_G= config.DBG_PASSWORD;
const DB_DATABASE_G = config.DBG_NAME;

// Configuración de la base de datos giitic
const pool = mysql.createPool({
    host: DB_HOST_G,            // Dirección del servidor
    port: DB_PORT_G,            // Puerto
    user: DB_USER_G,            // Usuario
    password: DB_PASS_G,        // Contraseña
    database: DB_DATABASE_G,            // Nombre de la base de datos
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;