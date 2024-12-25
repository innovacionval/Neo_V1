const abonoModel = require('../models/abonoModel');
const { obtenerAbonosDeAPI } = require('../services/wurth/wurthConexion');
const { enviarAbonoToGiitic } = require('../services/giiticServices');

// Enviar abonos a Giitic
async function enviarAbonosToGiitic(req, res) {
    try {
        // 1. Obtener todos los abonos
        const abonos = await abonoModel.obtenerAbonos();

        // 2. Transformar los datos al formato requerido por la API externa
        const abonosTransformados = abonos.map(abono => ({
            idabono: abono.idabono,
            idcredito: abono.idcredito,
            idtransaccion: abono.idtransaccion,
            fechapago: abono.fechapago,
            fechaasiento: abono.fechaasiento,
            formapago: abono.formapago,
            valor: abono.valor,
            observaciones: abono.observaciones,
            fecharegistro: abono.fecharegistro,
        }));

        // 3. Enviar cada abono a la API externa
        const resultados = await Promise.all(
            abonosTransformados.map(abono => enviarAbonoToGiitic(abono))
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
        console.error('Error al enviar abonos:', err.message);
        res.status(500).json({ error: 'Hubo un error al enviar los abonos' });
    }
}

// Obtener todos los abonos
async function getAbonos(req, res) {
    try {
        const abonos = await abonoModel.obtenerAbonos();
        res.json(abonos);
    } catch (err) {
        console.error('Error al obtener abonos:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Obtener un abono por ID
async function getAbonoPorId(req, res) {
    try {
        const abono = await abonoModel.obtenerAbonoPorId(req.params.id);
        if (!abono) {
            return res.status(404).send('Abono no encontrado');
        }
        res.json(abono);
    } catch (err) {
        console.error('Error al obtener abono:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Agregar un nuevo abono
async function createAbono(req, res) {
    try {
        await abonoModel.agregarAbono(req.body);
        res.status(201).send('Abono agregado con éxito');
    } catch (err) {
        console.error('Error al agregar abono:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Actualizar un abono
async function updateAbono(req, res) {
    try {
        await abonoModel.actualizarAbono(req.params.id, req.body);
        res.send('Abono actualizado con éxito');
    } catch (err) {
        console.error('Error al actualizar abono:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Eliminar un abono
async function deleteAbono(req, res) {
    try {
        await abonoModel.eliminarAbono(req.params.id);
        res.send('Abono eliminado con éxito');
    } catch (err) {
        console.error('Error al eliminar abono:', err);
        res.status(500).send('Error en el servidor');
    }
}

module.exports = {
    getAbonos,
    getAbonoPorId,
    createAbono,
    updateAbono,
    deleteAbono,
    enviarAbonosToGiitic,
};
