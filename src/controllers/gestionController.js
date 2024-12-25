const gestionModel = require('../../models/gestionModel');
const { format } = require('date-fns');

// Sincronización de gestiones
async function sincronizarGestiones(req, res) {
    try {
        // 1. Obtener las gestiones desde Giitic
        const gestionesGiitic = await gestionModel.obtenerGestionGiiticPorId('CRQ10-30171');
        // 2. Recorrer las gestiones
        for (const gestion of gestionesGiitic) {
            // Lógica para actualizar gestiones locales o sincronizar con una API externa
            const gestionExistente = await gestionModel.obtenerGestionPorId(gestion.idgestion);

            if (gestionExistente) {
                // 3. No es necesario actualizar una gestion existente
                continue;
            } else {
                // 4. Insertar si la gestión no existe
                await gestionModel.agregarGestion({
                    idcredito: gestion.idcredito,
                    fechagestion: formatDate(gestion.fechagestion),
                    accion: gestion.accion,
                    gestion: gestion.gestion,
                    fecharegistro: formatDate(gestion.fecharegistro),
                });
            }
        }

        res.send('Sincronización de gestiones completada con éxito');
    } catch (err) {
        console.error('Error durante la sincronización de gestiones:', err);
        res.status(500).send('Error en la sincronización de gestiones');
    }
}

// Obtener todas las gestiones
async function getGestiones(req, res) {
    try {
        const gestiones = await gestionModel.obtenerGestiones();
        res.json(gestiones);
    } catch (err) {
        console.error('Error al obtener gestiones:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Obtener una gestión por ID
async function getGestionPorId(req, res) {
    try {
        const gestion = await gestionModel.obtenerGestionPorId(req.params.id);
        if (!gestion) {
            return res.status(404).send('Gestión no encontrada');
        }
        res.json(gestion);
    } catch (err) {
        console.error('Error al obtener gestión:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Crear una nueva gestión
async function createGestion(req, res) {
    try {
        await gestionModel.agregarGestion(req.body);
        res.status(201).send('Gestión agregada con éxito');
    } catch (err) {
        console.error('Error al agregar gestión:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Actualizar una gestión existente
async function updateGestion(req, res) {
    try {
        await gestionModel.actualizarGestion(req.params.id, req.body);
        res.send('Gestión actualizada con éxito');
    } catch (err) {
        console.error('Error al actualizar gestión:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Eliminar una gestión
async function deleteGestion(req, res) {
    try {
        await gestionModel.eliminarGestion(req.params.id);
        res.send('Gestión eliminada con éxito');
    } catch (err) {
        console.error('Error al eliminar gestión:', err);
        res.status(500).send('Error en el servidor');
    }
}

// Formatear fechas en el formato requerido
function formatDate(fecha) {
    return format(new Date(fecha), 'yyyy-MM-dd');
}

module.exports = {
    sincronizarGestiones,
    getGestiones,
    getGestionPorId,
    createGestion,
    updateGestion,
    deleteGestion,
};
