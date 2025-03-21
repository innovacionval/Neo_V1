const gestionModel = require('../../models/gestionModel');
const creditoModel = require('../../models/creditoModel');

/**
 * Transforma los datos de una gestión obtenidos desde la base de datos de Giitic al formato requerido por el sistema local.
 * @param {Object} datosGestion - Los datos de la gestión obtenidos desde Giitic.
 * @returns {Object} - Objeto transformado al modelo de la base de datos local.
 */
function transformarGestion(datosGestion) {
    return {
        idgiitic: datosGestion.idgestion,
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
        //filtrar solo deudass de wurth
        const deudasFiltradas = creditosLocales.filter(credito => credito.fuente === 'WURTH');
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Limitar las promesas concurrentes a 10
        const resultados = [];
        const errores = [];
        let actualizados = 0;
        let insertados = 0;

        // Procesar cada crédito local para sincronizar sus gestiones
        const promesas = deudasFiltradas.map((credito) =>
            limit(async () => {
                try {
                    const gestionesGiitic = await gestionModel.obtenerGestionesGiiticPorId(credito.idcredito);
                    if (!gestionesGiitic) {
                        throw new Error(`No se encontraron gestiones para el crédito ID: ${credito.idcredito}`);
                    }
                    
                    for (const gestionGiitic of gestionesGiitic) {
                        const gestionTransformada = transformarGestion(gestionGiitic);
                        const gestionExistente = await gestionModel.obtenerGestionPorId(gestionTransformada.idgiitic);

                        if (gestionExistente) {
                            await gestionModel.actualizarGestion(gestionTransformada.idgiitic, gestionTransformada);
                            actualizados++;
                            resultados.push({ id: credito.idcredito, status: 'actualizado' });
                        } else {
                            await gestionModel.agregarGestion(gestionTransformada);
                            insertados++;
                            resultados.push({ id: gestionTransformada.idgiitic, status: 'insertado' });
                        }
                    }
                } catch (error) {
                    errores.push({
                        id: error.errno,
                        creditoId: credito.idcredito,
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
