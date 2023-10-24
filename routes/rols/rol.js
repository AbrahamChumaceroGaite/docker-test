const express = require("express");
const router = express.Router();
const db = require("../../services/db");

// Roles

router.post("/post", (req, res) => {
  const { rol, autor } = req.body;

  // Verificar si ya existe un rol con el mismo nombre en la base de datos
  const duplicateQuery = `SELECT * FROM rol WHERE rol = ?`;
  db.query(duplicateQuery, [rol], (duplicateError, duplicateResults) => {
    if (duplicateError) {
      res.status(500).json({ mensaje: "Error al verificar duplicados" });
      return;
    }

    if (duplicateResults.length > 0) {
      res.status(400).json({ mensaje: "Ya existe un rol con el mismo nombre" });
      return;
    }

    // Realizar la inserción en la base de datos
    const insertQuery = `INSERT INTO rol (rol, idautor) VALUES (?,?);`;
    const values = [rol, autor];
    db.query(insertQuery, values, (error, results) => {
      if (error) {
        res.status(500).json({ mensaje: "Error al insertar el registro" });
        return;
      }
      res.json({ mensaje: "Registrado exitosamente" });
    });
  });
});

router.get("/get", (req, res) => {
  const query = `SELECT * FROM rol WHERE disponible = 1 ORDER BY rol`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM rol WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/put/:id", (req, res) => {
  const id = req.params.id;
  const { rol } = req.body;

  // Verificar si ya existe otro rol con el mismo nombre en la base de datos
  const duplicateQuery = `SELECT * FROM rol WHERE rol = ?`;
  db.query(duplicateQuery, [rol], (duplicateError, duplicateResults) => {
    if (duplicateError) {
      res.status(500).json({ mensaje: "Error al verificar duplicados" });
      return;
    }

    if (duplicateResults.length > 0) {
      res.status(400).json({ mensaje: "Ya existe otro rol con el mismo nombre" });
      return;
    }

    // Realizar la actualización en la base de datos
    const updateQuery = `UPDATE rol SET rol = ?, fecha_a = NOW() WHERE id = ?`;
    const values = [rol, id];
    db.query(updateQuery, values, (error, results) => {
      if (error) {
        res.status(500).json({ mensaje: "Error al actualizar el registro" });
        return;
      }
      res.json({ mensaje: "Registro actualizado exitosamente" });
    });
  });
});

router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE rol SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

// Permisos
router.post("/admin/permission/access/post", (req, res) => {
  const { idrol, idcomponente, crear, editar, eliminar, ver, autor } = req.body;
  // Verificar si la combinación idrol e idcomponente ya existe en la base de datos
  const duplicateQuery = `SELECT * FROM rol_permisos WHERE idrol = ? AND idcomponente = ?`;
  db.query(duplicateQuery, [idrol, idcomponente], (duplicateError, duplicateResults) => {
    if (duplicateError) {
      res.status(500).json({ mensaje: "Error al verificar duplicados" });
      return;
    }

    if (duplicateResults.length > 0) {
      res.status(400).json({ mensaje: "Ya existe un registro con la misma combinación de Rol y Componente" });
      return;
    }

    // Realizar la inserción en la base de datos
    const insertQuery = `INSERT INTO rol_permisos (idrol, idcomponente, crear, editar, eliminar, ver, idautor) VALUES (?,?,?,?,?,?,?);`;
    const values = [idrol, idcomponente, crear, editar, eliminar, ver, autor];
    db.query(insertQuery, values, (error, results) => {
      if (error) {
        res.status(500).json({ mensaje: "Error al insertar el registro" });
        return;
      }
      res.json({ mensaje: "Registrado exitosamente" });
    });
  });
});

router.get("/admin/permission/access/get/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT rr.rol as rol, c.nombre as componente, r.* from rol_permisos r JOIN certificados.componente c on r.idcomponente = c.id JOIN rol rr ON rr.id = r.idrol WHERE rr.id= ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/admin/permission/access/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM rol_permisos WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/admin/permission/access/getByUser/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT idcomponente, crear, editar, eliminar, ver FROM rol_permisos WHERE idrol = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/admin/permission/access/put/:id", (req, res) => {
  const id = req.params.id;
  const { idrol, idcomponente, crear, editar, eliminar, ver } = req.body;

  // Verificar si idrol y idcomponente ya existen en la base de datos
  const duplicateQuery = `SELECT * FROM rol_permisos WHERE idrol = ? AND idcomponente = ? AND id <> ?`;
  db.query(duplicateQuery, [idrol, idcomponente, id], (duplicateError, duplicateResults) => {
    if (duplicateError) {
      res.status(500).json({ mensaje: "Error al verificar duplicados" });
      return;
    }

    if (duplicateResults.length > 0) {
      res.status(400).json({ mensaje: "Ya existe un registro con el mismo Rol y Componente" });
      return;
    }

    // Crear objeto de campos a actualizar
    const fieldsToUpdate = {
      fecha_a: new Date()
    };
    if (idrol) fieldsToUpdate.idrol = idrol;
    if (idcomponente) fieldsToUpdate.idcomponente = idcomponente;
    if (crear !== undefined) fieldsToUpdate.crear = crear;
    if (editar !== undefined) fieldsToUpdate.editar = editar;
    if (eliminar !== undefined) fieldsToUpdate.eliminar = eliminar;
    if (ver !== undefined) fieldsToUpdate.ver = ver;

    // Actualizar registro en la base de datos
    const updateQuery = `UPDATE rol_permisos SET ? WHERE id = ?`;
    db.query(updateQuery, [fieldsToUpdate, id], (updateError, updateResults) => {
      if (updateError) {
        res.status(500).json({ mensaje: "Error al actualizar el registro" });
        return;
      }
      res.json({ mensaje: "Registro actualizado exitosamente" });
    });
  });
});

router.delete("/admin/permission/access/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `DELETE FROM rol_permisos WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;
