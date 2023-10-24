const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const db = require("../../services/db");
const crypto = require("crypto");
const {  queryDatabase } = require('../shared/querys')
const { getPaginatedSignatures, getTotalSignatureRecords, checkDuplicateFirmaHash} = require('./querys')
const  messages  = require('../../templates/messages')
require("moment-timezone");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "assets/usuarios/firmas");
  },
  filename: function (req, file, cb) {
    // Aquí se utiliza el nombre de la firma para formar el nombre del archivo
    const nombreFirma = req.body.nombre;
    const autor = req.body.autor;
    const extension = file.originalname.split('.').pop(); // Obtener la extensión del archivo original
    const timestamp = Date.now(); // Obtener el timestamp actual
    const nombreArchivo = `${nombreFirma}-${autor}-${timestamp}.${extension}`;
    const rutaArchivo = `assets/usuarios/firmas/${nombreArchivo}`;

    // Verificar si el archivo ya existe
    if (fs.existsSync(rutaArchivo)) {
      cb("Ya existe un archivo con el mismo nombre", null);
    } else {
      cb(null, nombreArchivo);
    }
  },
});


const upload = multer({ storage: storage });

// Función para generar un hash del archivo
const generateFileHash = (file) => {
  const hash = crypto.createHash("md5");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
};

router.post("/post", upload.single("firma"), (req, res) => {
  const { nombre, autor } = req.body;
  const firma = req.file ? req.file.path : null;

  // Verificar duplicados de firma y nombre
  const queryCheckDuplicados = `SELECT COUNT(*) AS count FROM firmas WHERE (firma_hash IS NOT NULL AND firma_hash = ?) OR nombre = ? AND disponible = 1`;
  db.query(queryCheckDuplicados, [generateFileHash(firma), nombre], (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: "Error al verificar duplicados" });
    }

    const count = results[0].count;
    if (count > 0) {
      if (firma) {
        // Eliminar el archivo de firma
        fs.unlinkSync(firma);
      }
      return res.status(400).json({ mensaje: "Ya existe una firma con la misma imagen o nombre" });
    }

    // Verificar la existencia de la firma
    if (firma) {
      const queryCheckFirma = `SELECT COUNT(*) AS count FROM firmas WHERE firma = ? AND disponible = 1`;
      db.query(queryCheckFirma, [firma], (error, results) => {
        if (error) {
          return res.status(500).json({ mensaje: "Error al verificar la firma" });
        }

        const count = results[0].count;
        if (count > 0) {
          // Eliminar el archivo de firma
          fs.unlinkSync(firma);
          return res.status(400).json({ mensaje: "Esta firma ya existe" });
        }

        // No hay conflictos de firma, continuar con la inserción
        const queryInsert = `INSERT INTO firmas (nombre, firma, firma_hash, disponible, idautor, fecha_c) VALUES (?, ?, ?, 1, ?, NOW())`;
        db.query(queryInsert, [nombre, firma, generateFileHash(firma), autor], (error, results) => {
          if (error) {
            return res.status(500).json({ mensaje: "Error al insertar la firma" });
          }
          res.json({ mensaje: "Registrado exitosamente" });
        });
      });
    } else {
      // No se proporcionó una firma, continuar con la inserción sin verificar la firma
      const queryInsert = `INSERT INTO firmas (nombre, disponible, fecha_c) VALUES (?, 1, NOW())`;
      db.query(queryInsert, [nombre], (error, results) => {
        if (error) {
          return res.status(500).json({ mensaje: "Error al insertar la firma" });
        }
        res.json({ mensaje: "Registrado exitosamente" });
      });
    }
  });
});

