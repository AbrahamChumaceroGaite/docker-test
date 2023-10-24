const express = require("express");
const router = express.Router();
const db = require("../../services/db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const { getPaginatedUsers, getTotalUsersRecords } = require("./querys")
const { getUserRol } = require("./querys-rol")
const { queryDatabase } = require('../shared/querys');
const messages = require('../../templates/messages')
require("moment-timezone");

router.post("/post", (req, res) => {
  const idpersona = req.body.nombre;
  const autor = req.body.autor;

  // Verificar si ya existe un registro con el mismo nombre
  const duplicateQuery = `SELECT * FROM usuario WHERE idpersona = '${idpersona}'`;
  db.query(duplicateQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Se encontró un duplicado
      const mensajeError = `Ya existe un registro con la misma persona`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la inserción
    const query = `INSERT INTO usuario (idpersona, disponible, idautor) VALUES (?, 1,?);`;
    const values = [idpersona, autor]
    db.query(query, values, (error, results) => {
      if (error) throw error;
      res.json({ mensaje: "Registrado exitosamente" });
    });
  });
});

router.get("/get", (req, res) => {
  const query = ` SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, u.*, COALESCE(f.firma, 'Sin Firma') AS firma, COALESCE(d.nombre, 'Sin Cargo') AS direccion FROM usuario u LEFT JOIN persona p on u.idpersona = p.id LEFT JOIN usuario_f uf on u.id = uf.idusuario LEFT JOIN firmas f on uf.idfirma = f.id LEFT JOIN usuario_fd fd on uf.id = fd.idusuariof LEFT JOIN direccion d on fd.idireccion = d.id WHERE u.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/getLazy", async (req, res) => {
  const { id, first, rows, globalFilter, sortField, sortOrder } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);

  try {
    const query = await getPaginatedUsers(id, globalFilter, sortField, sortOrder, startIndex, numRows)

    const countQuery = await getTotalUsersRecords(id);

     // Obtener el total de registros
     const countResult = await queryDatabase(countQuery);

     if (!countResult || countResult.length === 0) {
      return res.status(500).json({ mensaje: messages.emptytable });
    }

    const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

    // Obtener los registros paginados
    const results = await queryDatabase(query);

    res.json({ items: results, totalRecords: totalRecords });
  } catch (error) {
    // Manejar errores aquí
    console.log(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT p.nombre, p.id as "idpersona", u.id FROM usuario u JOIN persona p ON u.idpersona = p.id WHERE u.id = ${id} AND u.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/put/:id", (req, res) => {
  const id = req.params.id;
  const { idpersona, fecha_c } = req.body;

  // Verificar si existe otro registro con el mismo nombre
  const duplicateQuery = `SELECT * FROM usuario WHERE idpersona = '${idpersona}' AND id <> ${id}`;
  db.query(duplicateQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Se encontró un duplicado
      const mensajeError = `Ya existe una persona con los mismos Datos`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la actualización
    const query = `UPDATE usuario SET idpersona = '${idpersona}', fecha_a = NOW() WHERE id = ${id}`;
    db.query(query, (error, results) => {
      if (error) throw error;
      res.json({ mensaje: "Registro actualizado exitosamente" });
    });
  });
});

router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE usuario SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

////// TABLA DE USUARIO Y FIRMA //////

router.post("/firma/post", (req, res) => {
  const { idusuario, idfirma, autor } = req.body;

  // Verificar si existe otro registro con la misma combinación de idusuario e idfirma
  const duplicateCombinationQuery = `SELECT * FROM usuario_f WHERE idusuario = ${idusuario} AND idfirma = ${idfirma} AND disponible = 1`;
  db.query(duplicateCombinationQuery, (combinationError, combinationResults) => {
    if (combinationError) {
      return res.status(500).json({ mensaje: "Error en la consulta de combinación en la base de datos" });
    }

    if (combinationResults.length > 0) {
      // Se encontró un duplicado en la combinación de idusuario e idfirma
      const mensajeError = `Ya existe un registro con la misma combinación de Usuario y Firma`;
      return res.json({ mensaje: mensajeError });
    }

    // Verificar si existe otro registro con la misma idfirma
    const duplicateFirmaQuery = `SELECT * FROM usuario_f WHERE idfirma = ${idfirma} AND disponible = 1`;
    db.query(duplicateFirmaQuery, (firmaError, firmaResults) => {
      if (firmaError) {
        return res.status(500).json({ mensaje: "Error en la consulta de firma en la base de datos" });
      }

      if (firmaResults.length > 0) {
        // Se encontró un duplicado en idfirma
        const mensajeError = `Ya existe un registro con la misma Firma`;
        return res.status(500).json({ mensaje: mensajeError });
      }

      // No hay duplicados, realizar la inserción
      const insertQuery = `INSERT INTO usuario_f (idusuario, idfirma, disponible, idautor) VALUES (?, ?, 1, ?);`;
      const values = [idusuario, idfirma, autor];
      db.query(insertQuery, values, (insertError, insertResults) => {
        if (insertError) {
          console.error(insertError);
          res.status(500).json({ mensaje: "Error en la inserción en la base de datos" });
        } else {
          res.json({ mensaje: "Registrado exitosamente" });
        }
      });
    });
  });
});

router.get("/firma/get", (req, res) => {
  const query = `SELECT f.firma as "firma", f.nombre as "fnombre", p.nombre as "usuario", uf.* FROM usuario_f uf JOIN firmas f on uf.idfirma = f.id JOIN usuario u on uf.idusuario = u.id JOIN persona p on u.idpersona = p.id WHERE uf.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/firma/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT f.firma as "firma", f.nombre as "fnombre", p.nombre as "usuario", uf.* FROM usuario_f  uf JOIN firmas f on uf.idfirma = f.id JOIN usuario u on uf.idusuario = u.id JOIN persona p on u.idpersona = p.id WHERE uf.disponible = 1 AND u.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/firma/put/:id", (req, res) => {
  const id = req.params.id;
  const { idusuario, idfirma } = req.body;

  // Verificar si idusuario ya existe
  const checkUsuarioQuery = `SELECT COUNT(*) as usuarioCount FROM usuario_f WHERE idusuario = ${idusuario} AND id <> ${id} AND disponible = 1`;
  db.query(checkUsuarioQuery, (usuarioError, usuarioResults) => {
    if (usuarioError) {
      return res.status(500).json({ mensaje: "Error en la verificación de usuario" });
    }

    const usuarioCount = usuarioResults[0].usuarioCount;

    // Verificar si idfirma ya existe
    const checkFirmaQuery = `SELECT COUNT(*) as firmaCount FROM usuario_f WHERE idfirma = ${idfirma} AND id <> ${id} AND disponible = 1`;
    db.query(checkFirmaQuery, (firmaError, firmaResults) => {
      if (firmaError) {
        return res.status(500).json({ mensaje: "Error en la verificación de firma" });
      }

      const firmaCount = firmaResults[0].firmaCount;

      if (usuarioCount > 0) {
        return res.status(400).json({ mensaje: "Ya existe otro registro con el mismo Usuario" });
      } else if (firmaCount > 0) {
        return res.status(400).json({ mensaje: "Ya existe otro registro con la misma Firma" });
      }

      // Si no hay duplicados, procede con la actualización
      let updates = '';
      if (idusuario) {
        updates += `idusuario = ${idusuario}`;
      }
      if (idfirma) {
        if (updates !== '') {
          updates += ', ';
        }
        updates += `idfirma = ${idfirma}`;
      }

      if (updates === '') {
        // No se enviaron campos para actualizar
        return res.status(400).json({ mensaje: "No se enviaron campos para actualizar" });
      }

      const query = `UPDATE usuario_f SET ${updates}, fecha_a = NOW() WHERE id = ${id} AND disponible = 1`;
      db.query(query, (error, results) => {
        if (error) {
          return res.status(500).json({ mensaje: "Error al actualizar el registro" });
        }
        res.json({ mensaje: "Registro actualizado exitosamente" });
      });
    });
  });
});

