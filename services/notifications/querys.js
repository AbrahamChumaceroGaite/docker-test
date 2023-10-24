function getAutorPushData(id) {
    const query = `SELECT n.endpoint, n.p256dh, n.auth FROM noti_subs n WHERE n.idautor = ?`
    const values = [id]
    return { query, values }
}

function getNewAutorPushData(id) {
    const queryPush = `SELECT n.endpoint, n.p256dh, n.auth FROM noti_subs n WHERE n.id = ?`
    const valuesPush = [id]
    return { queryPush, valuesPush }
}

function getCertifiedData(id) {
    const query = `SELECT e.id as idevento, e.idautor as id, e.nombre as event, CONCAT_WS(' ', pp.nombre, pp.apellido) AS persona FROM certificado c
    JOIN plantilla p ON c.idplantilla = p.id
    JOIN evento_p ep ON ep.id = c.idpersona_e
    JOIN evento e ON ep.idevento = e.id
    JOIN persona pp ON ep.idpersona = pp.id
   WHERE c.uid = ?`
    const values = [id]
    return { query, values }
}

function getEventGroupDataById(id) {
    const query = `SELECT e.idautor as idautor, e.id as idevento, e.idgrupo as idgrupo, e.nombre as evento, g.nombre as grupo FROM evento e
    JOIN grupos g ON e.idgrupo = g.id
    WHERE e.id = ${id} AND e.disponible = 1`
    const values = [id]
    return { query, values }
}

function getSponsorEventData(id) {
    const querysponsor = `SELECT e.idautor as id, s.nombre as sponsor, e.id as idevento, e.nombre as evento, CONCAT_WS(' ', p.nombre, p.apellido) AS persona, FROM evento_aus ea
    JOIN auspiciadores s ON ea.idauspiciador = s.id
    JOIN evento e ON ea.idevento = e.id
    JOIN usuario_r ur ON ea.idautor = ur.id
    JOIN usuario u ON ur.idusuario = u.id
    JOIN persona p ON u.idpersona = p.id
    WHERE ea.id = ?`
    const valuesponsor = [id]

    return { querysponsor, valuesponsor }
}

function getSignatureEventData(id) {
    const querysignature = `SELECT e.idautor as id, ps.nombre as signature, e.nombre as evento, CONCAT_WS(' ', p.nombre, p.apellido) AS persona, FROM evento_s ea
    JOIN usuario_fd s ON ea.idusuario_fd = s.id
    JOIN usuario_f uf ON s.idusuariof = uf.id
    JOIN evento e ON ea.idevento = e.id
    JOIN usuario_r ur ON ea.idautor = ur.id
    JOIN usuario u ON ur.idusuario = u.id
    JOIN usuario us ON uf.idusuario = us.id
    JOIN persona ps ON us.idpersona = ps.id
    JOIN persona p ON u.idpersona = p.id
    WHERE ea.id = ?`
    const valuesignature = [id]

    return { querysignature, valuesignature }
}

function getNewUserGroupData(id) {
    const queryuser = `SELECT g.id as idgrupo, g.nombre as grupo, ug.id as idug, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, FROM usuario_rg ug
    JOIN grupos g ON ug.idgrupo = g.id
    JOIN usuario_r ur ON ug.idusuario_r = ur.id
    JOIN usuario u ON ur.idusuario = u.id
    JOIN persona p ON u.idpersona = p.id WHERE ug.id = ${id} AND ug.disponible = 1`

    const valuesuser = [id]

    return { queryuser, valuesuser }
}

function getGroupMembers(idgrupo) {
    const querymember = `SELECT g.id as idgrupo, g.nombre as grupo, ug.id as idug, ur.id as idusuario, CONCAT_WS(' ', p.nombre, p.apellido) AS persona, FROM usuario_rg ug
      JOIN grupos g ON ug.idgrupo = g.id
      JOIN usuario_r ur ON ug.idusuario_r = ur.id
      JOIN usuario u ON ur.idusuario = u.id
      JOIN persona p ON u.idpersona = p.id WHERE g.id = ? AND ug.disponible = 1`;

    const valuesmember = [idgrupo];

    return { querymember, valuesmember };
}

function getPersonData(idpersona) {
    const queryPerson = `SELECT nombre AS nombreCompleto FROM persona WHERE id = ? AND disponible = 1`
    const valuesPerson = [idpersona]

    return { queryPerson, valuesPerson };
}
function insertUserToNotify(idgrupo, idug) {
    const queryInsert = `INSERT INTO grupos_re (idgrupo_msj, idug) VALUES (?,?)`;
    const valuesInsert = [idgrupo, idug];
    return { queryInsert, valuesInsert };
}

function insertUserGroupReport(idgrupo, mensaje) {
    const queryReport = "INSERT INTO grupos_msj (idgrupo, mensaje) VALUES (?,?)";
    const valuesReport = [idgrupo, mensaje];

    return { queryReport, valuesReport };
}

function insertUserEventReport(idevento, motivo, mensaje) {
    const queryReport = `INSERT INTO evento_re (idevento, motivo, mensaje) VALUES (?,?,?)`;
    const valuesReport = [idevento, motivo, mensaje];

    return { queryReport, valuesReport };
}

module.exports = {
    getNewAutorPushData,
    getCertifiedData,
    getEventGroupDataById,
    getSponsorEventData,
    getSignatureEventData,
    getAutorPushData,
    getNewUserGroupData,
    getGroupMembers,
    getPersonData,
    insertUserToNotify,
    insertUserGroupReport,
    insertUserEventReport
}