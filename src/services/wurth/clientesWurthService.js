const axios = require('axios');

const config = require('../../config/config');
const clienteModel = require('../../models/clienteModel');
const {obtenerToken } = require('../../models/authtokenModel');

// URL de la API obtener clientes
const API_URL_WCL = config.API_URL_WCL;


async function obtenerClientesDeWurth() {
    try {
        // Obtener el token guardado de la base de datos 
        const tokenData = await obtenerToken('wurth_api');

        if (!tokenData || !tokenData.token) {
            console.log('No se encontró un token válido.');
            // await obtenerNuevoToken(); por si se requiere obtener otro en el futuro
            return;
        }

        // Configuración de las cabeceras
        const headers = {
            'Accept': 'application/json',
            'DOLAPIKEY': tokenData.token, // Token necesario para autenticarse
        };

        // Llamada a la API
        const response = await axios.get(API_URL_WCL, {
            headers: headers,
            params: {
                sortfield: 'siret',
                sortorder: 'ASC',
                limit: 4000
            }
        });

        if (response.status === 200) {
            console.log('Datos de clientes obtenidos exitosamente:', response.data);
            // Retornar los datos de la API
            return response.data;
        } else {
            // respuestas inesperadas
            console.error('Respuesta inesperada:', response.status, response.statusText);
            throw new Error(`Error al obtener . Código HTTP: ${response.status}`);
        }

    } catch (err) {
        console.error('Error al obtener clientes de la API:', err);
        throw new Error('No se pudo conectar con la API externa');
    }
}

//Sincronizacion de clientes de wurth
async function sincronizarClientes() {
    try {
        // 1. Obtener clientes desde la API externa
        const clientesExternos = await obtenerClientesDeWurth();

        // Filtrar clientes por ciudad; es un ejmp, se puede aplicar para los dias e mora
        // const clientesFiltrados = clientesExternos.filter(cliente => cliente.ciudadresidencia === 'Bogotá');
        
        // Paginación: Dividir los clientes en lotes (ej. 100 clientes por lote), la api de wurth tiene 3600 clientes aprox
        const clientesPorLote = 100; // Número de clientes por lote
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10); // Limitar la cantidad de promesas concurrentes (por ejemplo, 10)
        // Contadores para clientes actualizados e insertados
        let actualizados = 0;
        let insertados = 0;
        const resultados = []; // Array para almacenar los resultados de las promesas
        const errores = []; // Array para capturar errores con detalle

        // Iterar por los lotes de clientes
        for (let i = 0; i < clientesExternos.length; i += clientesPorLote) {
            const loteClientes = clientesExternos.slice(i, i + clientesPorLote);

            // Procesar clientes en paralelo, pero limitando la cantidad de promesas concurrentes
            const promesas = loteClientes.map(cliente =>
                limit(async () => {
                    try {
                        cliente = sanitizeObject(cliente); // Corregir valores vacíos
                        const clienteExistente = await clienteModel.obtenerClientePorId(cliente.idcliente);
                        
                        if (clienteExistente) {
                            await clienteModel.actualizarCliente(cliente.idcliente, cliente);
                            actualizados++;
                            return { status: 'actualizado', id: cliente.idcliente };
                        } else {
                            await clienteModel.agregarCliente(cliente);
                            insertados++;
                            return { status: 'insertado', id: cliente.idcliente };
                        }
                    } catch (error) {
                        errores.push({
                            id: cliente.idcliente,
                            mensaje: error.message,
                            cliente,
                        });
                        return { status: 'error', id: cliente.idcliente, error: error.message };
                    }
                })
            );

            // Esperar a que todas las promesas del lote se resuelvan
            const resultadosLote = await Promise.allSettled(promesas);

            // Procesar los resultados de este lote
            resultadosLote.forEach((resultado) => {
                if (resultado.status === 'fulfilled') {
                    resultados.push(resultado.value);
                } else {
                    errores.push({
                        id: 'desconocido',
                        mensaje: resultado.reason.message,
                    });
                }
            });
        }

        // Resumen final
        const resumenSincronizacion = `
        Resumen de sincronización de clientes:
        Clientes insertados: ${insertados}
        Clientes actualizados: ${actualizados}
        Clientes con errores: ${errores.length}
        Errores:`;

        const resumen = {
            resumen: resumenSincronizacion,
            errores: errores
        };

        console.log(resumen);

    } catch (err) {
        console.error('Error durante la sincronización de clientes:', err);
    }
}

/**
 * Convierte valores vacíos ('') o undefined a null para un objeto genérico.
 * @param {Object} obj - Objeto con los datos a sanitizar.
 * @returns {Object} - Objeto con los valores sanitizados.
 */
function sanitizeObject(obj) {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, value === '' || value === undefined ? null : value])
    );
}

module.exports = {
    sincronizarClientes, 
};