router.delete("/firma/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE usuario_f SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

////// TABLA DE USUARIO Y FIRMA DIRECCION //////

router.post("/direccion/post", (req, res) => {
  const { idusuariof, idireccion, autor } = req.body;
  const query = `INSERT INTO usuario_fd (idusuariof, idireccion, disponible, idautor) VALUES (?,?, 1, ?);`;
  const values = [idusuariof, idireccion, autor]
  db.query(query, values, (error, results) => {
    if (error) throw res.json(error);
    res.json({ mensaje: "Registrado exitosamente" });
  });
});

router.get("/direccion/get", (req, res) => {
  const query = `SELECT p.nombre as "usuario", f.firma as "firma", d.nombre as "direccion", fd.* FROM usuario_fd fd JOIN usuario_f uf on fd.idusuariof = uf.id JOIN firmas f on uf.idfirma = f.id JOIN usuario u on uf.idusuario = u.id JOIN direccion d on fd.idireccion = d.id JOIN persona p on u.idpersona = p.id WHERE fd.disponible = 1;`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/direccion/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT p.nombre as "usuario", f.firma as "firma", d.nombre as "direccion", fd.* FROM usuario_fd fd JOIN usuario_f uf on fd.idusuariof = uf.id JOIN firmas f on uf.idfirma = f.id JOIN usuario u on uf.idusuario = u.id JOIN direccion d on fd.idireccion = d.id JOIN persona p on u.idpersona = p.id WHERE fd.disponible = 1 AND u.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/direccion/put/:id", (req, res) => {
  const id = req.params.id;
  const { idusuariof, idireccion } = req.body;
  let updates = '';
  if (idusuariof) {
    updates += `idusuariof = ${idusuariof}`;
  }
  if (idireccion) {
    if (updates !== '') {
      updates += ', ';
    }
    updates += `idireccion = ${idireccion}`;
  }

  if (updates === '') {
    // No se enviaron campos para actualizar
    res.json({ mensaje: "No se enviaron campos para actualizar" });
    return;
  }

  const query = `UPDATE usuario_fd SET ${updates}, fecha_a = NOW() WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro actualizado exitosamente" });
  });
});

router.delete("/direccion/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE usuario_fd SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

////// TABLA DE USUARIO Y ROL //////

router.post("/rol/post", (req, res) => {
  const { idusuario, idrol, contrasena, autor } = req.body;

  // Generar un hash de la contraseña utilizando bcrypt
  const hashedPassword = bcrypt.hashSync(contrasena, 10);

  // Verificar si ya existe un registro con el mismo nombre
  const duplicateQuery = `SELECT * FROM usuario_r WHERE idusuario = '${idusuario}'`;
  db.query(duplicateQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Se encontró un duplicado
      const mensajeError = `Esta persona ya dispone de un Rol`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la inserción
    const query = `INSERT INTO usuario_r (idusuario, idrol, contrasena, idautor) VALUES (?,  ?, ?, ?);`;
    const values = [idusuario, idrol, hashedPassword, autor]
    db.query(query, values, (error, results) => {
      if (error) {
        return res.status(400).json({ mensaje: error });
      }
      res.json({ mensaje: "Registrado exitosamente" });
    });
  });
});

router.get("/rol/get", async (req, res) => {
  try {
    const query = await getUserRol()
    const result = await queryDatabase(query)
    res.json(result);
  } catch (error) {
    res.status(500).json({ mensaje: messages.errorquery });
  }
}

);

router.get("/rol/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM usuario_r WHERE idusuario = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/rol/put/:id", (req, res) => {
  const id = req.params.id;
  const { idusuario, idrol, contrasena } = req.body;

  // Inicializar una lista de campos para actualizar
  const updateFields = [];

  // Verificar si se proporciona idusuario y agregarlo a los campos a actualizar
  if (idusuario !== undefined) {
    updateFields.push(`idusuario = '${idusuario}'`);
  }

  // Verificar si se proporciona idrol y agregarlo a los campos a actualizar
  if (idrol !== undefined) {
    updateFields.push(`idrol = '${idrol}'`);
  }

  // Verificar si se proporciona una nueva contraseña y agregarla a los campos a actualizar
  if (contrasena !== undefined) {
    // Generar un hash de la nueva contraseña utilizando bcrypt
    const hashedPassword = bcrypt.hashSync(contrasena, 10);
    updateFields.push(`contrasena = '${hashedPassword}'`);
  }

  // Comprobar si hay campos para actualizar
  if (updateFields.length === 0) {
    return res.status(400).json({ mensaje: "Ningún campo proporcionado para actualizar" });
  }

  // Construir la consulta SQL de actualización
  const query = `UPDATE usuario_r SET ${updateFields.join(", ")}, fecha_a = NOW() WHERE id = ${id}`;

  // Ejecutar la consulta SQL de actualización
  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: "Error interno del servidor" });
    }
    res.json({ mensaje: "Registro actualizado exitosamente" });
  });
});

router.delete("/rol/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE usuario_r SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});


module.exports = router;
