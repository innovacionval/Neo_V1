const crypto = require('crypto');
const config = require('../config/config');  // Importar el archivo de configuración


// Clave secreta para la encriptación (almacenada de forma segura)
const ENCRYPTION_KEY = config.ENCRYPTION_KEY; // Generar clave única crypto.randomBytes(32).toString('hex')
const IV_LENGTH = 16; // Longitud del vector de inicialización (16 bytes)

/**
 * Cifra un texto utilizando AES-256-CBC.
 * @param {string} text - El texto a cifrar.
 * @returns {string} - El texto cifrado en formato base64.
 */
const cifrar = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Descifra un texto cifrado utilizando AES-256-CBC.
 * @param {string} text - El texto cifrado.
 * @returns {string} - El texto descifrado.
 */
const descifrar = (text) => {
  const [ivHex, encryptedText] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedText, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY,'hex'), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};


module.exports = {
    cifrar,
    descifrar
};


  