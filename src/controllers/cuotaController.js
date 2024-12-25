const cuotaModel = require('../../models/cuotaModel');
const {obtenerDatosDeudaGiitic } = require('../../services/giiticServices');
const { format } = require('date-fns');

// Sincronización de cuotas (deudas)
async function sincronizarCuotas(req, res) {
    try {
        // 1. Obtener las deudas desde la base de datos o un listado de IDs.
        const deudasLocales = await cuotaModel.obtenerCuotas; // Método para obtener las deudas locales.

        // 2. Recorrer las deudas locales
        for (const deuda of deudasLocales) {
            // 3. Obtener los datos de la deuda desde la API externa
            const datosDeuda = await obtenerDatosDeudaGiitic(deuda.idcredito);

            if (!datosDeuda) {
                console.warn(`No se encontraron datos para la deuda con ID: ${deuda.idcredito}`);
                continue;
            }

            // 4. Verificar si la deuda ya existe en la base de datos
            const deudaExistente = await cuotaModel.obtenerCuotaPorId(deuda.idcredito);

            if (deudaExistente) {
                // 5. Actualizar si la deuda ya existe
                await cuotaModel.actualizarCuota(deuda.idcredito, {
                    fechaactualizacion: datosDeuda.fechaactualizacion,
                    saldointeres: datosDeuda.saldointeres,
                    saldomora: datosDeuda.saldomora,
                    saldootros: datosDeuda.saldootros,
                    saldohonorarios: datosDeuda.saldohonorarios,
                    saldovencido: datosDeuda.saldovencido,
                    pagodia: datosDeuda.pagodia,
                    fecharegistro: datosDeuda.fecharegistro,
                });
            } else {
                // 6. Insertar si la deuda no existe
                await cuotaModel.agregarCuota({
                    idcredito: datosDeuda.idcredito,
                    fechaactualizacion: datosDeuda.fechaactualizacion,
                    saldointeres: datosDeuda.saldointeres,
                    saldomora: datosDeuda.saldomora,
                    saldootros: datosDeuda.saldootros,
                    saldohonorarios: datosDeuda.saldohonorarios,
                    saldovencido: datosDeuda.saldovencido,
                    pagodia: datosDeuda.pagodia,
                    fecharegistro: datosDeuda.fecharegistro,
                });
            }
        }

        res.send('Sincronización de deudas completada con éxito');
    } catch (err) {
        console.error('Error durante la sincronización de deudas:', err);
        res.status(500).send('Error en la sincronización de deudas');
    }
}

async function enviarCuotasToWurth(req, res) {

}

// Obtener todas las cuotas
async function getCuotas(req, res) {
    try {
        const cuotas = await cuotaModel.obtenerCuotas();
        res.json(cuotas);
    } catch (err) {
        console.error('Error al obtener cuotas:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Obtener una cuota por ID
async function getCuotaPorId(req, res) {
    try {
        const cuota = await cuotaModel.obtenerCuotaPorId(req.params.id);
        if (!cuota) {
            return res.status(404).send('Cuota no encontrada');
        }
        res.json(cuota);
    } catch (err) {
        console.error('Error al obtener cuota:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Crear una nueva cuota
async function createCuota(req, res) {
    try {
        await cuotaModel.agregarCuota(req.body);
        res.status(201).send('Cuota agregada con éxito');
    } catch (err) {
        console.error('Error al agregar cuota:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Actualizar una cuota existente
async function updateCuota(req, res) {
    try {
        await cuotaModel.actualizarCuota(req.params.id, req.body);
        res.send('Cuota actualizada con éxito');
    } catch (err) {
        console.error('Error al actualizar cuota:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Eliminar una cuota
async function deleteCuota(req, res) {
    try {
        await cuotaModel.eliminarCuota(req.params.id);
        res.send('Cuota eliminada con éxito');
    } catch (err) {
        console.error('Error al eliminar cuota:', err);
        res.status(500).send('Error en el servidor');
    }
}

function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    sincronizarCuotas,
    enviarCuotasToWurth,
    getCuotas,
    getCuotaPorId,
    createCuota,
    updateCuota,
    deleteCuota,
};
