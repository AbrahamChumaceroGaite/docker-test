const moment = require('moment-timezone');
moment.tz.setDefault('America/La_Paz');

function checkDuplicatesTable(idgrupo, nombre, eventoId) {
    // Consulta para verificar duplicados de nombre
    let query;
    let values;
  
    if (eventoId) {
      // Si se proporciona el ID del evento, excluye ese evento de la verificación
      query = `SELECT COUNT(*) AS count FROM evento WHERE nombre = ? AND idgrupo = ? AND disponible = 1 AND id != ?`;
      values = [nombre, idgrupo, eventoId];
    } else {
      query = `SELECT COUNT(*) AS count FROM evento WHERE nombre = ? AND idgrupo = ? AND disponible = 1`;
      values = [nombre, idgrupo];
    }
  
    return { query, values };
  }
 

function getEvent() {
    return `SELECT * FROM evento e WHERE disponible = 1`
}

function getEventById(id) {
    const query = `SELECT * FROM evento WHERE id = ? AND disponible = 1`
    const values = [id]
    return { query, values }
}

function postEvent(idgrupo, nombre, fecha, fechaF, logo, logoHash, autor) {

    let fechaI, fechaf;

    if (fecha) {
        const fechaOriginal = new Date(fecha);
        fechaOriginal.setUTCHours(4); // Ajustar hora para medianoche en GMT -4
        const fechaBolivia = moment.tz(fechaOriginal, 'America/La_Paz');
        fechaI = fechaBolivia.format('YYYY-MM-DD HH:mm:ss');
    }

    if (fechaF) {
        const fechaOriginalF = new Date(fechaF);
        fechaOriginalF.setUTCHours(4); // Ajustar hora para medianoche en GMT -4
        const fechaBoliviaF = moment.tz(fechaOriginalF, 'America/La_Paz');
        fechaf = fechaBoliviaF.format('YYYY-MM-DD HH:mm:ss');
    }

    const query = `INSERT INTO evento (idgrupo, nombre, fecha, fechaf, logo, logo_hash, disponible, idautor, fecha_c) VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW())`;
    const values = [idgrupo, nombre, fechaI, fechaf, logo || "0", logoHash, autor]
    return { query, values };

}

function putEvent(eventoId, idgrupo, nombre, fecha, fechaF, logo) {
    // Construir la consulta SQL de actualización
    let queryUpdate = "UPDATE evento SET";
    const params = [];
  
    if (idgrupo) {
      queryUpdate += " idgrupo = ?,";
      params.push(idgrupo);
    }
  
    if (nombre) {
      queryUpdate += " nombre = ?,";
      params.push(nombre);
    }
  
    if (fecha) {
      // Formatear la fecha en el formato deseado (asegúrate de usar la zona horaria adecuada)
      queryUpdate += " fecha = ?,";
      params.push(fecha);
    }
  
    if (fechaF) {
      // Formatear la fecha de fechaF de manera similar
      queryUpdate += " fechaf = ?,";
      params.push(fechaF);
    }
  
    if (logo) {
      // Verificar si se proporcionó un logo
      queryUpdate += " logo = ?,";
      params.push(logo);
  
      // Generar el nuevo hash del logo y agregarlo a la consulta si es necesario
      const logoHash = generateFileHash(logo);
      queryUpdate += " logo_hash = ?,";
      params.push(logoHash);
    }
  
    // Eliminar la coma adicional al final si se agregaron campos a actualizar
    if (params.length > 0) {
      queryUpdate = queryUpdate.slice(0, -1);
    } else {
      // No se proporcionaron campos para actualizar
      return null;
    }
  
    // Agregar el ID del evento a actualizar y la fecha de actualización
    queryUpdate += ", fecha_a = NOW() WHERE id = ?";
    params.push(eventoId);
  
    return { query: queryUpdate, params };
  }
  

function deleteEvent(id) {
    const query = `UPDATE evento SET disponible = 0 WHERE id = ?`
    const values = [id]
    return { query, values }
}

function lockEvent(id) {
    const query = `UPDATE evento SET cerrado = 1 WHERE id = ?`
    const values = [id]
    return { query, values }
}

function unlockEvent(id) {
    const query = `UPDATE evento SET cerrado = 0 WHERE id = ?`
    const values = [id]
    return { query, values }
}

function searchUser(id) {
    const query = `SELECT ur.id as id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, p.correo as correo, ur.contrasena as contrasena, r.rol as rol FROM usuario_r ur 
    JOIN rol r ON r.id = ur.idrol 
    JOIN usuario u ON u.id = ur.idusuario 
    JOIN persona p ON p.id = u.idpersona WHERE ur.disponible = 1 AND ur.id = ?`
    const values = [id]
    return { query, values }
}

module.exports = {
    getEvent,
    getEventById,
    postEvent,
    putEvent,
    deleteEvent,
    lockEvent,
    unlockEvent,
    searchUser,
    checkDuplicatesTable
};
