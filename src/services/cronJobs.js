const cron = require('node-cron');
const { verificarTokenExpirado } = require('./wurth/wurthConexion'); // token de wurth
const { sincronizarClientes } = require('./wurth/clientesWurthService'); 
const { sincronizarCreditos } = require('./wurth/creditosWurthService');
const { sincronizarAbonos } = require('./wurth/abonosWurthService');
const { sincronizarGestion } = require('./wurth/gestionWurthService');
const { sincronizarGestiones } = require('./giitic/gestionGiiticService');
const { enviarClientesToGiitic } = require('./giitic/clientesGiiticService'); 
const { enviarCreditosToGiitic} = require('./giitic/creditosGiiticService'); 
const { enviarAbonosToGiitic} = require('./giitic/abonosGiiticService'); 

// Programar el cron job
const iniciarCronJobs = () => {
  console.log('Cron job para verificar la expiración del token Wurth iniciado.');

  // Ejecutar inmediatamente al iniciar el sistema
  try {
    console.log('Ejecución inmediata: Verificación de token al iniciar el sistema...');
    verificarTokenExpirado();
    const time = `Verificacion ejecutada a las ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
    console.log(time);

  } catch (error) {
    console.error('Error en la ejecución inmediata: ', error.message);
  }

  // Programar el cron token para ejecutarse cada día a las 00:00
  cron.schedule('0 0 * * *', () => {
    try {
        const time = `Cron ejecutado a las Cron ejecutado a las ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
        console.log('Iniciando cron job: Verificacion de token Wurth... ');
        console.log(time);
        
        verificarTokenExpirado();
    } catch (error) {
        console.error('Error en el cron job: Verificacion de token Wurth -', error.message);
    }
  }, { scheduled: true, timezone: 'America/Bogota' });

  console.log('Cron job programado con la zona horaria: America/Bogota');

  // Programar el cron de sincronizacion wurh para ejecutarse cada día a las 00:00
  cron.schedule('*/5 * * * *', async () => {
    try {
        const time = `Cron ejecutado a las ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
        console.log('Iniciando cron job: Sincronización de clientes y créditos Wurth...');
        console.log(time);

        console.log('Iniciando sincronización de clientes...');
        await sincronizarClientes(); // Esperar a que termine la sincronización de clientes
        console.log('Sincronización de clientes finalizada.');

        console.log('Iniciando sincronización de créditos...');
        await sincronizarCreditos(); // Solo inicia después de que termine la sincronización de clientes
        console.log('Sincronización de créditos finalizada.');

        console.log('Iniciando sincronización de abonos...');
        await sincronizarAbonos(); // Solo inicia después de que termine la sincronización de creditos
        console.log('Sincronización de abonos finalizada.');

        console.log('Iniciando sincronización de gestiones de GIITIC...');
        await sincronizarGestiones(); // Solo inicia después de que termine la sincronización de creditos
        console.log('Sincronización de gestiones giitic finalizada.');

        console.log('Iniciando sincronización de gestiones hacia WURTH...');
        await sincronizarGestion(); // Solo inicia después de que termine la sincronización de creditos
        console.log('Sincronización de gestiones hacia wurth finalizada.');


        console.log('Fin de cron job: Sincronización de clientes y créditos Wurh.');
    } catch (error) {
        console.error('Error en el cron job: Sincronización de clientes y créditos Wurh -', error.message);
    }
}, { scheduled: true, timezone: 'America/Bogota' });


// Programar el cron de sincronizacion Giitic para ejecutarse cada día a las 00:00
cron.schedule('*/30 * * * *', async () => {
  try {
      const time = `Cron ejecutado a las ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
      console.log('Iniciando cron job: Envio de clientes y créditos Giitc...');
      console.log(time);

      console.log('Iniciando envio de clientes...');
      await enviarClientesToGiitic(); // Esperar a que termine la sincronización de clientes
      console.log('Envio de clientes finalizada.');

      console.log('Iniciando envio de créditos...');
      await enviarCreditosToGiitic(); // Solo inicia después de que termine la sincronización de clientes
      console.log('Envio de créditos finalizada.');

      console.log('Iniciando envio de abonos a Giitic...');
      await enviarAbonosToGiitic(); // Solo inicia después de que termine la sincronización de creditos
      console.log('Envio de abonos finalizada.');

      console.log('Fin de cron job: Envio de clientes y créditos Giitic.');
  } catch (error) {
      console.error('Error en el cron job: Sincronización de clientes y créditos Wurh -', error.message);
  }
}, { scheduled: true, timezone: 'America/Bogota' });
    
};

module.exports = { iniciarCronJobs };
