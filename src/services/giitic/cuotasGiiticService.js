const axios = require('axios');
const cuotaModel = require('../../models/cuotaModel');
const creditoModel = require('../../models/creditoModel');
const config = require('../../config/config');

// URL de la API para obtener las cuotas
const API_URL_GIITIC_CUOTA = config.API_URL_GIITIC_CUOTA;

/**
 * Servicio para obtener los datos de una deuda desde la API externa Giitic.
 * @param {string} deudaId - El identificador de la deuda.
 * @returns {Promise<Object>} - Los datos de la deuda desde la API.
 */
async function obtenerDatosDeudaGiitic(deudaId) {
    try {
        const url = `${API_URL_GIITIC_CUOTA}&d=${deudaId}`;
        const response = await axios.get(url);

        if (!response.data || !response.data.objetores) {
            throw new Error(`Datos no encontrados para la deuda con ID: ${deudaId}`);
        }

        return response.data.objetores;
    } catch (error) {
        console.error(`Error al obtener datos de la deuda ${deudaId}:`, error.message);
        throw new Error('Error al conectar con la API externa.');
    }
}

/**
 * Transforma los datos de la deuda recibidos desde la API externa al formato requerido por la base de datos.
 * @param {Object} datosDeuda - Los datos de la deuda obtenidos de la API.
 * @returns {Object} - Objeto transformado al modelo de la base de datos.
 */
function transformarCuota(datosDeuda) {
    const saldointeres = datosDeuda.cierre.saldointeres || 0;
    const saldomora = datosDeuda.cierre.saldomora || 0;
    const saldootros = datosDeuda.cierre.saldootros || 0;
    const saldohonorarios = datosDeuda.cierre.saldohonorarios || 0;
    const saldovencido = datosDeuda.cierre.saldovencido || 0;

    return {
        idcredito: datosDeuda.idcredito,
        fechaactualizacion: datosDeuda.fechaactualizacion,
        saldointeres,
        saldomora,
        saldootros,
        saldohonorarios,
        saldovencido,
        pagodia: saldointeres + saldomora + saldootros + saldohonorarios + saldovencido,
        fecharegistro: datosDeuda.fecharegistro || null,
    };
}

/**
 * Sincronización de cuotas (deudas) desde la API externa hacia el sistema local.
 */
async function sincronizarCuotas() {
    try {
        const deudasLocales = await creditoModel.obtenerCreditos(); // Obtener las deudas o creditos locales
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Limitar las promesas concurrentes a 10
        const resultados = [];
        const errores = [];
        let actualizados = 0;
        let insertados = 0;

        // Procesar cada deuda local
        const promesas = deudasLocales.map((deuda) =>
            limit(async () => {
                try {
                    const llavedeuda = await creditoModel.obtenerllaveDeudaGiitic(deuda.idcredito);
                    if (!llavedeuda) {
                        throw new Error(`No se pudo recuperar la llave en Giitic de la deuda: ${deuda.idcredito}`);
                    }
                    const datosDeuda = await obtenerDatosDeudaGiitic(llavedeuda);
                    if (!datosDeuda) {
                        throw new Error('Datos no encontrados en la API.');
                    }
                    datosDeuda.idcredito = deuda.idcredito;
                    const cuotaTransformada = transformarCuota(datosDeuda);
                    const deudaExistente = await cuotaModel.obtenerCuotaPorIdCredito(cuotaTransformada.idcredito);

                    if (deudaExistente) {
                        await cuotaModel.actualizarCuotaPorIdCredito(cuotaTransformada.idcredito, cuotaTransformada);
                        actualizados++;
                        resultados.push({ id: cuotaTransformada.idcredito, status: 'actualizado' });
                    } else {
                        await cuotaModel.agregarCuota(cuotaTransformada);
                        insertados++;
                        resultados.push({ id: cuotaTransformada.idcredito, status: 'insertado' });
                    }
                } catch (error) {
                    errores.push({
                        id: deuda.idcredito,
                        mensaje: error.message,
                    });
                }
            })
        );

        await Promise.allSettled(promesas);

        console.log(`
            Resumen de la sincronización de cuotas:
            - Insertados: ${insertados}
            - Actualizados: ${actualizados}
            - Errores: ${errores.length}
        `);

        if (errores.length) {
            console.error('Errores detallados:', errores);
        }
    } catch (error) {
        console.error('Error durante la sincronización de cuotas:', error.message);
    }
}

module.exports = {
    sincronizarCuotas,
};
