const axios = require('axios');

const config = require('../../config/config');
const creditoModel = require('../../models/creditoModel');
const terceroModel = require('../../models/clienteModel');
const {obtenerToken } = require('../../models/authtokenModel');

// URL de la API obtener creditos
const API_URL_WCR = config.API_URL_WCR;

/**
 * Servicio para obtener información de crédito desde la API Wurth.
 * @returns {Promise<Object>} - Los datos obtenidos de la API.
 */
async function obtenerCreditosDeWurth() {
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
            'Accept': 'application/json',
            'DOLAPIKEY': tokenData.token, // Token necesario para autenticarse
        };

        // Llamada a la API
        const response = await axios.get(API_URL_WCR, {
            headers: headers,
            params: {
                sortfield: 'siret',
                sortorder: 'ASC',
                limit: 100
            }
        });

        if (response.status >= 200 && response.status < 300) {
            console.log('Datos de credito obtenidos exitosamente:', response.data);
            // Retornar los datos de la API
            return response.data;
        } else {
            // respuestas inesperadas en el rango 2xx
            console.error('Respuesta inesperada:', response.status, response.statusText);
            throw new Error(`Error al obtener . Código HTTP: ${response.status}`);
        }


    } catch (err) {
        console.error('Error al obtener datos de la API Wurth Creditos:', err.message);
        if(err.response){
            console.error('Error al obtener datos de credito:', err.response.data.error.message); 
        }
        throw new Error('No se pudo conectar con la API externa');
    }
}

// Sincronización de créditos desde Wurth
async function sincronizarCreditos() {
    try {
        // 1. Obtener créditos desde la API externa
        const creditosExternos = await obtenerCreditosDeWurth(); // Implementa esta función según el endpoint de créditos

        // Paginación: Dividir los créditos en lotes (ej. 100 créditos por lote)
        const creditosPorLote = 100; // Número de créditos por lote
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Limitar la cantidad de promesas concurrentes (ej. 10)

        // Contadores para créditos actualizados e insertados
        let actualizados = 0;
        let insertados = 0;
        const resultados = []; // Array para almacenar los resultados de las promesas
        const errores = []; // Array para capturar errores con detalle

        // Iterar por los lotes de créditos
        for (let i = 0; i < creditosExternos.length; i += creditosPorLote) {
            const loteCreditos = creditosExternos.slice(i, i + creditosPorLote);

            // Procesar créditos en paralelo, pero limitando la cantidad de promesas concurrentes
            const promesas = loteCreditos.map(credito =>
                limit(async () => {
                    try {
                        credito = sanitizeObject(credito); // Corregir valores vacíos
                        credito.fuente = 'WURTH';
                        credito.clasificacioncredito = 'ADMINCAR';
                        const clienteAsociado = await terceroModel.obtenerClientePorId(credito.idcliente);

                        if (!clienteAsociado) {
                            // Opcional: Intentar sincronizar el cliente faltante aquí.
                            throw new Error('Cliente no encontrado para el crédito en la base de datos');
                        }
                        const creditoExistente = await creditoModel.obtenerCreditoPorId(credito.idcredito);

                        if (creditoExistente) {
                            await creditoModel.actualizarCredito(credito.idcredito, credito);
                            actualizados++;
                            return { status: 'actualizado', id: credito.idcredito };
                        } else {
                            await creditoModel.agregarCredito(credito);
                            insertados++;
                            return { status: 'insertado', id: credito.idcredito };
                        }
                    } catch (error) {
                        errores.push({
                            id: credito.idcredito,
                            mensaje: error.message,
                            credito,
                        });
                        return { status: 'error', id: credito.idcredito, error: error.message };
                    }
                })
            );

            // Esperar a que todas las promesas del lote se resuelvan
            const resultadosLote = await Promise.allSettled(promesas);

            // Procesar los resultados de este lote
            resultadosLote.forEach((resultado) => {
                if (resultado.status === 'fulfilled') {
                    resultados.push(resultado.value);
                } else {
                    errores.push({
                        id: 'desconocido',
                        mensaje: resultado.reason.message,
                    });
                }
            });
        }

        // Resumen final
        const resumenSincronizacion = `
        Resumen de sincronización de créditos:
        Créditos insertados: ${insertados}
        Créditos actualizados: ${actualizados}
        Créditos con errores: ${errores.length}
        Errores:`;

        const resumen = {
            resumen: resumenSincronizacion,
            errores: errores
        };

        console.log(resumen);

    } catch (err) {
        console.error('Error durante la sincronización de créditos:', err);
    }
}

/**
 * Convierte valores vacíos ('') o undefined a null para un objeto genérico.
 * @param {Object} obj - Objeto con los datos a sanitizar.
 * @returns {Object} - Objeto con los valores sanitizados.
 */
function sanitizeObject(obj) {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, value === '' || value === undefined ? null : value])
    );
}


module.exports = {
    sincronizarCreditos, 
};

