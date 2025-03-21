const axios = require('axios');
const cuotaModel = require('../../models/cuotaModel'); // Modelo para interactuar con la tabla 'cuota'
const { obtenerToken } = require('../../models/authtokenModel');
const config = require('../../config/config');
const { format } = require('date-fns');

// URL de la API para enviar datos de cuota
const API_URL_CUOTA = config.API_URL_WCI;
const LLAVE_FINCOVAL = config.LLAVE_FINCOVAL;

/**
 * Envía un lote de datos a la API externa.
 * @param {Array} lote - Lote de datos a enviar.
 * @returns {Promise<Array>} - Resultados del envío de datos.
 */
async function enviarLoteDatosCuota(lote) {
    const resultados = [];
    const errores = [];

    for (const registro of lote) {
        try {
            // Obtener el token guardado de la base de datos 
            const tokenData = await obtenerToken('wurth_api');

            if (!tokenData || !tokenData.token) {
                console.log('No se encontró un token válido.');
                return;
            }

            // Configuración de las cabeceras
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'DOLAPIKEY': tokenData.token, // Token necesario para autenticarse
            };

            // Llamada POST a la API con los datos del registro
            registro.idempresa = LLAVE_FINCOVAL;
            registro.fechaactualizacion = formatDate(registro.fechaactualizacion);
            const registroJson = JSON.stringify(registro);
            const response = await axios.post(API_URL_CUOTA, registroJson, { headers });

            if (response.status === 200 || response.status === 201) {
                resultados.push({ idcuota: registro.idcuota, status: 'enviado' });
            } else {
                errores.push({
                    idcuota: registro.idcuota,
                    mensaje: `Error HTTP: ${response.status}`,
                });
            }
        } catch (error) {
            errores.push({
                idcuota: registro.idcuota,
                mensaje: error.message,
            });
        }
    }

    return { resultados, errores };
}

/**
 * Sincroniza los datos de la tabla 'cuota' con la API externa.
 */
async function sincronizarCuota() {
    try {
        console.log('Iniciando sincronización de cuota...');

        // Obtener los registros de la tabla 'cuota' que necesitan ser enviados
        const registrosPendientes = await cuotaModel.obtenerRegistrosPendientesWurth();

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
            const { resultados, errores } = await enviarLoteDatosCuota(lote);

            enviados += resultados.length;
            erroresTotales += errores.length;

            // Marcar como enviados en la base de datos los registros enviados con éxito
            for (const resultado of resultados) {
                await cuotaModel.marcarComoEnviadowurth(resultado.idcuota);
            }

            // Registrar errores en la base de datos o en logs
            if (errores.length > 0) {
                console.error('Errores en el lote de cuotas:', errores);
            }
        }

        console.log(`
            Resumen de sincronización de cuota:
            Registros enviados: ${enviados}
            Registros con errores: ${erroresTotales}
        `);
    } catch (err) {
        console.error('Error durante la sincronización de cuota:', err);
    }
}

function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    sincronizarCuota,
};
