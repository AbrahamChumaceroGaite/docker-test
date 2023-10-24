const express = require("express");
const router = express.Router();
const db = require("../../services/db");

//Modulos

router.post("/master/structure/module/post", (req, res) => {
    const { nombre, autor } = req.body;
    // Verificar si ya existe otro módulo con el mismo nombre en la base de datos
    const duplicateQuery = `SELECT * FROM modulo WHERE nombre = ?`;
    db.query(duplicateQuery, [nombre], (duplicateError, duplicateResults) => {
      if (duplicateError) {
        res.status(500).json({ mensaje: "Error al verificar duplicados" });
        return;
      }
  
      if (duplicateResults.length > 0) {
        res.status(400).json({ mensaje: "Ya existe otro módulo con el mismo nombre" });
        return;
      }
  
      // Realizar la inserción en la base de datos
      const insertQuery = `INSERT INTO modulo (nombre, idautor) VALUES (?, ?);`;
      const values = [nombre, autor];
      db.query(insertQuery, values, (error, results) => {
        if (error) {
          res.status(500).json({ mensaje: "Error al insertar el registro" });
          return;
        }
        res.json({ mensaje: "Registrado exitosamente" });
      });
    });
  });
  
router.get("/master/structure/module/get", (req, res) => {
  const query = `SELECT * FROM modulo WHERE disponible = 1 ORDER BY nombre`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/master/structure/module/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM modulo WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/master/structure/module/put/:id", (req, res) => {
    const id = req.params.id;
    const { nombre } = req.body;
  
    // Verificar si ya existe otro módulo con el mismo nombre en la base de datos
    const duplicateQuery = `SELECT * FROM modulo WHERE nombre = ? AND id != ?`;
    db.query(duplicateQuery, [nombre, id], (duplicateError, duplicateResults) => {
      if (duplicateError) {
        res.status(500).json({ mensaje: "Error al verificar duplicados" });
        return;
      }
  
      if (duplicateResults.length > 0) {
        res.status(400).json({ mensaje: "Ya existe otro módulo con el mismo nombre" });
        return;
      }
  
      // Realizar la actualización en la base de datos
      const updateQuery = `UPDATE modulo SET nombre = ?, fecha_a = NOW() WHERE id = ?`;
      const values = [nombre, id];
      db.query(updateQuery, values, (error, results) => {
        if (error) {
          res.status(500).json({ mensaje: "Error al actualizar el registro" });
          return;
        }
        res.json({ mensaje: "Registro actualizado exitosamente" });
      });
    });
  });
  
router.delete("/master/structure/module/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE modulo SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

//Componentes

router.post("/master/structure/component/post", (req, res) => {
    const { idmodulo, nombre, autor } = req.body;
  
    // Verificar si ya existe un componente con el mismo idmodulo y nombre en la base de datos
    const duplicateQuery = `SELECT * FROM componente WHERE idmodulo = ? AND nombre = ?`;
    db.query(duplicateQuery, [idmodulo, nombre], (duplicateError, duplicateResults) => {
      if (duplicateError) {
        res.status(500).json({ mensaje: "Error al verificar duplicados" });
        return;
      }
  
      if (duplicateResults.length > 0) {
        res.status(400).json({ mensaje: "Ya existe un componente con el mismo idmodulo y nombre" });
        return;
      }
  
      // Realizar la inserción en la base de datos
      const insertQuery = `INSERT INTO componente (idmodulo, nombre, idautor) VALUES (?, ?, ?);`;
      const values = [idmodulo, nombre, autor];
      db.query(insertQuery, values, (error, results) => {
        if (error) {
          res.status(500).json({ mensaje: "Error al registrar el componente" });
          return;
        }
        res.json({ mensaje: "Registrado exitosamente" });
      });
    });
  });
  
router.get("/master/structure/component/get/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT m.nombre as modulo, c.* FROM componente c JOIN modulo m ON m.id = c.idmodulo WHERE c.disponible = 1 AND m.id = ${id} ORDER BY c.nombre`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/master/structure/component/list/get/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT c.id, c.nombre
  FROM componente c
  WHERE c.id NOT IN (
      SELECT rp.idcomponente
      FROM rol_permisos rp
      WHERE rp.idrol = ${id}
  ) ORDER BY c.nombre;`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/master/structure/component/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM componente WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/master/structure/component/put/:id", (req, res) => {
  const id = req.params.id;
  const { idmodulo, nombre } = req.body;
  const query = `UPDATE componente SET idmodulo = ${idmodulo}, nombre = '${nombre}', fecha_a = NOW() WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro actualizado exitosamente" });
  });
});

router.delete("/master/structure/component/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE componente SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;
