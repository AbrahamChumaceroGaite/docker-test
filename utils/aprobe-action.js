//Funcion para Aprobar Acciones de Usuarios
function aprobeAction(autor) {
    return `SELECT ur.id as id, p.nombre as nombre, p.correo as correo, ur.contrasena as contrasena, r.rol as rol FROM usuario_r ur 
    JOIN rol r ON r.id = ur.idrol 
    JOIN usuario u ON u.id = ur.idusuario 
    JOIN persona p ON p.id = u.idpersona WHERE ur.disponible = 1 AND ur.id = '${autor}'`;
  }

//Me caga tener que mandar el Rol desde el Front asi que mejor lo hago desde el Back con consultas
function isAdminOrOwner(iduser) {
  return `SELECT ur.id FROM usuario_r ur JOIN rol r ON ur.idrol = r.id WHERE ur.id = ${iduser} AND r.id IN (2, 3, 4)`;
}

  module.exports = {
    aprobeAction,
    isAdminOrOwner
};