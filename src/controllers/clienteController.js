const clienteModel = require('../models/clienteModel');
const { obtenerClientesDeWurth } = require('../services/wurth/wurthConexion');
const { enviarClienteToGiitic } = require('../services/giiticServices');
const { format } = require('date-fns');



async function enviarClientesToGiitic(req, res) {
    try {
        // 1. Obtener todos los clientes de la tabla tercero
        const clientes = await clienteModel.obtenerClientes();

        // 1.2 Filtrar clientes según lógica que se requiera
        const clientesFiltrados = clientes.filter(cliente => {
            // Condición para filtrar clientes
            // Por ejemplo: Solo enviar clientes con estado civil 'Soltero' y con correo válido
            return cliente.estadocivil === 'Soltero' && cliente.correo && cliente.correo.includes('@');
        });

        // 2. Transformar los datos al formato requerido por la API externa
        const clientesTransformados = clientesFiltrados.map(cliente => ({
            codigo: cliente.idcliente,
            primernombre: cliente.primernombre,
            segundonombre: cliente.segundonombre,
            primerapellido: cliente.primerapellido,
            segundopellido: cliente.segundopellido,
            nombreentero: `${cliente.primernombre} ${cliente.segundonombre || ''} ${cliente.primerapellido} ${cliente.segundopellido}`.trim(),
            tipoid: cliente.tipoid,
            id: cliente.idcliente,
            correo: cliente.correo,
            fechanacimientotxt: formatDate(cliente.fechanacimiento), // Formateo de fecha
            fechaexpdoctxt: formatDate(cliente.fechaexpdoc),         // Formateo de fecha
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
        }));

        // 3. Enviar cada cliente a la API externa
        const resultados = await Promise.all(
            clientesTransformados.map(cliente => enviarClienteToGiitic(cliente))
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
        console.error('Error al enviar clientes:', err.message);
        res.status(500).json({ error: 'Hubo un error al enviar los clientes' });
    }
}

// Obtener todos los clientes
async function getClientes(req, res) {
    try {
        const clientes = await clienteModel.obtenerClientes();
        res.json(clientes);
    } catch (err) {
        console.error('Error al obtener clientes:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Obtener un cliente por ID
async function getClientePorId(req, res) {
    try {
        const cliente = await clienteModel.obtenerClientePorId(req.params.id);
        if (!cliente) {
            return res.status(404).send('Cliente no encontrado');
        }
        res.json(cliente);
    } catch (err) {
        console.error('Error al obtener cliente:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Agregar un nuevo cliente
async function createCliente(req, res) {
    try {
        await clienteModel.agregarCliente(req.body);
        res.status(201).send('Cliente agregado con éxito');
    } catch (err) {
        console.error('Error al agregar cliente:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Actualizar un cliente
async function updateCliente(req, res) {
    try {
        await clienteModel.actualizarCliente(req.params.id, req.body);
        res.send('Cliente actualizado con éxito');
    } catch (err) {
        console.error('Error al actualizar cliente:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Eliminar un cliente
async function deleteCliente(req, res) {
    try {
        await clienteModel.eliminarCliente(req.params.id);
        res.send('Cliente eliminado con éxito');
    } catch (err) {
        console.error('Error al eliminar cliente:', err);
        res.status(500).send('Error en el servidor');
    }
}

function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    getClientes,
    getClientePorId,
    createCliente,
    updateCliente,
    deleteCliente,
    enviarClientesToGiitic,
};
