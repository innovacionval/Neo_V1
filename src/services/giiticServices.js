const axios = require('axios');

// URL del servidor externo de giitic para enviar clientes
const API_URL_GIITIC_CLI = 'https://valcreditopruebas.giitic.com/rest3/valcredito/infocliente?ur=170308620248819112351';
// URL del servidor externo de Giitic para enviar créditos
const API_URL_CREDITOS_GIITIC = 'https://valcredito.giitic.com/rest3/valcredito/credito';
// URL del servidor externo de Giitic para enviar Abonos
const API_URL_ABONOS_GIITIC = 'https://valcredito.giitic.com/rest3/valcredito/abono';

async function enviarClienteToGiitic(cliente) {
    try {

        const clienteJson = JSON.stringify(cliente);
        console.log('URL:', API_URL_GIITIC);
        console.log('Datos enviados:', clienteJson);
        const response = await axios.post(API_URL_GIITIC_CLI, clienteJson, {
            headers: { 'Content-Type': 'application/json' },
        });
         // Validar respuesta
        if (response.data.httpResponse === 200 && response.data.mensaje === "OK") {
            console.log(`Cliente ${cliente.codigo} enviado exitosamente.`);
            return { clienteId: cliente.codigo, status: "Enviado" };
        } else {
            console.error(`Error al enviar cliente ${cliente.codigo}: ${response.data.mensaje}`);
            return { clienteId: cliente.codigo, status: "Error", detalle: response.data.mensaje };
        }
        
    } catch (err) {
        // Manejar los errores de la solicitud
        console.error(`Error al enviar cliente ${cliente.codigo}:`, err.response?.data || err.message);
        return { clienteId: cliente.codigo, status: "Error", detalle: err.response?.data || err.message };
    }
}

async function enviarCreditoToGiitic(credito) {
    try {
        // Convertir el objeto crédito a JSON
        const creditoJson = JSON.stringify(credito);
        console.log('URL:', API_URL_CREDITOS_GIITIC);
        console.log('Datos enviados:', creditoJson);

        // Realizar la solicitud POST
        const response = await axios.post(API_URL_CREDITOS_GIITIC, creditoJson, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Validar respuesta
        if (response.data.httpResponse === 200 && response.data.mensaje === "OK") {
            console.log(`Crédito con consecutivo ${credito.credito.consecutivo || 'N/A'} enviado exitosamente.`);
            return { creditoId: credito.credito.consecutivo || 'N/A', status: "Enviado" };
        } else {
            console.error(`Error al enviar crédito ${credito.credito.consecutivo || 'N/A'}: ${response.data.mensaje}`);
            return { creditoId: credito.credito.consecutivo || 'N/A', status: "Error", detalle: response.data.mensaje };
        }

    } catch (err) {
        // Manejar errores de la solicitud
        console.error(`Error al enviar crédito ${credito.credito.consecutivo || 'N/A'}:`, err.response?.data || err.message);
        return { creditoId: credito.credito.consecutivo || 'N/A', status: "Error", detalle: err.response?.data || err.message };
    }
}


/**
 * Servicio para obtener los datos de una deuda desde la API externa giitic.
 * @param {string} deudaId - El identificador de la deuda (parámetro "d").
 * @returns {Promise<Object>} - Retorna un objeto con los datos de la deuda.
 * @throws {Error} - Lanza un error si no se puede acceder a la API.
 */
const obtenerDatosDeudaGiitic = async (deudaId) => {
  try {
    const url = `https://valcreditopruebas.giitic.com/rest3/valcredito/simulardeuda?ur=170732780815861456923&d=${deudaId}`;
    const response = await axios.get(url);

    // Validar si la respuesta contiene los datos esperados
    if (!response.data || !response.data.objetores) {
      throw new Error('La respuesta de la API no contiene los datos esperados.');
    }

    return response.data.objetores; // Retornar los datos de la deuda
  } catch (error) {
    console.error('Error al obtener los datos de la deuda:', error.message);
    throw new Error('No se pudieron obtener los datos de la deuda. Por favor, intente más tarde.');
  }
};


async function enviarAbonoToGiitic(abono) {
    try {

        const abonoJson = JSON.stringify(abono);
        console.log('URL:', API_URL_ABONOS_GIITIC);
        console.log('Datos enviados:', clienteJson);
        const response = await axios.post(API_URL_ABONOS_GIITIC,abonoJson, {
            headers: { 'Content-Type': 'application/json' },
        });
         // Validar respuesta
        if (response.data.httpResponse === 200 && response.data.mensaje === "OK") {
            console.log(`Abono ${abono.idabono} enviado exitosamente.`);
            return { abonoId: abono.idabono, status: "Enviado" };
        } else {
            console.error(`Error al enviar cliente ${abono.idabono}: ${response.data.mensaje}`);
            return { abonoId: abono.idabono, status: "Error", detalle: response.data.mensaje };
        }
        
    } catch (err) {
        // Manejar los errores de la solicitud
        console.error(`Error al enviar abono ${abono.idabono}:`, err.response?.data || err.message);
        return { abonoId: abono.idabono, status: "Error", detalle: err.response?.data || err.message };
    }
}

module.exports = {
     enviarClienteToGiitic,
     enviarCreditoToGiitic,
     obtenerDatosDeudaGiitic,
     enviarAbonoToGiitic
};