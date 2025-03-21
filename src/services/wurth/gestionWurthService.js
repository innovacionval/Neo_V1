const axios = require('axios');
const gestionModel = require('../../models/gestionModel'); // Modelo para interactuar con la tabla 'gestion'
const { obtenerToken } = require('../../models/authtokenModel');
const config = require('../../config/config');
const { format } = require('date-fns');

// URL de la API para enviar datos de gestión
const API_URL_GESTION = config.API_URL_WGC;
const LLAVE_FINCOVAL = config.LLAVE_FINCOVAL;

/**
 * Envía un lote de datos a la API externa.
 * @param {Array} lote - Lote de datos a enviar.
 * @returns {Promise<Array>} - Resultados del envío de datos.
 */
async function enviarLoteDatos(lote) {
    const resultados = [];
    const errores = [];

    for (const registro of lote) {
        try {

            // Obtener el token guardado de la base de datos 
            const tokenData = await obtenerToken('wurth_api');

            if (!tokenData || !tokenData.token) {
                console.log('No se encontró un token válido.');
                // await obtenerNuevoToken(); por si se requiere obtener otro en el futuro
                return;
            }

            // Configuración de las cabeceras
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'DOLAPIKEY': tokenData.token, // Token necesario para autenticarse
            };

            registro.idempresa = LLAVE_FINCOVAL;
            registro.fechagestion = formatDate(registro.fechagestion);
            registro.fecharegistro = formatDate(registro.fecharegistro);

            // Llamada POST a la API con los datos del registro
            const registroJson = JSON.stringify(registro);
            const response = await axios.post(API_URL_GESTION, registroJson , { headers });

            if (response.status === 200 || response.status === 201) {
                resultados.push({ idgestion: registro.idgestion, status: 'enviado' });
                console.log(`DATA GESTION ENVIADO: ${registroJson || 'N/A'}`);
            } else {
                errores.push({
                    idgestion: registro.idgestion,
                    mensaje: `Error HTTP: ${response.status}`,
                });
            }
        } catch (error) {
            errores.push({
                idgestion: registro.idgestion,
                mensaje: error.message,
            });
        }
    }

    return { resultados, errores };
}

/**
 * Sincroniza los datos de la tabla 'gestion' con la API externa.
 */
async function sincronizarGestion() {
    try {
        console.log('Iniciando sincronización de gestión hacia wurth...');

        // Obtener los registros de la tabla 'gestion' que necesitan ser enviados
        const registrosPendientes = await gestionModel.obtenerRegistrosPendienteswurth();

        if (!registrosPendientes || registrosPendientes.length === 0) {
            console.log('No hay registros pendientes de sincronización.');
            return;
        }

        const registrosPorLote = 50; // Tamaño del lote
        let enviados = 0;
        let erroresTotales = 0;

        for (let i = 0; i < registrosPendientes.length; i += registrosPorLote) {
            const lote = registrosPendientes.slice(i, i + registrosPorLote);

            // Enviar el lote de datos
            const { resultados, errores } = await enviarLoteDatos(lote);

            enviados += resultados.length;
            erroresTotales += errores.length;

            // Marcar como enviados en la base de datos los registros enviados con éxito
            for (const resultado of resultados) {
                await gestionModel.marcarComoEnviadowurth(resultado.idgestion);
            }

            // Registrar errores en la base de datos o en logs
            if (errores.length > 0) {
                console.error('Errores en el lote de gestiones:', errores);
            }
        }

        console.log(`
            Resumen de sincronización de gestión hacia wurth:
            Registros enviados: ${enviados}
            Registros con errores: ${erroresTotales}
        `);
    } catch (err) {
        console.error('Error durante la sincronización de gestión:', err);
    }
}

function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    sincronizarGestion,
};