router.get("/get", (req, res) => {
  const query = `SELECT * FROM firmas WHERE disponible = 1 ORDER BY nombre`;
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
      const countQuery = await getTotalSignatureRecords(id);
      const query = await getPaginatedSignatures(id, globalFilter, sortField, sortOrder, startIndex, numRows);

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
  const query = `SELECT * FROM firmas WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});


router.put("/put/:id",upload.single("firma"), async (req, res) => {
  const firmaId = req.params.id;
  const { nombre, autor } = req.body;
  const nuevaFirma = req.file ? req.file.path : null;

  try {
    // Verificar si la firma existe en la base de datos
    const firmaExistente = await queryDatabase("SELECT * FROM firmas WHERE id = ?", [firmaId]);

    if (!firmaExistente || firmaExistente.length === 0) {
      if (nuevaFirma) {
        // Eliminar el archivo de la nueva firma
        fs.unlinkSync(nuevaFirma);
      }
      return res.status(404).json({ mensaje: "Firma no encontrada" });
    }

    const updateFields = {}; // Objeto para almacenar los campos a actualizar

    if (nombre) {
      // Verificar duplicados de nombre, excluyendo el registro actual (mismo id)
      const queryCheckDuplicados = "SELECT COUNT(*) AS count FROM firmas WHERE id <> ? AND nombre = ? AND disponible = 1";
      const duplicadosResult = await queryDatabase(queryCheckDuplicados, [firmaId, nombre]);

      const count = duplicadosResult[0].count;
      if (count > 0) {
        return res.status(400).json({ mensaje: "Ya existe una firma con el mismo nombre, cambie de nombre al archivo" });
      }

      updateFields.nombre = nombre;
    }

    if (nuevaFirma) {
      // Verificar si hay una firma existente y borrar el archivo anterior
      if (firmaExistente[0].firma) {
        const firmaAnteriorPath = firmaExistente[0].firma;
        const bakFirmaPath = firmaAnteriorPath + "-bak";

        // Verificar si el archivo original existe antes de intentar renombrarlo
        if (fs.existsSync(firmaAnteriorPath)) {
          // Renombrar el archivo anterior con la extensión "-bak"
          fs.renameSync(firmaAnteriorPath, bakFirmaPath);
        }

        // Verificar si la firma nueva ya existe en la base de datos
        const firmaHash = generateFileHash(nuevaFirma);
        if (await checkDuplicateFirmaHash(firmaHash, firmaId)) {
          // Eliminar el archivo de la nueva firma
          fs.unlinkSync(nuevaFirma);
          return res.status(400).json({ mensaje: "Esta firma ya existe" });
        }

        // Actualizar la firma y el hash de la nueva firma
        updateFields.firma = nuevaFirma;
        updateFields.firma_hash = firmaHash;
      }
    }

    // Construir la consulta SQL dinámicamente
    const updateQuery = "UPDATE firmas SET " + Object.keys(updateFields).map(key => `${key} = ?`).join(", ") + ", fecha_a = NOW() WHERE id = ?";
    const updateValues = [...Object.values(updateFields), firmaId];

    // Ejecutar la consulta
    await queryDatabase(updateQuery, updateValues);

    res.json({ mensaje: "Firma actualizada exitosamente" });
  } catch (error) {
    console.error(error);
    if (nuevaFirma) {
      // Eliminar el archivo de la nueva firma en caso de error
      fs.unlinkSync(nuevaFirma);
    }
    res.status(500).json({ mensaje: "Error al actualizar la firma" });
  }
});
/* router.put("/put/:id", upload.single("firma"), async (req, res) => {
  const id = req.params.id;
  const { nombre } = req.body;
  const firma = req.file ? req.file.path : null;

  try {
    // Verificar si el firmante ya existe
    const querySelect = "SELECT * FROM firmas WHERE id = ?";
    const firmante = await queryDatabase(querySelect, [id]);

    if (!firmante || firmante.length === 0) {
      return res.status(404).json({ mensaje: "Firmante no encontrado" });
    }

    // Construir la consulta de actualización
    let queryUpdate = "UPDATE firmas SET";
    const updateParams = [];

    // Verificar si se proporcionó un nuevo nombre
    if (nombre && nombre !== firmante[0].nombre) {
      queryUpdate += " nombre = ?,";
      updateParams.push(nombre);
    }

    // Verificar si se proporcionó una nueva firma
    if (firma && firma !== firmante[0].firma) {
      queryUpdate += " firma = ?,";
      updateParams.push(firma);

      // Eliminar el archivo anterior si la nueva firma es diferente
      if (firmante[0].firma) {
        // Verificar si el archivo de la firma anterior existe antes de eliminarlo
        if (fs.existsSync(firmante[0].firma)) {
          fs.unlinkSync(firmante[0].firma);
        }
      }
    }

    // Eliminar la coma final si hay actualizaciones
    if (updateParams.length > 0) {
      queryUpdate = queryUpdate.slice(0, -1); // Eliminar la última coma
      queryUpdate += " WHERE id = ?";
      updateParams.push(id);

      await queryDatabase(queryUpdate, updateParams);
      res.json({ mensaje: "Firmante actualizado exitosamente" });
    } else {
      // No se proporcionaron datos para actualizar
      res.status(400).json({ mensaje: "No se proporcionaron datos para actualizar" });
    }
  } catch (error) {
    console.error(error);
    if (firma) {
      // Eliminar el archivo de la firma si ocurre un error
      if (fs.existsSync(firma)) {
        fs.unlinkSync(firma);
      }
    }
    res.status(500).json({ mensaje: "Error al actualizar el firmante" });
  }
});
 */


router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE firmas SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;