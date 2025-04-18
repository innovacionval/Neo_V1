// config.js centraliza y llama las variables de entorno

require('dotenv').config();  // Cargar las variables de entorno del archivo .env

// Exportar las variables para usarlas en otros archivos
module.exports = {

  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  API_URL: process.env.API_URL,

  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,

  DBG_USER: process.env.DBG_USER,
  DBG_PASSWORD: process.env.DBG_PASSWORD,
  DBG_HOST: process.env.DBG_HOST,
  DBG_PORT: process.env.DBG_PORT,
  DBG_NAME: process.env.DBG_NAME,


  WURTH_LOGIN: process.env.WURTH_LOGIN,
  WURTH_PASS: process.env.WURTH_PASS,
  API_URL_WCR: process.env.API_URL_WCR,
  API_URL_WCL: process.env.API_URL_WCL,
  API_URL_WAB: process.env.API_URL_WAB,
  API_URL_WGC: process.env.API_URL_WGC,
  API_URL_WCI: process.env.API_URL_WCI,

  API_URL_GIITIC_CLI: process.env.API_URL_GIITIC_CLI,
  API_URL_GIITIC_CRE: process.env.API_URL_GIITIC_CRE,
  API_URL_GIITIC_ABONOS: process.env.API_URL_GIITIC_ABONOS,
  API_URL_GIITIC_CUOTA: process.env.API_URL_GIITIC_CUOTA,

  LLAVE_FINCOVAL: process.env.LLAVE_FINCOVAL,

};