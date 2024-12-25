const axios = require('axios');
const config = require('../../config/config');
const { guardarToken, obtenerToken, actualizarTokenPorNombre } = require('../../models/authtokenModel');

const LOGIN = config.WURTH_LOGIN;
const PASS = config.WURTH_PASS;

// URL de la API para obtener el token
const tokenUrl = `https://wurthco.net/crm/api/index.php/login?login=${LOGIN}&password=${PASS}`;

// Función para obtener un nuevo token
const obtenerNuevoToken = async () => {
    try {
        const response = await axios.get(tokenUrl);
        // const response = { 
        //     status: 200,
        //     data:{
        //         success: {
        //         code: 200,
        //         token: '767b097864e2fa9c87fdfc61a212565eece0f6a8',
        //         entity: '1',
        //         message: 'Welcome fincoval - This is your token (recorded for your user). You can use it to make any REST API call, or enter it into the DOLAPIKEY field to use the Dolibarr API explorer.'
        //         }
        //     }
        //   }
        if (response.status >= 200 && response.status < 300) {
            console.log('Token obtenido exitosamente:', response.data);
            const tokenData = response.data;

             // Verifica que la respuesta contiene el token esperado
            if (tokenData && tokenData.success && tokenData.success.token) {
                console.log('Token obtenido exitosamente:', tokenData.success.token);
            } else {
                console.error('La respuesta no contiene un token válido.');
                throw new Error('Respuesta inválida, no se encontró el token.');
            }

            // Calcular la fecha de expiración (14 días a partir de la fecha actual segun api de wurth)
            const fechaExpiracion = new Date();
            fechaExpiracion.setDate(fechaExpiracion.getDate() + 13); // setteo 13 para mas certeza

            // Guardar el nuevo token en la base de datos
            const nombre = 'wurth_api'; // Nombre del servicio o sistema
            const token = tokenData.success.token;
            const metadata = { tipo: 'API Token', renovacion: '14 días' };

             // Obtener el token guardado de la base de datos si existe
            const tokenDB = await obtenerToken('wurth_api');

            if (!tokenDB) {
                console.log('No se encontró un token válido para actualizar. Guardando uno nuevo...');
                await guardarToken(nombre,LOGIN,PASS, token, fechaExpiracion, metadata);
                
            }else{
                console.log('Token actualizando..');
                await actualizarTokenPorNombre(nombre,LOGIN,PASS, token, fechaExpiracion, metadata);
            }

            console.log('Token actualizado exitosamente');
        } else {
            // respuestas inesperadas en el rango 2xx
            console.error('Respuesta inesperada:', response.status, response.statusText);
            throw new Error(`Error al obtener el token. Código HTTP: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error al obtener o guardar el nuevo token:', error.message);
        if(error.response){
            console.error('Error al obtener nuevo token:', error.response.data.error.message); 
        }
    }
};

// Función para verificar si el token ha expirado y obtener uno nuevo si es necesario
const verificarTokenExpirado = async () => {
    try {
        // Obtener el token guardado de la base de datos 
        const tokenData = await obtenerToken('wurth_api');

        if (!tokenData || !tokenData.fecha_expiracion) {
            console.log('No se encontró un token válido. Obteniendo uno nuevo...');
            await obtenerNuevoToken();
            return;
        }

        // Verificar si el token ha expirado
        const fechaExpiracion = new Date(tokenData.fecha_expiracion);
        const ahora = new Date();

        if (fechaExpiracion <= ahora) {
            console.log('El token ha expirado. Obteniendo un nuevo token...');
            await obtenerNuevoToken();
        } else {
            console.log('El token sigue siendo válido');
        }
    } catch (error) {
        console.error('Error al verificar el token:', error.message);
        console.log('No se encontró un token válido. Obteniendo uno nuevo...');
        await obtenerNuevoToken();
    }
};


module.exports = {
     verificarTokenExpirado
};