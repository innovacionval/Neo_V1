const express = require('express');
const router = express.Router();
const cuotaController = require('../controllers/cuotaController');

router.get('/', cuotaController.getCuotas);
router.get('/:id', cuotaController.getCuotaPorId);
router.post('/', cuotaController.createCuota);
router.put('/:id', cuotaController.updateCuota);
router.delete('/:id', cuotaController.deleteCuota);

router.post('/sincronizar', cuotaController.sincronizarCuotas);
router.post('/enviar-terceros', cuotaController.enviarCuotasToWurth);

module.exports = router;