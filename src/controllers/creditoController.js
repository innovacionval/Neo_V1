const creditoModel = require('../models/creditoModel');
const { obtenerCreditosDeWurth } = require('../services/wurth/wurthConexion');
const { enviarCreditoToGiitic } = require('../services/giiticServices');
const { format } = require('date-fns');

// Enviar créditos a Giitic
async function enviarCreditosToGiitic(req, res) {
    try {
        // 1. Obtener todos los créditos de la base de datos
        const creditos = await creditoModel.obtenerCreditos();

        // 1.2 Filtrar créditos si es necesario (e.g., solo los educativos)
        const creditosFiltrados = creditos.filter(credito => {
            // Por ejemplo, solo enviar créditos con un valor superior a $1,000,000
            return credito.valortotal > 1000000;
        });

        // 2. Transformar los datos al formato requerido por la API externa
        const creditosTransformados = creditosFiltrados.map(credito => ({
            codigodeudor: credito.codigodeudor,
            codigocodeudor: credito.codigocodeudor,
            credito: {
                clasificacion: credito.clasificacion,
                consecutivo: credito.consecutivo || null,
                fechacreacion: formatDate(credito.fechacreacion),
                fechaprimerpago: formatDate(credito.fechaprimerpago),
                valortotal: credito.valortotal,
                periodicidad: credito.periodicidad,
                numcuotas: credito.numcuotas,
                interescorriente: credito.interescorriente || 0,
                diasdegracia: credito.diasdegracia || 0,
                interesmora: credito.interesmora || 0,
                observaciones: credito.observaciones || null,
                idTerceroIntermediario: credito.idTerceroIntermediario || null,
                insitucion: credito.institucion || null,
                programa: credito.programa || null,
                periodoprograma: credito.periodoprograma || null,
                valorpenalizacion: credito.valorpenalizacion || 0,
                tipopenalizacion: credito.tipopenalizacion || null,
                periodopenalizacion: credito.periodopenalizacion || null,
                pagare: credito.pagare || null,
            },
        }));

        // 3. Enviar cada crédito a la API externa
        const resultados = await Promise.all(
            creditosTransformados.map(credito => enviarCreditoToGiitic(credito))
        );

        // Responder con un resumen
        const enviados = resultados.filter(result => result.status === "Enviado").length;
        const errores = resultados.filter(result => result.status !== "Enviado");

        res.status(200).json({
            mensaje: "Proceso finalizado",
            enviados,
            errores,
        });

    } catch (err) {
        console.error('Error al enviar créditos:', err.message);
        res.status(500).json({ error: 'Hubo un error al enviar los créditos' });
    }
}

// Obtener todos los créditos
async function getCreditos(req, res) {
    try {
        const creditos = await creditoModel.obtenerCreditos();
        res.json(creditos);
    } catch (err) {
        console.error('Error al obtener créditos:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Obtener un crédito por ID
async function getCreditoPorId(req, res) {
    try {
        const credito = await creditoModel.obtenerCreditoPorId(req.params.id);
        if (!credito) {
            return res.status(404).send('Crédito no encontrado');
        }
        res.json(credito);
    } catch (err) {
        console.error('Error al obtener crédito:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Crear un nuevo crédito
async function createCredito(req, res) {
    try {
        await creditoModel.agregarCredito(req.body);
        res.status(201).send('Crédito creado con éxito');
    } catch (err) {
        console.error('Error al crear crédito:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Actualizar un crédito
async function updateCredito(req, res) {
    try {
        await creditoModel.actualizarCredito(req.params.id, req.body);
        res.send('Crédito actualizado con éxito');
    } catch (err) {
        console.error('Error al actualizar crédito:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Eliminar un crédito
async function deleteCredito(req, res) {
    try {
        await creditoModel.eliminarCredito(req.params.id);
        res.send('Crédito eliminado con éxito');
    } catch (err) {
        console.error('Error al eliminar crédito:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Formatear fecha
function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    getCreditos,
    getCreditoPorId,
    createCredito,
    updateCredito,
    deleteCredito,
    enviarCreditosToGiitic,
};
