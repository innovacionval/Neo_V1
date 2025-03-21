const cron = require('node-cron');
const { verificarTokenExpirado } = require('./wurth/wurthConexion'); // token de wurth
const { sincronizarClientes } = require('./wurth/clientesWurthService'); 
const { sincronizarCreditos } = require('./wurth/creditosWurthService');
const { sincronizarAbonos } = require('./wurth/abonosWurthService');
const { sincronizarGestion } = require('./wurth/gestionWurthService');
const { sincronizarCuota } = require('./wurth/cuotasWurthService');
const { sincronizarGestiones } = require('./giitic/gestionGiiticService');
const { sincronizarCuotas } = require('./giitic/cuotasGiiticService');
const { enviarClientesToGiitic } = require('./giitic/clientesGiiticService'); 
const { enviarCreditosToGiitic} = require('./giitic/creditosGiiticService'); 
const { enviarAbonosToGiitic} = require('./giitic/abonosGiiticService'); 

// Variables de control para evitar ejecuciones simultáneas
let sincronizacionWurthEnEjecucion = false;
let sincronizacionGiiticEnEjecucion = false;
let envioGiiticEnEjecucion = false;
let verificarTokenEnEjecucion = false;

// Función genérica para ejecutar tareas con control de errores y tiempos
const ejecutarTarea = async (nombre, tarea) => {
  const time = `Cron ejecutado a las ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
  console.log(`Iniciando: ${nombre}`);
  console.log(time);

  const inicio = Date.now();
  try {
      await tarea();
      console.log(`${nombre} finalizado en ${(Date.now() - inicio) / 1000} segundos.`);
  } catch (error) {
      console.error(`Error en ${nombre}: ${error.message}`);
  }
};

// Función para ejecutar en serie con espera entre tareas
const ejecutarSincronizacionWurth = async () => {

   await ejecutarTarea("Sincronización de cuotas Giitic", sincronizarCuotas);
   await ejecutarTarea("Sincronización de cuotas Wurth", sincronizarCuota);
  
};

const ejecutarEnvioGiitic = async () => {
  await ejecutarTarea("Sincronización de clientes Wurth", sincronizarClientes);
  await ejecutarTarea("Sincronización de créditos Wurth", sincronizarCreditos);
  await ejecutarTarea("Sincronización de abonos Wurth", sincronizarAbonos);

  await ejecutarTarea("Envío de clientes a Giitic", enviarClientesToGiitic);
  //await ejecutarTarea("Envío de créditos a Giitic", enviarCreditosToGiitic);
  await ejecutarTarea("Envío de abonos a Giitic", enviarAbonosToGiitic);
};

const ejecutarSincronizacionGiitic = async () => {
  await ejecutarTarea("Sincronización de gestiones Giitic", sincronizarGestiones);
  await ejecutarTarea("Sincronización de gestiones Wurth", sincronizarGestion);
};

// Inicializar cron jobs
const iniciarCronJobs = async () => {
  console.log('Iniciando cron jobs...');

  console.log('Ejecución inmediata: Verificación de token al iniciar el sistema...');
  try {
    await verificarTokenExpirado();
  } catch (error) {
    console.error('Error en la ejecución inmediata del token: ', error.message);
  }

  // Verificación de token cada día a las 00:00
  cron.schedule('0 0 * * *', async () => {
    if (verificarTokenEnEjecucion) {
      console.log("Verificación de token aún en ejecución, se omite esta instancia.");
      return;
    }

    verificarTokenEnEjecucion = true;
    try {
        await verificarTokenExpirado();
    } catch (error) {
        console.error('Error en el cron job: Verificación de token Wurth -', error.message);
    } finally {
        verificarTokenEnEjecucion = false;
    }
  }, { timezone: 'America/Bogota' });

  console.log('Cron job programado con la zona horaria: America/Bogota');

  console.log('Ejecución inmediata: Sincronización completa al iniciar el sistema...');
  try {
      if (!sincronizacionWurthEnEjecucion) {
          sincronizacionWurthEnEjecucion = true;
          await ejecutarSincronizacionWurth();
          sincronizacionWurthEnEjecucion = false;
      } else {
          console.log("Sincronización Wurth ya está en ejecución, se omite.");
      }

      if (!envioGiiticEnEjecucion) {
        envioGiiticEnEjecucion = true;
        await ejecutarEnvioGiitic();
        envioGiiticEnEjecucion = false;
      } else {
          console.log("Envío a Giitic ya está en ejecución, se omite.");
      }

      if (!sincronizacionGiiticEnEjecucion) {
          sincronizacionGiiticEnEjecucion = true;
          // await ejecutarSincronizacionGiitic();
          sincronizacionGiiticEnEjecucion = false;
      } else {
          console.log("Sincronización Giitic ya está en ejecución, se omite.");
      }

  } catch (error) {
      console.error('Error en la ejecución inmediata de sincronización: ', error.message);
  } 


  // Sincronización a las 4 am
  cron.schedule('0 4 * * *', async () => {
    if (sincronizacionWurthEnEjecucion) {
      console.log("Sincronización Wurth aún en ejecución, se omite esta instancia.");
      return;
    }

    sincronizacionWurthEnEjecucion = true;
    try {
        await ejecutarSincronizacionWurth();
    } catch (error) {
        console.error("Error en la sincronización Wurth:", error.message);
    } finally {
        sincronizacionWurthEnEjecucion = false;
    }
  }, { timezone: 'America/Bogota' });

  // Sincronización a las 8 pm
  cron.schedule('0 19 * * *', async () => {
    if (sincronizacionGiiticEnEjecucion) {
      console.log("Sincronización Giitic aún en ejecución, se omite esta instancia.");
      return;
    }

    sincronizacionGiiticEnEjecucion = true;
    try {
        await ejecutarSincronizacionGiitic();
    } catch (error) {
        console.error("Error en la sincronización Giitic:", error.message);
    } finally {
        sincronizacionGiiticEnEjecucion = false;
    }
  }, { timezone: 'America/Bogota' });

  //Sicroniza cada 10 minutos
  cron.schedule('*/10 * * * *', async () => {
    if (envioGiiticEnEjecucion) {
      console.log("Envío a Giitic aún en ejecución, se omite esta instancia.");
      return;
    }

    envioGiiticEnEjecucion = true;
    try {
        await ejecutarEnvioGiitic();
    } catch (error) {
        console.error("Error en el envío a Giitic:", error.message);
    } finally {
        envioGiiticEnEjecucion = false;
    }
  }, { timezone: 'America/Bogota' });

  console.log('Cron jobs programados correctamente.');
};

module.exports = { iniciarCronJobs };
