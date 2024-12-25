const abonoModel = require('../../models/abonoModel');
const config = require('../../config/config');
const axios = require('axios');
const { format } = require('date-fns');

// URL del servidor externo de Giitic para enviar abonos
const API_URL_GIITIC_ABONOS = config.API_URL_GIITIC_ABONOS;

/**
 * Servicio para enviar abonos a Giitic.
 */
async function enviarAbonosToGiitic() {
    try {
        // 1. Obtener todos los abonos pendientes de la base de datos
        const abonos = await abonoModel.obtenerRegistrosPendientesGiitic();

        // 1.2 Filtrar abonos si es necesario
        const abonosFiltrados = abonos.filter(abono => abono.valor > 0); // Ejemplo de filtro

        // 2. Transformar los datos al formato requerido por la API externa
        const abonosTransformados = abonosFiltrados.map(transformarAbono);

        // 3. Limitar concurrencia usando p-limit
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Máximo de 10 solicitudes concurrentes

        const resultados = await Promise.allSettled(
            abonosTransformados.map(abono =>
                limit(() => enviarAbonoToGiitic(abono))
            )
        );

        // Resumir resultados
        const enviados = resultados.filter(result => result.status === 'fulfilled' && result.value.status === 'Enviado').length;
        const errores = resultados.filter(result => result.status === 'rejected' || result.value.status !== 'Enviado');

        console.log({
            mensaje: 'Proceso finalizado',
            enviados,
            errores: errores.map(err => (err.reason || err.value.detalle)),
        });
    } catch (err) {
        console.error('Error al enviar abonos:', err.message);
    }
}

/**
 * Transforma un abono al formato requerido por la API externa.
 * @param {Object} abono - Abono obtenido de la base de datos.
 * @returns {Object} Abono transformado al formato esperado.
 */
function transformarAbono(abono) {
    return {
        transaccion: abono.idabono,
        consecutivocredito: abono.idcredito,
        idtransaccion: abono.idtransaccion,
        fechapago: formatDate(abono.fechapago),
        fechaasiento: formatDate(abono.fechaasiento),
        formapago: abono.formapago || 'No especificado',
        valor: abono.valor,
        obs: abono.observaciones || '',
        fecharegistro: formatDate(abono.fecharegistro),
    };
}

/**
 * Enviar un abono a la API externa Giitic.
 * @param {Object} abono - Abono transformado al formato requerido.
 * @returns {Object} Resultado del envío.
 */
async function enviarAbonoToGiitic(abono) {
    try {
        const abonoJson = JSON.stringify(abono);
        const response = await axios.post(API_URL_GIITIC_ABONOS, abonoJson, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Validar respuesta
        if (response.data.httpResponse === 200 && response.data.mensaje === 'OK') {
            console.log(`Abono ${abono.transaccion} enviado exitosamente.`);
            // Marcar como enviados en la base de datos los registros enviados con éxito
            await abonoModel.marcarComoEnviadoGiitic(abono.transaccion);
            return { abonoId: abono.transaccion, status: 'Enviado' };
        } else {
            throw new Error(`Error al enviar abono ${abono.transaccion}: ${response.data.mensaje}`);
        }
    } catch (err) {
        throw new Error(err.response?.data || err.message);
    }
}

/**
 * Formatea una fecha en el formato 'yyyy-MM-dd'.
 * @param {Date|string} fecha - Fecha a formatear.
 * @returns {string} Fecha formateada.
 */
function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    enviarAbonosToGiitic,
};
