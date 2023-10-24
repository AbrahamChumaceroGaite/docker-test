const { queryDatabase } = require('../../routes/shared/querys')

function obtenerNombresAuspiciadores(idevento) {
    const query = `SELECT a.nombre FROM evento_aus JOIN auspiciadores a ON evento_aus.idauspiciador = a.id WHERE idevento = ${idevento} AND a.disponible = 1;`;
    return queryDatabase(query).then((results) => results.map((result) => result.nombre).join("<br>"));
}

function actualizarCertificado(uid, fecha) {
    const query = `UPDATE certificado SET notificado = 1, status = 3, fecha_n = '${fecha}' WHERE uid = '${uid}'`;
    return queryDatabase(query);
}

module.exports = {
    obtenerNombresAuspiciadores,
    actualizarCertificado,
};
