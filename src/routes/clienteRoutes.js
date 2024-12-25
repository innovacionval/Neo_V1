const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

router.get('/', clienteController.getClientes);
router.get('/:id', clienteController.getClientePorId);
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.delete('/:id', clienteController.deleteCliente);

router.post('/enviar-terceros', clienteController.enviarClientesToGiitic);

module.exports = router;
