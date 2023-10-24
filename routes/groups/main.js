const express = require("express");
const router = express.Router();
const db = require("../../services/db");
const messages = require("../../templates/messages");
const { getControlledGroups, queryDatabase } = require('../shared/querys');
const { deleteUserGroup, checkDuplicates, inserNewUserGroup, getNewUserGroupData } = require('./querys-user');

const { SendPushNotificacionsGroups } = require('../../services/notifications/main')
require("moment-timezone");

router.post("/post", (req, res) => {
  const { nombre, autor } = req.body;

  // Verificar si existen duplicados
  const duplicateQuery = `SELECT * FROM grupos WHERE nombre = '${nombre} AND disponible = 1'`;
  db.query(duplicateQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Se encontró un duplicado
      const mensajeError = `Ya existe un registro con el mismo valor con el mismo nombre: ${nombre}`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la inserción
    const query = `INSERT INTO grupos (nombre, disponible, idautor) VALUES (?, 1, ?);`;
    const values = [nombre, autor]
    db.query(query, values, (error, results) => {
      if (error) throw error;
      res.json({ mensaje: "Registrado exitosamente" });
    });
  });
});

router.get("/get", async (req, res) => {
  try {
    const { id } = req.query;
    const query = await getControlledGroups(id);
    const result = await queryDatabase(query);
    // Hacer algo con 'result' aquí, como enviarlo como respuesta JSON
    res.json(result);
  } catch (error) {
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/getLazy", (req, res) => {
  const { first, rows, globalFilter, sortField, sortOrder } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);

  // Consulta principal con LIMIT
  let query = `SELECT * FROM grupos WHERE disponible = 1`;

  // Aplica el filtro global si se proporciona
  if (globalFilter) {
    query += ` AND (nombre LIKE '%${globalFilter}%' OR nombre LIKE '%${globalFilter}%')`;
  }

  // Aplica el ordenamiento (sort) si se proporciona
  if (sortField && sortOrder) {
    query += ` ORDER BY ${sortField} ${sortOrder === '1' ? 'ASC' : 'DESC'}`;
  }

  // Aplica LIMIT para la paginación
  query += ` LIMIT ${startIndex}, ${numRows}`;

  // Consulta para contar el número total de registros (sin LIMIT)
  const countQuery = `SELECT COUNT(*) as totalRecords FROM grupos WHERE disponible = 1`;

  db.query(countQuery, (countError, countResult) => {
    if (countError) {
      return res.status(500).json({ mensaje: messages.emptytable });
    }

    const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

    db.query(query, (error, results) => {
      if (error) throw error;
      res.json({ items: results, totalRecords: totalRecords });
    });


  });
});

router.get("/getByGroup/", (req, res) => {
  const { id, first, rows, globalFilter, sortField, sortOrder } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);
  // Consulta principal con LIMIT
  let query = `SELECT ur.id as id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre,, r.rol as rol, g.id as idgrupo, g.nombre as grupo, ur.fecha_c FROM usuario_r ur JOIN rol r ON r.id = ur.idrol JOIN usuario u ON u.id = ur.idusuario JOIN persona p ON p.id = u.idpersona JOIN grupos g ON g.id = ur.idgrupo WHERE ur.disponible = 1 AND g.id = ${id}`;

  // Aplica el filtro global si se proporciona
  if (globalFilter) {
    query += ` AND (nombre LIKE '%${globalFilter}%' OR nombre LIKE '%${globalFilter}%')`;
  }

  // Aplica el ordenamiento (sort) si se proporciona
  if (sortField && sortOrder) {
    query += ` ORDER BY ${sortField} ${sortOrder === '1' ? 'ASC' : 'DESC'}`;
  }

  // Aplica LIMIT para la paginación
  query += ` LIMIT ${startIndex}, ${numRows}`;

  // Consulta para contar el número total de registros (sin LIMIT)
  const countQuery = `SELECT COUNT(*) as totalRecords FROM usuario_r WHERE disponible = 1 AND idgrupo = ${id}`;

  db.query(countQuery, (countError, countResult) => {
    if (countError) {
      return res.status(500).json({ mensaje: messages.emptytable });
    }

    const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

    db.query(query, (error, results) => {
      if (error) throw error;
      res.json({ items: results, totalRecords: totalRecords });
    });

  })
});

router.get("/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM grupos WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/put/:id", (req, res) => {
  const id = req.params.id;
  const { nombre, fecha_c } = req.body;

  // Verificar si existen duplicados
  const duplicateQuery = `SELECT * FROM grupos WHERE nombre = '${nombre}' AND id != ${id} AND disponible = 1`;
  db.query(duplicateQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Se encontró un duplicado
      const mensajeError = `Ya existe un registro con el mismo valor en el campo nombre: ${nombre}`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la actualización
    const query = `UPDATE grupos SET nombre = '${nombre}', fecha_a = NOW() WHERE id = ${id}`;
    db.query(query, (error, results) => {
      if (error) throw error;
      res.json({ mensaje: "Registro actualizado exitosamente" });
    });
  });
});

router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE grupos SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});


////// TABLA DE USUARIO Y GRUPOS //////

