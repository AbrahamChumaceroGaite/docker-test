function checkDuplicatePersonEventQuery(idpersona, idevento) {
    const selectQuery = `SELECT * FROM evento_p WHERE idpersona = ? AND idevento = ? AND disponible = 1;`;
    const selectValues = [idpersona, idevento];

    return { selectQuery, selectValues };
}

function insertPersonEventQuery(idpersona, idevento, autor) {
    const insertQuery = `INSERT INTO evento_p (idpersona, idevento, disponible, idautor) VALUES (?, ?, 1, ?);`;
    const insertValues = [idpersona, idevento, autor]

    return { insertQuery, insertValues };
}

function getPersonEventQuery(idpersona) {
    const selectPersonaQuery = `SELECT nombre FROM persona WHERE id = ?;`;
    const selectPersonaValues = [idpersona];

    return { selectPersonaQuery, selectPersonaValues };
}

module.exports = {
    checkDuplicatePersonEventQuery,
    getPersonEventQuery,
    insertPersonEventQuery
}