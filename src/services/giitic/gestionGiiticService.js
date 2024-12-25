const gestionModel = require('../../models/gestionModel');
const creditoModel = require('../../models/creditoModel');

/**
 * Transforma los datos de una gestión obtenidos desde la base de datos de Giitic al formato requerido por el sistema local.
 * @param {Object} datosGestion - Los datos de la gestión obtenidos desde Giitic.
 * @returns {Object} - Objeto transformado al modelo de la base de datos local.
 */
function transformarGestion(datosGestion) {
    return {
        idgestion: datosGestion.idgestion,
        idcredito: datosGestion.idcredito,
        tarea: datosGestion.tarea,
        fechagestion: datosGestion.fechagestion,
        accion: datosGestion.accion,
        gestion: datosGestion.gestion,
        nombretercero: datosGestion.nombretercero,
    };
}

/**
 * Sincroniza las gestiones desde la base de datos de Giitic a la tabla de gestiones del sistema local.
 */
async function sincronizarGestiones() {
    try {
        // Obtener los créditos locales para sincronizar sus gestiones
        const creditosLocales = await creditoModel.obtenerCreditos(); // Debe implementar la función para obtener los créditos locales
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Limitar las promesas concurrentes a 10
        const resultados = [];
        const errores = [];
        let actualizados = 0;
        let insertados = 0;

        // Procesar cada crédito local para sincronizar sus gestiones
        const promesas = creditosLocales.map((credito) =>
            limit(async () => {
                try {
                    const gestionGiitic = await gestionModel.obtenerGestionGiiticPorId(credito.idcredito);
                    if (!gestionGiitic) {
                        throw new Error(`No se encontraron gestiones para el crédito ID: ${credito.idcredito}`);
                    }

                    const gestionTransformada = transformarGestion(gestionGiitic);
                    const gestionExistente = await gestionModel.obtenerGestionPorId(gestionTransformada.idgestion);

                    if (gestionExistente) {
                        await gestionModel.actualizarGestion(gestionTransformada.idgestion, gestionTransformada);
                        actualizados++;
                        resultados.push({ id: credito.idcredito, status: 'actualizado' });
                    } else {
                        await gestionModel.agregarGestion(gestionTransformada);
                        insertados++;
                        resultados.push({ id: gestionTransformada.idgestion, status: 'insertado' });
                    }
                } catch (error) {
                    errores.push({
                        id: gestionTransformada.idgestion,
                        mensaje: error.message,
                    });
                }
            })
        );

        await Promise.allSettled(promesas);

        console.log(`Resumen de la sincronización de gestiones:
            - Insertados: ${insertados}
            - Actualizados: ${actualizados}
            - Errores: ${errores.length}
        `);

        if (errores.length) {
            console.error('Errores detallados:', errores);
        }
    } catch (error) {
        console.error('Error durante la sincronización de gestiones:', error.message);
    }
}

module.exports = {
    sincronizarGestiones,
};
