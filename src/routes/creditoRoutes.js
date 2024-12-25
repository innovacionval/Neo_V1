const express = require('express');
const router = express.Router();
const creditoController = require('../controllers/creditoController');

router.get('/', creditoController.getCreditos);
router.get('/:id', creditoController.getCreditoPorId);
router.post('/', creditoController.createCredito);
router.put('/:id', creditoController.updateCredito);
router.delete('/:id', creditoController.deleteCredito);

router.post('/enviar-creditos', creditoController.enviarCreditosToGiitic);

module.exports = router;