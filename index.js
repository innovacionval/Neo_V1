const express = require('express');
const https = require('https');
const fs = require('fs');

const clienteRoutes = require('./src/routes/clienteRoutes');
const creditoRoutes = require('./src/routes/creditoRoutes');

const { iniciarCronJobs } = require('./src/services/cronJobs');

const app = express();
app.use(express.json()); // Middleware para procesar JSON
app.use('/clientes', clienteRoutes); // Ruta base para clientes
app.use('/creditos', creditoRoutes); // Ruta base para creditos

const PORT = 3000;

// Cargar certificados
/* const httpsOptions = {
    key: fs.readFileSync('/etc/apache2/sites-available/579368b08321b366.key'), // Ruta al archivo de clave privada
    cert: fs.readFileSync('/etc/apache2/sites-available/579368b08321b366.crt') // Ruta al certificado
}; */

app.get('/', (req, res) => {
    res.send('¡Hola, mundo Neo..');
});


// Iniciar los cron jobs
// iniciarCronJobs();


const pool = require('./src/config/db');
app.get('/datos', async (req, res) => {
    try {
        // Consulta a la base de datos
        const [rows] = await pool.query('SELECT * FROM tercero');
        res.json(rows);
    } catch (err) {
        console.error('Error al consultar la base de datos:', err);
        res.status(500).send('Error en el servidor');
    }
});

const pool2 = require('./src/config/giiticDb');
app.get('/bitgiitic', async (req, res) => {
    try {
        // Consulta a la base de datos
        const [rows] = await pool2.query('SELECT * from bitacora.bitacora limit 20');
        res.json(rows);
    } catch (err) {
        console.error('Error al consultar la base de datos:', err);
        res.status(500).send('Error en el servidor');
    }
});


// inicio servidor HTTPS
/* https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`Servidor HTTPS corriendo en https://localhost:${PORT}`);
}); */

// Inicio del servidor HTTP ,desarrollo
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
