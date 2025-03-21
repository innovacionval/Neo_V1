const axios = require('axios');

const config = require('../../config/config');
const abonoModel = require('../../models/abonoModel');
const creditoModel = require('../../models/creditoModel');
const {obtenerToken } = require('../../models/authtokenModel');

// URL de la API obtener abonos
const API_URL_WAB = config.API_URL_WAB;


async function obtenerAbonosDeWurth() {
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
        const response = await axios.get(API_URL_WAB, {
            headers: headers,
            params: {
                sortfield: 'siret',
                sortorder: 'ASC',
                limit: 100000
            }
        });

        if (response.status === 200) {
            console.log('Datos de Abonos obtenidos exitosamente:', response.data);
            // Retornar los datos de la API
            return response.data;
        } else {
            // respuestas inesperadas
            console.error('Respuesta inesperada:', response.status, response.statusText);
            throw new Error(`Error al obtener . Código HTTP: ${response.status}`);
        }

    } catch (err) {
        console.error('Error al obtener abonos de la API:', err);
        throw new Error('No se pudo conectar con la API externa ABonos');
    }
}

// Sincronización de abonos desde Wurth
async function sincronizarAbonos() {
    try {
        // 1. Obtener abonos desde la API externa
        const abonosExternos = await obtenerAbonosDeWurth();

        // Paginación: Dividir los abonos en lotes (ej. 100 abonos por lote)
        const abonosPorLote = 100; // Número de abonos por lote
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Limitar la cantidad de promesas concurrentes (ej. 10)

        // Contadores para abonos actualizados e insertados
        let actualizados = 0;
        let insertados = 0;
        let omitidos = 0;
        const resultados = []; // Array para almacenar los resultados de las promesas
        const errores = []; // Array para capturar errores con detalle
        
        console.log('CANTIDAD DE ABONOS EN WURTH :');
        console.log(abonosExternos.length);

        // Iterar por los lotes de abonos
        for (let i = 0; i < abonosExternos.length; i += abonosPorLote) {
            const loteAbonos = abonosExternos.slice(i, i + abonosPorLote);
            const fechaLimite = new Date("2025-03-01"); // Fecha límite establecida

            // Procesar abonos en paralelo, pero limitando la cantidad de promesas concurrentes
            const promesas = loteAbonos.map(abono =>
                limit(async () => {
                    try {
                        abono = sanitizeObject(abono); // Corregir valores vacíos
                        abono.observaciones = abono.obs;
                        // **Validación de fecha**
                        if (new Date(abono.fechapago) < fechaLimite) {
                            omitidos++;
                            return { status: 'omitido', id: abono.idtransaccion };
                        }

                        const creditoAsociado = await creditoModel.obtenerCreditoPorId(abono.idcredito);

                        if (!creditoAsociado) {
                            throw new Error('Credito no encontrado relacionado al abono en la base de datos');
                        }
                        const abonoExistente = await abonoModel.obtenerAbonoPorId(abono.idtransaccion);

                        if (abonoExistente) {
                            await abonoModel.actualizarAbono(abono.idtransaccion, abono);
                            actualizados++;
                            if(abono.idtransaccion === 'R2-842127-1'){
                                console.log('ABONO ACTUALIZADO R2-842127-1 :');
                                console.log(JSON.stringify(abono));
                            }
                            return { status: 'actualizado', id: abono.idtransaccion };
                        } else {
                            await abonoModel.agregarAbono(abono);
                            insertados++;
                            return { status: 'insertado', id: abono.idtransaccion };
                        }
                    } catch (error) {
                        errores.push({
                            id: abono.idtransaccion,
                            mensaje: error.message,
                            abono,
                        });
                        return { status: 'error', id: abono.idtransaccion, error: error.message };
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
        Resumen de sincronización de abonos:
        Abonos insertados: ${insertados}
        Abonos actualizados: ${actualizados}
        Abonos omitidos por fecha: ${omitidos}
        Abonos con errores: ${errores.length}
        Errores:`;

        const resumen = {
            resumen: resumenSincronizacion,
            errores: errores,
        };

        console.log(resumen);

    } catch (err) {
        console.error('Error durante la sincronización de abonos:', err);
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
    sincronizarAbonos, 
};
