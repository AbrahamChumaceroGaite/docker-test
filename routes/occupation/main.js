const express = require("express");
const router = express.Router();
const db = require("../../services/db");
const moment = require("moment");
const { getPaginatedOccupations, getTotalOccupationsRecords } = require('./querys')
const  messages  = require('../../templates/messages')
require("moment-timezone");

router.post("/post", (req, res) => {
  const { nombre, autor } = req.body;

  // Verificar si existen duplicados
  const duplicateQuery = `SELECT * FROM direccion WHERE nombre = '${nombre} AND disponible = 1'`;
  db.query(duplicateQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Se encontró un duplicado
      const mensajeError = `Ya existe un registro con el mismo valor en el campo nombre: ${nombre}`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la inserción
    const query = `INSERT INTO direccion (nombre, disponible, idautor) VALUES (?, 1, ?);`;
    const values = [nombre, autor]
    db.query(query, values, (error, results) => {
      if (error) throw error;
      res.json({ mensaje: "Registrado exitosamente" });
    });
  });
});

router.get("/get", (req, res) => {
  const query = `SELECT * FROM direccion WHERE disponible = 1`;
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
      const countQuery = await getTotalOccupationsRecords(id);
      const query = await getPaginatedOccupations(id, globalFilter, sortField, sortOrder, startIndex, numRows);

      db.query(countQuery, async (countError, countResult) => {
          if (countError) {
              return res.status(500).json({ mensaje: messages.emptytable });
          }

          const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

          db.query(query, (error, results) => {
              if (error) throw error;
              res.json({ items: results, totalRecords: totalRecords });
          });
      });
  } catch (error) {
      // Maneja errores aquí
      console.error(error);
      res.status(500).json({ mensaje: messages.errorquery });
  }
});


router.get("/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM direccion WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/put/:id", (req, res) => {
  const id = req.params.id;
  const { nombre, fecha_c } = req.body;

  // Verificar si existen duplicados
  const duplicateQuery = `SELECT * FROM direccion WHERE nombre = '${nombre}' AND id != ${id} AND disponible = 1`;
  db.query(duplicateQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Se encontró un duplicado
      const mensajeError = `Ya existe un registro con el mismo valor en el campo nombre: ${nombre}`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la actualización
    const query = `UPDATE direccion SET nombre = '${nombre}', fecha_a = NOW() WHERE id = ${id}`;
    db.query(query, (error, results) => {
      if (error) throw error;
      res.json({ mensaje: "Registro actualizado exitosamente" });
    });
  });
});

router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE direccion SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;