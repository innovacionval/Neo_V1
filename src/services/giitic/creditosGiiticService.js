const creditoModel = require('../../models/creditoModel');
const clienteModel = require('../../models/clienteModel');
const config = require('../../config/config');
const axios = require('axios');
const { format } = require('date-fns');

// URL del servidor externo de Giitic para enviar créditos
const API_URL_GIITIC_CRE = config.API_URL_GIITIC_CRE;

const MAX_REINTENTOS = 5;
const INTERVALO_MS = 2000;

async function enviarCreditosToGiitic() {
    try {
        // 1. Obtener todos los créditos de la base de datos
        const creditos = await creditoModel.obtenerRegistrosPendientesGiitic();

        // 1.2 Filtrar créditos según la lógica requerida (e.g., solo los educativos)
        const creditosFiltrados = creditos.filter(credito => credito.valortotal > 1000000);

        // 2. Transformar los datos al formato requerido por la API externa usando una función centralizada
        const creditosTransformados = creditosFiltrados.map(transformarCredito);

        // 3. Limitar concurrencia usando p-limit
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Máximo de 10 solicitudes concurrentes

        const resultados = await Promise.allSettled(
            creditosTransformados.map(credito =>
                limit(() => verificarYEnviarCredito(credito))
            )
        );

        // Resumir resultados
        const enviados = resultados.filter(result => result.status === 'fulfilled' && result.value.status === 'Enviado').length;
        const errores = resultados.filter(result => result.status === 'rejected' || result.value.status !== 'Enviado');

        return {
            mensaje: 'Proceso finalizado',
            enviados,
            errores: errores.map(err => (err.reason || err.value.detalle)),
        };
    } catch (err) {
        console.error('Error al enviar créditos:', err.message);
        throw new Error('Hubo un error al enviar los créditos');
    }
}

async function verificarYEnviarCredito(credito) {
    try {
        // Verificar si el cliente existe en la API de Giitic
        const clienteExiste = await verificarClienteEnGiitic(credito.codigodeudor);

        // Si el cliente no existe, crearlo
        if (!clienteExiste) {
            console.log(`Cliente ${credito.codigodeudor} no encontrado. Creándolo...`);
            await crearClienteEnGiitic(credito.codigodeudor);
            await esperarClienteCreado(credito.codigodeudor);
        }

        // Enviar el crédito una vez asegurado que el cliente existe
        return await enviarCreditoToGiitic(credito);
    } catch (err) {
        console.error(`Error en el proceso de verificación/envío para el crédito ${credito.consecutivo || 'N/A'}:`, err.message);
        throw err;
    }
}

async function verificarClienteEnGiitic(codigoDeudor) {
    try {
        const response = await axios.get(`${config.API_URL_GIITIC_CLIENTE}`, {
            params: { codigo: codigoDeudor },
        });
        return response.status === 200 && response.data.existe;
    } catch (err) {
        console.error(`Error al verificar cliente ${codigoDeudor}:`, err.message);
        return false;
    }
}

async function crearClienteEnGiitic(codigoDeudor) {
    try {
        const cliente = await clienteModel.obtenerClientePorId(codigoDeudor);
        const response = await axios.post(config.API_URL_GIITIC_CLIENTE, cliente, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (response.status === 200 && response.data.mensaje === 'Cliente creado') {
            console.log(`Cliente ${codigoDeudor} creado exitosamente.`);
        } else {
            throw new Error(`Error al crear cliente ${codigoDeudor}: ${response.data.mensaje}`);
        }
    } catch (err) {
        console.error(`Error al crear cliente ${codigoDeudor}:`, err.message);
        throw err;
    }
}

async function esperarClienteCreado(clienteId) {
    let intentos = 0;

    while (intentos < MAX_REINTENTOS) {
        if (await verificarClienteEnGiitic(clienteId)) {
            console.log(`Cliente ${clienteId} confirmado en Giitic.`);
            return;
        }

        intentos++;
        console.log(`Cliente ${clienteId} no existe aún. Reintento ${intentos}/${MAX_REINTENTOS}`);
        await new Promise(resolve => setTimeout(resolve, INTERVALO_MS));
    }

    throw new Error(`El cliente ${clienteId} no se creó en el tiempo esperado.`);
}

async function enviarCreditoToGiitic(credito) {
    try {
        const creditoJson = JSON.stringify(credito);
        const response = await axios.post(API_URL_GIITIC_CRE, creditoJson, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Validar respuesta
        if (response.data.httpResponse === 200 && response.data.mensaje === 'OK') {
            console.log(`Crédito con consecutivo ${credito.consecutivo || 'N/A'} enviado exitosamente.`);
            // Marcar como enviados en la base de datos los registros enviados con éxito
            await creditoModel.marcarComoEnviadoGiitic(credito.consecutivo);
            return { creditoId: credito.consecutivo || 'N/A', status: 'Enviado' };
        } else {
            console.error(`Error al enviar crédito ${credito.consecutivo || 'N/A'}: ${response.data.mensaje}`);
            return { creditoId: credito.consecutivo || 'N/A', status: 'Error', detalle: response.data.mensaje };
        }
    } catch (err) {
        console.error(`Error al enviar crédito ${credito.consecutivo || 'N/A'}:`, err.response?.data || err.message);
        return { creditoId: credito.consecutivo || 'N/A', status: 'Error', detalle: err.response?.data || err.message };
    }
}

function transformarCredito(credito) {
    return {
        codigodeudor: credito.idcliente,
        codigocodeudor: credito.idcodeudor,
        credito: {
            clasificacion: credito.clasificacioncredito,
            consecutivo: credito.idcredito || null,
            fechacreacion: formatDate(credito.fechacreacion),
            fechaprimerpago: formatDate(credito.fechaprimerpago),
            valortotal: credito.valortotal,
            periodicidad: credito.periodicidad,
            numcuotas: credito.numcuotas,
            interescorriente: credito.interescorriente || 0,
            diasdegracia: credito.diasdegracia || 0,
            interesmora: credito.interesmora || 0,
            observaciones: credito.observaciones || null,
            idTerceroIntermediario: credito.idtercerointermediario || null,
            insitucion: credito.institucion || null,
            programa: credito.programa || null,
            periodoprograma: credito.periodoprograma || null,
            valorpenalizacion: credito.valorpenalizacion || 0,
            tipopenalizacion: credito.tipopenalizacion || null,
            periodopenalizacion: credito.periodopenalizacion || null,
            pagare: credito.pagare || null,
        },
    };
}

function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    enviarCreditosToGiitic,
};

