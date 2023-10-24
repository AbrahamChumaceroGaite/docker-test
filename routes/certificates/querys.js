function readUpdateCertified (fechan, id) {
    const query = `UPDATE certificado SET revisado = 1, fecha_r = ? WHERE uid = ?`
    const values = [fechan, id]
    return {query, values}
}

function readUpdateQRCertified (fechan, id) {
    const query = `UPDATE certificado SET vistas = (SELECT vistas FROM (SELECT * FROM certificado) AS c WHERE uid = ?) + 1, fecha_v = ? WHERE uid = ?`
    const values = [id, fechan, id]
    return {query, values}
}

function downloadCertified (fechan, id) {
    const query = `UPDATE certificado SET descargas = (SELECT descargas FROM (SELECT * FROM certificado) AS c WHERE uid = ?) + 1, fecha_d = ? WHERE uid = ?`
    const values = [id, fechan, id]
    return {query, values}
}

function checkDuplicateCertified (idplantilla, idpersona_e) {
    const duplicateQuery = `SELECT id FROM certificado WHERE idplantilla = ? AND idpersona_e = ?`;
    const duplicateValues = [idplantilla, idpersona_e];

    return {duplicateQuery, duplicateValues}
}

function insertCertified(uid, idplantilla, idpersona_e, autor){
    const insertCertificadoQuery = `INSERT INTO certificado (uid, idplantilla, idpersona_e, disponible, idautor) VALUES (?, ?, ?, 1, ?)`;
    const insertCertificadoValues = [uid, idplantilla, idpersona_e, autor];

    return {insertCertificadoQuery, insertCertificadoValues}
}

function updatePersonEvent(idpersona_e){
    const updateEventoQuery = `UPDATE evento_p SET entregado = 1 WHERE id = ?`;
    const updateEventoValues = [idpersona_e];
    return {updateEventoQuery, updateEventoValues}
}

module.exports = { 
    readUpdateCertified,
    readUpdateQRCertified,
    checkDuplicateCertified,
    insertCertified,
    downloadCertified,
    updatePersonEvent }