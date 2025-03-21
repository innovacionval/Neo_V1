const mysql = require('mysql2/promise');
const config = require('../config/config');

const DB_HOST_NEPTUNO = config.DB_HOST;
const DB_PORT_NEPTUNO = config.DB_PORT;
const DB_USER_NEPTUNO = config.DB_USER;
const DB_PASS_NEPTUNO = config.DB_PASSWORD;
const DB_DATABASE_NEPTUNO = config.DB_NAME;

// Configuración de la base de datos
const pool = mysql.createPool({
    host: DB_HOST_NEPTUNO,          // Dirección del servidor
    port: DB_PORT_NEPTUNO,          // Puerto
    user: DB_USER_NEPTUNO,          // Usuario
    password: DB_PASS_NEPTUNO,      // Contraseña
    database: DB_DATABASE_NEPTUNO,  // Nombre de la base de datos
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
    
    // Añadir esta opción para convertir los valores automáticamente
    typeCast: (field, next) => {
        if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
            return parseFloat(field.string()); // Convertir decimales a números
        }
        if (field.type === 'TINY' || field.type === 'SHORT' || field.type === 'LONG') {
            return parseInt(field.string(), 10); // Convertir enteros a números
        }
        return next();
    },
});

module.exports = pool;