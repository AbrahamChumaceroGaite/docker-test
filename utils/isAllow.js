//Me caga tener que mandar el Rol desde el Front asi que mejor lo hago desde el Back con consultas
function isAdminOrOwner(iduser) {
    return `SELECT ur.id FROM usuario_r ur JOIN rol r ON ur.idrol = r.id WHERE ur.id = ${iduser} AND r.id IN (2, 3, 4)`;
}
module.exports = {
    isAdminOrOwner
};