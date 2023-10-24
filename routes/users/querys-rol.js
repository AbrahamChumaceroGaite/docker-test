function getUserRol(){
    return `SELECT ur.id as id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, r.rol as rol, ur.fecha_c FROM usuario_r ur JOIN rol r ON r.id = ur.idrol JOIN usuario u ON u.id = ur.idusuario JOIN persona p ON p.id = u.idpersona WHERE ur.disponible = 1`;
}

module.exports = {
    getUserRol
}