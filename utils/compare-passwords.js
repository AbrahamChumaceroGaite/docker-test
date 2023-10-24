const bcrypt = require('bcrypt');
//Funcion para comparar contraseñas
function comparePassword(contrasena, hash) {
    return bcrypt.compareSync(contrasena, hash);
  }

  module.exports = {
    comparePassword
};