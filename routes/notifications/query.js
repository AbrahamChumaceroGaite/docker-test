function registersubs(id, endpoint, p256dh, auth) {
    const querySubs = 'INSERT INTO noti_subs (idautor, endpoint, p256dh, auth) VALUES (?,?,?,?)'
    const valuesSubs = [id, endpoint, p256dh, auth]
    return { querySubs, valuesSubs }
}

function checkIfExists(id, endpoint, p256dh, auth) {
    // Realiza una consulta para verificar si ya existe un registro con los mismos valores
    const queryCheck = 'SELECT * FROM noti_subs WHERE idautor = ? AND endpoint = ? AND p256dh = ? AND auth = ?';
    const valuesCheck = [id, endpoint, p256dh, auth];
    return { queryCheck, valuesCheck }
  }

function getNotificacions(id, startIndex, numRows) {
    let query = `SELECT msj.*, re.id as idmsj FROM grupos_msj msj
    JOIN grupos_re re ON msj.id = re.idgrupo_msj
    JOIN usuario_rg rg ON re.idug = rg.id
    JOIN usuario_r ur ON rg.idusuario_r = ur.id
    WHERE ur.id = ? AND re.disponible = 1 ORDER BY msj.fechaC DESC `;

    query += ` LIMIT ${startIndex}, ${numRows}`;

    const queryNotifications = query
    const valuesNotificacions = [id]

    return { queryNotifications, valuesNotificacions }
}

function getCountNotificacions(id) {
    const queryCountNotifications = `SELECT COUNT(*) as totalItems FROM grupos_msj msj
    JOIN grupos_re re ON msj.id = re.idgrupo_msj
    JOIN usuario_rg rg ON re.idug = rg.id
    JOIN usuario_r ur ON rg.idusuario_r = ur.id
    WHERE ur.id = ? AND re.disponible = 1 ORDER BY msj.fechaC DESC `
    const valuesCountNotificacions = [id]

    return { queryCountNotifications, valuesCountNotificacions }
}

function getReport(id, startIndex, numRows) {
    let queryReport = `SELECT ev.* FROM evento_re ev
    JOIN evento e ON ev.idevento = e.id WHERE e.idautor = ? ORDER BY ev.fechaC DESC`

    queryReport += ` LIMIT ${startIndex}, ${numRows}`;

    const querReports = queryReport
    const valuesReports = [id]

    return { querReports, valuesReports }
}

function getCountReports(id) {
    const queryCountNotifications = `SELECT COUNT(*) as totalItems FROM evento_re ev
    JOIN evento e ON ev.idevento = e.id
    JOIN usuario_r ON e.idautor = ? WHERE ev.disponible = 1 ORDER BY ev.fechaC DESC`
    const valuesCountNotificacions = [id]

    return { queryCountNotifications, valuesCountNotificacions }
}

function readNotification(id) {
    const queryNotifications = `UPDATE grupos_re SET disponible = 0 WHERE id = ?`
    const valuesNotificacions = [id]

    return { queryNotifications, valuesNotificacions }
}

function MainDashboard(id) {

    const selectUsers = `SELECT COUNT(*) as totalusuarios FROM usuario_r WHERE idautor = ${id};`

    const selectEvents = `SELECT COUNT(*) as totaleventos FROM evento WHERE idautor = ${id};`

    const selectGroups = `SELECT COUNT(*) as totalgrupos FROM grupos WHERE idautor = ${id};`

    const selectCertified = `SELECT COUNT(*) as totalcertificados FROM certificado c
   JOIN plantilla p ON c.idplantilla = p.id
   JOIN evento e ON p.idevento = e.id
   WHERE e.idautor = ${id};`

    const selectSponsors = `SELECT COUNT(*) as totalauspiciadores FROM auspiciadores WHERE idautor = ${id};`

    const selectSignatures = `SELECT COUNT(*) as totalfirmantes FROM firmas WHERE idautor = ${id};`

    const selectTemplates = `SELECT COUNT(*) as totalplantillas FROM plantilla p JOIN evento e ON p.idevento = e.id WHERE e.idautor = ${id};`

    const selectTotalCheck = `SELECT COUNT(*) as totalrevision FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 1 AND e.idautor = ${id};`

    const selectTotalWait= `SELECT COUNT(*) as totalespera FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 2 AND e.idautor = ${id};`

    const selectTotalSend = `SELECT COUNT(*) as totalemitidos FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 3 AND e.idautor = ${id};`

    const selectTotalAnulates = `SELECT COUNT(*) as totalanulados FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 4 AND e.idautor =  ${id};`

    const values = [id]
    return { selectUsers, selectEvents, selectGroups, selectCertified, selectSponsors, selectSignatures, selectTemplates, selectTotalCheck, selectTotalWait, selectTotalSend, selectTotalAnulates, values }

}

module.exports = {
    registersubs,
    checkIfExists,
    getNotificacions,
    getCountNotificacions,
    getReport,
    getCountReports,
    readNotification,
    MainDashboard
}