const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const messages = require('../../templates/messages')
const { comparePassword }= require('../../utils/compare-passwords');
const { aprobeAction, isAdminOrOwner } = require('../../utils/aprobe-action');
const { getLogin } = require('./querys')

// Función para generar un token JWT
function generateToken(data) {
  return jwt.sign(data, 'secreto', { expiresIn: '1h' });
}

// Endpoint de inicio de sesión
router.post('/post', (req, res) => {
  const { ci, contrasena } = req.body;
  // Buscar el usuario en la base de datos por username
  const query = getLogin(ci);
  db.query(query, (error, results) => {
    if (error) {
      console.log(error)
      return res.status(500).json({ mensaje: messages.errorquery });
    } else {
      if (results.length > 0) {
        const user = results[0];
        // Comparar la contraseña ingresada con la almacenada en la base de datos
        if (comparePassword(contrasena, user.contrasena)) {
          // Generar un token JWT con los datos del usuario
          const token = generateToken({
            iduser: user.id,
            username: user.nombre,
            role: user.idrol,
            rol: user.rol
          });

          res.json({ token, iduser: user.id, username: user.nombre, role: user.idrol, rol: user.rol });

        } else {
          res.status(500).json({ mensaje: messages.loginfailed });
        }
      } else {
        res.status(500).json({ mensaje: messages.loginouser });
      }
    }
  });
});

router.post('/admin/aprobe/pass/post', (req, res) => {
  const { autor, contrasena, idRol } = req.body;
  // Filtrar el rol
  if (idRol !== "Maestro" && idRol !== "2" && idRol !== "3") {
    return res.status(403).json({ error: 'Usted no tiene el Rol Necesario para esta Operación' });
  }

  // Buscar el usuario en la base de datos por iduser
  const query = aprobeAction(autor);
  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: messages.errorquery });
    }  else {
      if (results.length > 0) {
        const user = results[0];
        // Comparar la contraseña ingresada con la almacenada en la base de datos
        if (comparePassword(contrasena, user.contrasena)) {
          res.json({mensaje: messages.correctpassword });
        } else {
          res.status(500).json({ mensaje: messages.loginfailed });
        }
      } else {
        res.status(500).json({ mensaje: messages.loginouser });
      }
    }
  });
});
module.exports = router;
