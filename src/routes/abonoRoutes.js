const express = require('express');
const router = express.Router();
const abonoController = require('../controllers/abonoController');

router.get('/', abonoController.getAbonos);
router.get('/:id', abonoController.getAbonoPorId);
router.post('/', abonoController.createAbono);
router.put('/:id', abonoController.updateAbono);
router.delete('/:id', abonoController.deleteAbono);

router.post('/sincronizar', abonoController.sincronizarAbonos);
router.post('/enviar-abonos', abonoController.enviarAbonosToGiitic);

module.exports = router;
