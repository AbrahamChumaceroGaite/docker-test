const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const db = require("../../services/db");
const { queryDatabase } = require('../shared/querys')
const crypto = require("crypto");
const moment = require("moment");
const { getPaginatedSponsors, getTotalSponsorRecords, checkDuplicateLogoHash } = require("./querys")
const messages = require('../../templates/messages')
require("moment-timezone");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "assets/auspiciadores/logos");
  },
  filename: function (req, file, cb) {

    const autor = req.body.autor;
    const extension = file.originalname.split('.').pop(); // Obtener la extensión del archivo original
    const timestamp = Date.now(); // Obtener el timestamp actual

    const nombreAuspiciador = req.body.nombre;
    const nombreArchivo = `${nombreAuspiciador}-${autor}-${timestamp}${file.originalname}`;
    const rutaArchivo = `assets/auspiciadores/logos/${nombreArchivo}`;

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

router.post("/post", upload.single("logo"), (req, res) => {
  const { nombre, autor } = req.body;
  const logo = req.file ? req.file.path : null;

  // Verificar duplicados de nombre y logo
  const queryCheckDuplicados = `SELECT COUNT(*) AS count FROM auspiciadores WHERE (logo_hash IS NOT NULL AND logo_hash = ?) OR nombre = ? AND disponible = 1`;
  db.query(
    queryCheckDuplicados,
    [generateFileHash(logo), nombre],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ mensaje: "Error al verificar duplicados" });
      }

      const count = results[0].count;
      if (count > 0) {
        if (logo) {
          // Eliminar el archivo de logo
          fs.unlinkSync(logo);
        }
        return res
          .status(409)
          .json({
            mensaje: "Ya existe un auspiciador con el mismo logo o nombre",
          });
      }

      // Verificar la existencia del logo
      if (logo) {
        const queryCheckLogo = `SELECT COUNT(*) AS count FROM auspiciadores WHERE logo = ? AND disponible = 1`;
        db.query(queryCheckLogo, [logo], (error, results) => {
          if (error) {
            return res
              .status(500)
              .json({ mensaje: "Error al verificar el logo" });
          }

          const count = results[0].count;
          if (count > 0) {
            // Eliminar el archivo de logo
            fs.unlinkSync(logo);
            return res
              .status(409)
              .json({ mensaje: "Ya existe un auspiciador con el mismo logo" });
          }

          // No hay conflictos de logo, continuar con la inserción
          const queryInsert = `INSERT INTO auspiciadores (nombre, logo, logo_hash, disponible, idautor, fecha_c) VALUES (?, ?, ?, 1, ?, NOW())`;
          const values = [nombre, logo, generateFileHash(logo), autor];
          db.query(queryInsert, values, (error, results) => {
            if (error) {
              return res
                .status(500)
                .json({ mensaje: "Error en la consulta a la base de datos" });
            }
            res.json({ mensaje: "Registrado exitosamente con Logo" });
          });
        });
      } else {
        // No se proporcionó un logo, continuar con la inserción sin verificar el logo
        const queryInsert = `INSERT INTO auspiciadores (nombre, disponible, idautor, fecha_c) VALUES (?, 1, ?, NOW())`;
        db.query(queryInsert, [nombre, autor], (error, results) => {
          if (error) {
            return res
              .status(500)
              .json({ mensaje: "Error en la consulta a la base de datos" });
          }
          res.json({ mensaje: "Registrado exitosamente sin Logo" });
        });
      }
    }
  );
});

router.get("/get", (req, res) => {
  const query = `SELECT * FROM auspiciadores WHERE disponible = 1`;
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
    const countQuery = await getTotalSponsorRecords(id);
    const query = await getPaginatedSponsors(id, globalFilter, sortField, sortOrder, startIndex, numRows);

    db.query(countQuery, async (countError, countResult) => {
      if (countError) {
        return res.status(500).json({ mensaje: messages.emptytable });
      }

      const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

      db.query(query, (error, results) => {
        if (error) {
          console.log(error)
          return res.status(500).json({ mensaje: messages.errorquery });
        }
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
  const query = `SELECT * FROM auspiciadores WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/put/:id", upload.single("logo"), async (req, res) => {
  const auspiciadorId = req.params.id;
  const { nombre, autor } = req.body;
  const nuevoLogo = req.file ? req.file.path : null;

  try {
    // Verificar si el auspiciador existe en la base de datos
    const auspiciadorExistente = await queryDatabase("SELECT * FROM auspiciadores WHERE id = ?", [auspiciadorId]);

    if (!auspiciadorExistente || auspiciadorExistente.length === 0) {
      if (nuevoLogo) {
        // Eliminar el archivo del nuevo logo
        fs.unlinkSync(nuevoLogo);
      }
      return res.status(404).json({ mensaje: "Auspiciador no encontrado" });
    }

    const updateFields = {}; // Objeto para almacenar los campos a actualizar

    if (nombre) {
      // Verificar duplicados de nombre, excluyendo el registro actual (mismo id)
      const queryCheckDuplicados = "SELECT COUNT(*) AS count FROM auspiciadores WHERE id <> ? AND nombre = ? AND disponible = 1";
      const duplicadosResult = await queryDatabase(queryCheckDuplicados, [auspiciadorId, nombre]);

      const count = duplicadosResult[0].count;
      if (count > 0) {
        return res.status(400).json({ mensaje: "Ya existe un auspiciador con el mismo nombre" });
      }

      updateFields.nombre = nombre;
    }

    if (nuevoLogo) {
      // Verificar si hay un logo existente y borrar el archivo anterior
      if (auspiciadorExistente[0].logo) {
        const logoAnteriorPath = auspiciadorExistente[0].logo;
        const bakLogoPath = logoAnteriorPath + "-bak";

        // Verificar si el archivo original existe antes de intentar renombrarlo
        if (fs.existsSync(logoAnteriorPath)) {
          // Renombrar el archivo anterior con la extensión "-bak"
          fs.renameSync(logoAnteriorPath, bakLogoPath);
        }

        // Verificar si el logo nuevo ya existe en la base de datos
        const logoHash = generateFileHash(nuevoLogo);
        if (await checkDuplicateLogoHash(logoHash, auspiciadorId)) {
          // Eliminar el archivo del nuevo logo
          fs.unlinkSync(nuevoLogo);
          return res.status(400).json({ mensaje: "Este logo ya existe" });
        }

        // Actualizar el logo y el hash del nuevo logo
        updateFields.logo = nuevoLogo;
        updateFields.logo_hash = logoHash;
      }
    }

    // Construir la consulta SQL dinámicamente
    const updateQuery = "UPDATE auspiciadores SET " + Object.keys(updateFields).map(key => `${key} = ?`).join(", ") + ", fecha_a = NOW() WHERE id = ?";
    const updateValues = [...Object.values(updateFields), auspiciadorId];

    // Ejecutar la consulta
    await queryDatabase(updateQuery, updateValues);

    res.json({ mensaje: "Auspiciador actualizado exitosamente" });
  } catch (error) {
    console.error(error);
    if (nuevoLogo) {
      // Eliminar el archivo del nuevo logo en caso de error
      fs.unlinkSync(nuevoLogo);
    }
    res.status(500).json({ mensaje: "Error al actualizar el auspiciador" });
  }
});


router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE auspiciadores SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;
