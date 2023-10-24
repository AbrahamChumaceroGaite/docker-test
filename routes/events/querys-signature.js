function checkDuplicatesSignature(idusuario, idevento) {
    const selectQuery = `SELECT * FROM evento_s WHERE idusuario_fd = ? AND idevento = ?;`;
    const selectValues = [idusuario, idevento];

    return { selectQuery, selectValues };
}

function selectPersonQuery(idusuario) {
    const selectPersonaQuery = `SELECT es.idusuario_fd, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, FROM evento_s es
    JOIN usuario_fd uf ON es.idusuario_fd = uf.id
    JOIN usuario_f u ON uf.idusuariof = u.id      
    JOIN usuario u2 ON u.idusuario = u2.id 
    JOIN persona p ON p.id = u2.idpersona WHERE es.idusuario_fd = ?;`;
    const selectPersonaValues = [idusuario];

    return { selectPersonaQuery, selectPersonaValues };
}

function insertSignatureQuery(idusuario, idevento, autor) {
    const insertQuery = `INSERT INTO evento_s (idusuario_fd, idevento,  idautor) VALUES (?, ?, ?);`;
    const insertValues = [idusuario, idevento, autor];

    return { insertQuery, insertValues };
}

module.exports = {
    checkDuplicatesSignature,
    selectPersonQuery,
    insertSignatureQuery
};
