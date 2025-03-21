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
        //const creditosFiltrados = creditos.filter(credito => credito.idcredito === 'F1-679137-1');
        //const creditosFiltrados = creditos.filter(credito => credito.idcredito === 'CUOTA_ACTIVACION_AVAL-185');
        // const creditosFiltrados = creditos.filter(credito => credito.fuente === 'EDUFAST');
        const creditosFiltrados = creditos;

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
        //credito.idempresa ='170308620248819112351'; //fincovalpruebas
        // const clienteExiste = await verificarClienteEnGiitic(credito.codigodeudor,credito.idempresa);

        // // Si el cliente no existe, crearlo
        // if (!clienteExiste) {
        //     console.log(`Cliente ${credito.codigodeudor} no encontrado. Creándolo...`);
        //     await crearClienteEnGiitic(credito.codigodeudor,credito.idempresa);
        //     await esperarClienteCreado(credito.codigodeudor,credito.idempresa);
        // }

        // Enviar el crédito una vez asegurado que el cliente existe
        return await enviarCreditoToGiitic(credito);
    } catch (err) {
        console.error(`Error en el proceso de verificación/envío para el crédito ${credito.consecutivo || 'N/A'}:`, err.message);
        throw err;
    }
}

async function verificarClienteEnGiitic(codigoDeudor,ur) {
    try {
        const response = await axios.get(`${config.API_URL_GIITIC_CLI}?ur=${ur}`, {
            params: { codigo: codigoDeudor },
        });
        return response.status === 200 && response.data.codigo;
    } catch (err) {
        console.error(`Error al verificar cliente ${codigoDeudor}:`, err.message);
        return false;
    }
}

async function crearClienteEnGiitic(codigoDeudor,ur) {
    try {
        const cliente = await clienteModel.obtenerClientePorId(codigoDeudor);
        const apiUrl = `${config.API_URL_GIITIC_CLI}?ur=${ur}`;
        const clienteJson = JSON.stringify(cliente);
        const response = await axios.post(apiUrl, clienteJson, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (response.status === 201 && response.data.mensaje === 'Cliente creado') {
            console.log(`Cliente ${codigoDeudor} creado exitosamente.`);
        } else {
            throw new Error(`Error al crear cliente ${codigoDeudor}: ${response.data.mensaje}`);
        }
    } catch (err) {
        console.error(`Error al crear cliente ${codigoDeudor}:`, err.message);
        throw err;
    }
}

async function esperarClienteCreado(clienteId,ur) {
    let intentos = 0;

    while (intentos < MAX_REINTENTOS) {
        if (await verificarClienteEnGiitic(clienteId,ur)) {
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
        const ur = credito.idempresa;
        const apiUrl = `${API_URL_GIITIC_CRE}?ur=${ur}`;
        const creditoJson = JSON.stringify(credito);
        const response = await axios.post(apiUrl, creditoJson, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Validar respuesta
        if (response.data.httpResponse === 201 && response.data.mensaje === 'OK') {
            console.log(`Crédito con consecutivo ${credito.credito.consecutivo || 'N/A'} enviado exitosamente.`);
            console.log(`DATA CREDITO ENVIADO: ${creditoJson || 'N/A'}`);
            // Marcar como enviados en la base de datos los registros enviados con éxito
            await creditoModel.marcarComoEnviadoGiitic(credito.credito.consecutivo);
            return { creditoId: credito.credito.consecutivo || 'N/A', status: 'Enviado' };
        } else {
            console.error(`Error al enviar crédito ${credito.credito.consecutivo || 'N/A'}: ${response.data.mensaje}`);
            return { creditoId: credito.credito.consecutivo || 'N/A', status: 'Error', detalle: response.data.mensaje };
        }
    } catch (err) {
        console.error(`Error al enviar crédito ${credito.credito.consecutivo || 'N/A'}:`, err.response?.data || err.message);
        return { creditoId: credito.credito.consecutivo || 'N/A', status: 'Error', detalle: err.response?.data || err.message };
    }
}

function transformarCredito(credito) {
    const representante = credito.idrepresentantelegal;
    let codeudor = credito.idcodeudor;

    if(representante && representante.trim() !== "" && credito.fuente === 'EDUFAST'){
        //menores de edad envian representantelegal como codeudor
        codeudor=representante;
    }

     if(credito.fuente === 'WURTH'){
         credito.tipodeuda ='Administracion de cartera';
          // Obtener mes y año actuales
        const fechaActual = new Date();
        const mes = String(fechaActual.getMonth() + 1).padStart(2, '0'); // Mes en formato MM
        const año = String(fechaActual.getFullYear()).slice(-2); // Últimos dos dígitos del año

        //credito.periodoprograma = 'WURTH-1124';
        credito.periodoprograma = `WURTH-${mes}${año}`;
     }
    return {
        idempresa: credito.idempresa,
        codigodeudor: credito.idcliente,
        codigocodeudor: codeudor,
        credito: {
            tipoDeuda: credito.tipodeuda,
            clasificacion: credito.clasificacioncredito,
            consecutivo: credito.idcredito || null,
            fechacreacion: formatDate(credito.fechacreacion),
            fechaprimerpago: formatDate(credito.fechaprimerpago),
            valortotal: credito.valortotal,
            periodicidad: credito.periodicidad,
            numcuotas: credito.numcuotas,
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

