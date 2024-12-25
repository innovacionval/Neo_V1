const clienteModel = require('../../models/clienteModel'); 
const config = require('../../config/config');
const axios = require('axios');
const { format } = require('date-fns');

// URL del servidor externo de Giitic para enviar clientes
const API_URL_GIITIC_CLI = config.API_URL_GIITIC_CLI;

async function enviarClientesToGiitic() {
    try {
        // 1. Obtener todos los clientes de la tabla tercero
        const clientes = await clienteModel.obtenerClientes();

        // 1.2 Filtrar clientes según lógica requerida
        const clientesFiltrados = clientes.filter(cliente => {
            return cliente.estadocivil === 'Soltero' && cliente.correo && cliente.correo.includes('@');
        });

        // 2. Transformar los datos al formato requerido por la API externa usando una función centralizada
        const clientesTransformados = clientesFiltrados.map(transformarCliente);

        // 3. Limitar concurrencia usando p-limit
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Máximo de 10 solicitudes concurrentes

        const resultados = await Promise.allSettled(
            clientesTransformados.map(cliente =>
                limit(() => enviarClienteToGiitic(cliente))
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
        console.error('Error al enviar clientes:', err.message);
        console.error('Hubo un error al enviar los clientes');
    }
}

/**
 * Transforma un cliente al formato requerido por la API externa.
 * @param {Object} cliente - Cliente obtenido de la base de datos.
 * @returns {Object} Cliente transformado al formato esperado.
 */
function transformarCliente(cliente) {
    return {
        codigo: cliente.idcliente,
        primernombre: cliente.primernombre,
        segundonombre: cliente.segundonombre,
        primerapellido: cliente.primerapellido,
        segundopellido: cliente.segundopellido,
        nombreentero: `${cliente.primernombre} ${cliente.segundonombre || ''} ${cliente.primerapellido} ${cliente.segundopellido}`.trim(),
        tipoid: cliente.tipoid,
        id: cliente.idcliente,
        correo: cliente.correo,
        fechanacimientotxt: formatDate(cliente.fechanacimiento),
        fechaexpdoctxt: formatDate(cliente.fechaexpdoc),
        lugarexpdoc: cliente.lugarexpdoc || 'Desconocido',
        dinamicos: {
            cargo: cliente.cargo || 'No especificado',
            celular: cliente.celular,
            ciudadlaboral: cliente.ciudadlaboral || 'Desconocida',
            ciudadresidencia: cliente.ciudadresidencia,
            departamentolaboral: cliente.departamentolaboral || 'Desconocido',
            departamentoresidencia: cliente.departamentoresidencia,
            direccionresidencia: cliente.direccionresidencia,
            dirlaboral: cliente.dirlaboral || 'Desconocida',
            estadocivil: cliente.estadocivil,
            estrato: cliente.estrato || 'Desconocido',
            gastosmes: cliente.gastosmes || '0',
            genero: cliente.genero,
            ingresosmes: cliente.ingresosmes || '0',
            niveleducativo: cliente.niveleducativo,
            numpagare: cliente.numpagare || '0',
            personascargo: cliente.personascargo || '0',
            profesion: cliente.profesion || 'No especificada',
            telefonolaboral: cliente.telefonolaboral || 'No especificado',
            telefonoresidencia: cliente.telefonoresidencia,
            tipocontrato: cliente.tipocontrato || 'No especificado',
            tipopagare: cliente.tipopagare || 'No especificado',
            tipovivienda: cliente.tipovivienda || 'No especificada',
        },
    };
}

async function enviarClienteToGiitic(cliente) {
    try {
        const clienteJson = JSON.stringify(cliente);
        const response = await axios.post(API_URL_GIITIC_CLI, clienteJson, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Validar respuesta
        if (response.data.httpResponse === 200 && response.data.mensaje === 'OK') {
            return { clienteId: cliente.codigo, status: 'Enviado' };
        } else {
            throw new Error(`Error al enviar cliente ${cliente.codigo}: ${response.data.mensaje}`);
        }
    } catch (err) {
        throw new Error(err.response?.data || err.message);
    }
}

function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    enviarClientesToGiitic,
};

