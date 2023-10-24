//Funcion para inciair sesion
function getLogin(ci) {
    return `SELECT ur.id as id, p.nombre as nombre, ur.contrasena as contrasena, r.rol as rol, r.id as idrol FROM usuario_r ur
    JOIN rol r ON r.id = ur.idrol 
    JOIN usuario u ON u.id = ur.idusuario 
    JOIN persona p ON p.id = u.idpersona
    WHERE ur.disponible = 1 AND p.ci = ${ci}`;
}

module.exports = {
   getLogin
};