router.post("/user/post", async (req, res) => {
  let { idusuario_r, idgrupo, autor } = req.body;

  try {
    // Comprobar si la combinación idusuario_r e idgrupo ya existe en otro registro
    const {checkQuery, checkValues} = await checkDuplicates(idusuario_r, idgrupo) 
   
    const checkResults = await queryDatabase(checkQuery, checkValues);

    const count = checkResults[0].count;
 
    if (count > 0) {
      // La combinación idusuario_r e idgrupo ya existe en otro registro
      return res.status(400).json({ mensaje: messages.duplicatevalues });
    } else {
      // No hay duplicados, realizar la inserción
      const {insertQuery, insertValues} = await inserNewUserGroup(idusuario_r, idgrupo, autor); 
      const newUser =   await queryDatabase(insertQuery, insertValues);
      // PASO 1 - PARA ENVIAR LAS NOTIFICACIONES, ADJUNTO EL NUEVO ID
      await SendPushNotificacionsGroups(idgrupo, 1, newUser.insertId);

      res.json({ mensaje: "Registrado exitosamente" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

router.get("/user/get", (req, res) => {
  const query = `SELECT ug.id as id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, g.nombre as grupo FROM usuario_rg ug
  JOIN usuario_r ur ON ug.idusuario_r = ur.id
  JOIN usuario u ON ur.idusuario = u.id
  JOIN persona p ON u.idpersona = p.id
  JOIN grupos g ON ug.idgrupo = g.id
  WHERE ug.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/user/getLazy", (req, res) => {
  const { id, first, rows, globalFilter, sortField, sortOrder } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);

  // Consulta principal con LIMIT
  let query = `SELECT ug.*, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, g.nombre as grupo FROM usuario_rg ug
  JOIN usuario_r ur ON ug.idusuario_r = ur.id
  JOIN usuario u ON ur.idusuario = u.id
  JOIN persona p ON u.idpersona = p.id
  JOIN grupos g ON ug.idgrupo = g.id
  WHERE ug.disponible = 1 AND g.id = ${id}`;

  // Aplica el filtro global si se proporciona
  if (globalFilter) {
    query += ` AND (nombre LIKE '%${globalFilter}%' OR nombre LIKE '%${globalFilter}%')`;
  }

  // Aplica el ordenamiento (sort) si se proporciona
  if (sortField && sortOrder) {
    query += ` ORDER BY ${sortField} ${sortOrder === '1' ? 'ASC' : 'DESC'}`;
  }

  // Aplica LIMIT para la paginación
  query += ` LIMIT ${startIndex}, ${numRows}`;

  // Consulta para contar el número total de registros (sin LIMIT)
  const countQuery = `SELECT COUNT(*) as totalRecords FROM usuario_rg WHERE disponible = 1 AND idgrupo = ${id}`;

  db.query(countQuery, (countError, countResult) => {
    if (countError) {
      return res.status(500).json({ mensaje: messages.emptytable });
    }

    const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

    db.query(query, (error, results) => {
      if (error) throw error;
      res.json({ items: results, totalRecords: totalRecords });
    });

  })
});

router.get("/user/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM usuario_rg WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/user/put/:id", (req, res) => {
  const id = req.params.id;
  const { idusuario_r, idgrupo, autor } = req.body;

  // Comprobar si la combinación idusuario_r e idgrupo ya existe en otro registro
  const checkQuery = `SELECT COUNT(*) AS count FROM usuario_rg WHERE idusuario_r = '${idusuario_r}' AND idgrupo = '${idgrupo}'`;

  db.query(checkQuery, (checkError, checkResults) => {
    if (checkError) {
      return res.status(500).json({ mensaje: "Error interno del servidor al verificar la combinación" });
    }

    const count = checkResults[0].count;

    if (count > 0) {
      // La combinación idusuario_r e idgrupo ya existe en otro registro
      return res.status(400).json({ mensaje: "Este usuario ya pertenece a ese grupo" });
    } else {
      // Inicializar una lista de campos para actualizar
      const updateFields = [];

      // Verificar si se proporciona idusuario_r y agregarlo a los campos a actualizar
      if (idusuario_r !== undefined) {
        updateFields.push(`idusuario_r = '${idusuario_r}'`);
      }

      // Verificar si se proporciona idgrupo y agregarlo a los campos a actualizar
      if (idgrupo !== undefined) {
        updateFields.push(`idgrupo = '${idgrupo}'`);
      }

      // Comprobar si hay campos para actualizar
      if (updateFields.length === 0) {
        return res.status(400).json({ mensaje: "Ningún campo proporcionado para actualizar" });
      }

      // Construir la consulta SQL de actualización
      const query = `UPDATE usuario_rg SET ${updateFields.join(", ")}, fecha_a = NOW() WHERE id = ${id}`;

      // Ejecutar la consulta SQL de actualización
      db.query(query, (error, results) => {
        if (error) {
          return res.status(500).json({ mensaje: "Error interno del servidor" });
        }
        res.json({ mensaje: "Registro actualizado exitosamente" });
      });
    }
  });
});

router.delete("/user/delete/:id", (req, res) => {
  const id = req.params.id;
  const { query, values } = deleteUserGroup(id)
  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: messages.errorquery });
    }
    res.json({ mensaje: messages.deletesuccess });
  });
});

module.exports = router;