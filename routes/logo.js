const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.post("/post", (req, res) => {
  const { logo, fecha_c } = req.body;
  const query = `INSERT INTO logos (logo, disponible) VALUES ('${logo}', 1);`;
  db.query(query, (error, results) => {
    if (error) throw res.json(error);
    res.json({ mensaje: "Registrado exitosamente" });
  });
});

router.get("/get", (req, res) => {
  const query = `SELECT * FROM logos WHERE disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM logos WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/put/:id", (req, res) => {
  const id = req.params.id;
  const { logo, fecha_c } = req.body;
  const query = `UPDATE logos SET logo = '${logo}' WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro actualizado exitosamente" });
  });
});

router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE logos SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;