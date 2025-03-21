const clienteModel = require('../../models/clienteModel'); 
const creditoModel = require('../../models/creditoModel');
const config = require('../../config/config');
const axios = require('axios');
const { format } = require('date-fns');
const ciudadesGiitic = require('./ciudadesGiitic');

// Crear el mapa ciudades
const mapaCiudadesGiitic = new Map();
ciudadesGiitic.forEach(ciudad => {
    mapaCiudadesGiitic.set(ciudad.nombre.toLowerCase(), ciudad.codigo);
});

// URL del servidor externo de Giitic para enviar clientes
const API_URL_GIITIC_CLI = config.API_URL_GIITIC_CLI;

async function enviarClientesToGiitic() {
    try {
        // 1. Obtener todos los clientes de la tabla tercero
        const clientes = await clienteModel.obtenerRegistrosPendientesGiitic();
        // 1.1 Obtener los créditos para identificar las empresas asociadas a cada cliente
        const creditos = await creditoModel.obtenerCreditos();
        // 1.2 Crear un mapa de clientes con sus empresas asociadas
        const clienteEmpresaMap = {};
        creditos.forEach(credito => {
            const { idcliente, idempresa, idrepresentantelegal, idcodeudor } = credito;

            // Función auxiliar para agregar cliente al mapa
            const agregarClienteAlMapa = (idCliente, idEmpresa) => {
                if (!idCliente) return; // Ignorar si el cliente es nulo o indefinido
                if (!clienteEmpresaMap[idCliente]) {
                    clienteEmpresaMap[idCliente] = new Set();
                }
                clienteEmpresaMap[idCliente].add(idEmpresa); // Agregar la empresa
            };
        
            // Agregar cada cliente relacionado al mapa
            agregarClienteAlMapa(idcliente, idempresa);
            agregarClienteAlMapa(idrepresentantelegal, idempresa);
            agregarClienteAlMapa(idcodeudor, idempresa);
        });

        // 1.3 Filtrar clientes según lógica requerida
        const clientesFiltrados = clientes.filter(cliente => {
            //return cliente.idcliente === '42102493' && cliente.correo && cliente.correo.includes('@');
            return clientes;
        });

        // 2. Transformar los datos al formato requerido por la API externa usando una función centralizada
        const clientesTransformados = clientesFiltrados.flatMap(cliente => {
            const empresas = clienteEmpresaMap[cliente.idcliente];
            if (!empresas) return []; // Si el cliente no tiene empresas asociadas, omitir
            return Array.from(empresas).map(idempresa => ({
                cliente: transformarCliente(cliente),
                ur: idempresa,
            }));
        });

        // 3. Limitar concurrencia usando p-limit
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Máximo de 10 solicitudes concurrentes

        const resultados = await Promise.allSettled(
            clientesTransformados.map(({ cliente, ur }) =>
                limit(() => enviarClienteToGiitic(cliente, ur))
            )
        );

        // Resumir resultados
        const enviados = resultados.filter(result => result.status === 'fulfilled' && result.value.status === 'Enviado').length;
        const errores = resultados.filter(result => result.status === 'rejected' || result.value.status !== 'Enviado' && result.value.status !== 'omitido');

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
    let ciudadresidencia = cliente.ciudadresidencia;

    if(ciudadresidencia && ciudadresidencia.trim() !== "" && cliente.fuente === 'WURTH'){
        //se envia coigo de giitic
        ciudadresidencia= obtenerCodigoCiudad(ciudadresidencia);
    }
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
            ciudadresidencia: ciudadresidencia,
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
            telefonolaboral: cliente.telefonolaboral || '',
            telefonoresidencia: cliente.telefonoresidencia,
            tipocontrato: cliente.tipocontrato || 'No especificado',
            tipopagare: cliente.tipopagare || 'No especificado',
            tipovivienda: cliente.tipovivienda || 'No especificada',
        },
    };
}

async function enviarClienteToGiitic(cliente,ur) {
    try {
        //ur='170308620248819112351'; //fincovalpruebas
        //ur='156106437079879115975'; //valcreditopruebas
        // if(ur==='169297883213757200900' || ur==='1.70732780815861E+20' || ur==='170732780815861456923'){
        //     //omitiendo fincoval para la primera salida de prod
        //     return { clienteId: cliente.codigo, status: 'omitido' };
        // }
        const apiUrl = `${API_URL_GIITIC_CLI}?ur=${ur}`;
        const clienteJson = JSON.stringify(cliente);
        const response = await axios.post(apiUrl, clienteJson, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Validar respuesta
        if (response.data.httpResponse === 201 && response.data.mensaje === 'OK') {
            console.log(`Cliente con ID ${cliente.codigo || 'N/A'} enviado exitosamente.`);
            await clienteModel.marcarComoEnviadoGiitic(cliente.codigo);
            return { clienteId: cliente.codigo, status: 'Enviado' };
        } else {
            throw new Error(`Error al enviar cliente ${cliente.codigo}: ${response.data.mensaje}`);
        }
    } catch (err) {
        throw new Error(`Error al enviar cliente ${cliente.codigo}-${ur}:: ${err.response?.data.error || err.message}`);
    }
}

const obtenerCodigoCiudad = (nombreCiudad) => {
    const codigo = mapaCiudadesGiitic.get(nombreCiudad.toLowerCase());
    if (!codigo) {
        console.warn(`No se encontró el código para la ciudad: ${nombreCiudad}`);
        return null; // Maneja los casos de ciudad no encontrada
    }
    return codigo;
};

function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    enviarClientesToGiitic,
};

