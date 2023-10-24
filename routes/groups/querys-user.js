// Funcion para obtener Grupos Segun el Usuario
function deleteUserGroup(id) {
    const query = `UPDATE usuario_rg SET disponible = 0 WHERE id = ?`
    const values = [id]

    return {query, values}
}

function checkDuplicates(idusuario_r, idgrupo){
    const checkQuery = `SELECT COUNT(*) as count FROM usuario_rg WHERE idusuario_r = ? AND idgrupo = ? AND disponible = 1`
    const checkValues = [idusuario_r, idgrupo]

    return {checkQuery, checkValues}
}

function inserNewUserGroup(idusuario_r, idgrupo, idautor){
    const insertQuery  = `INSERT INTO usuario_rg (idusuario_r, idgrupo, idautor) VALUES (?, ?, ?)`
    const insertValues = [idusuario_r, idgrupo, idautor]

    return {insertQuery, insertValues}
}



module.exports = {
    deleteUserGroup,
    checkDuplicates,
    inserNewUserGroup,
}