const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const db = require("../../services/db");
const crypto = require("crypto");
const messages = require('../../templates/messages')
const {getPaginatedTemplates,  getTotalTemplatesRecords, insertTemplateQuery} = require("./querys");
const { getControlledEvents, queryDatabase } = require('../shared/querys')
const { SendPushNotificationsEvent, SendPushNotificacionsGroups } = require('../../services/notifications/main')
const moment = require('moment');
require('moment-timezone');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "assets/plantillas/thumbail"); // Ruta donde deseas guardar la imagen en el servidor
  },
  filename: function (req, file, cb) {
    const nombreArchivo = `${Date.now()}-${req.body.idautor}-${file.originalname}`; // Genera un nombre de archivo único con timestamp e idautor
    cb(null, nombreArchivo.replace(/\\/g, '/')); // Reemplaza barras invertidas con barras diagonales
  },
});

const upload = multer({ storage: storage });

router.post("/post", upload.single("imagen"), async (req, res) => {
  try {
    const { idEvento, nombre, config, autor } = req.body;
    const imagen = req.file ? req.file.path : null;
    const {query, values} = await insertTemplateQuery(idEvento, nombre, config, imagen || "", autor);
    const result = await queryDatabase(query, values);

    if (result.error) {
      if (imagen) {
        fs.unlinkSync(imagen);
      }
      return res.status(500).json({ mensaje: messages.errorquery });
    }
    SendPushNotificationsEvent(idEvento, 4)
    res.json({ mensaje:  messages.postsuccess });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/get", (req, res) => {
  const query = `SELECT p.*, e.nombre as "evento", e.cerrado as "cerrado" from plantilla p JOIN evento e ON p.idevento = e.id WHERE e.disponible=1 AND p.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/getEvent", (req, res) => {
  const query = `SELECT * FROM evento WHERE disponible = 1 AND cerrado = 0`;
  db.query(query, (error, results) => {
    if (error) {
      console.log(error)
      return res.status(500).json({ mensaje: messages.errorquery });
    }
    res.json(results);
  });
});

router.get("/getEventById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM evento WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) {
      console.log(error)
      return res.status(500).json({ mensaje: messages.errorquery });
    }
    res.json(results);
  });
});

router.get("/getLazy", (req, res) => {
  const { id, globalFilter} = req.query;

  // Consulta principal con LIMIT
  const query = getPaginatedTemplates(id, 0, 0, globalFilter);

  // Consulta para contar el número total de registros (sin LIMIT)
  const countQuery = getTotalTemplatesRecords(id)

  db.query(countQuery, (countError, countResult) => {
    if (countError) {
      return res.status(500).json({ mensaje: messages.emptytable});
    }

    const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

      db.query(query, (error, results) => {
        if (error) {
          console.log(error)
          return res.status(500).json({ mensaje: messages.errorquery });
        }
        res.json({ items: results, totalRecords: totalRecords });
      });

  })
});

router.get("/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM plantilla WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    const template = results
    const idevent = results[0].idevento
    const query2 = `SELECT * FROM evento WHERE disponible = 1 AND id = ${idevent}`;
    db.query(query2, (error, results) => {
      if (error) throw error;
      res.json({ events: results, template: template });
    })
  });
});

router.get("/massive/getById/:id", (req, res) => {
  const id = req.params.id;

  const plantillaQuery = `SELECT * FROM plantilla WHERE id = ${id} AND disponible = 1`;

  db.query(plantillaQuery, (error, plantillaResults) => {
    if (error) throw error;
    if (plantillaResults.length === 0) {
      res.json({
        message: "No se encontró la plantilla con el ID especificado",
      });
    } else {
      const idevento = plantillaResults[0].idevento;

      const eventoQuery = `SELECT * FROM evento WHERE id = ${idevento} AND disponible = 1`;
      const personasQuery = `SELECT p.id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, p.correo, p.numero, p.ci, ep.id as "epid"
                             FROM persona p
                             JOIN evento_p ep ON p.id = ep.idpersona
                             WHERE ep.idevento = ${idevento} AND ep.entregado = 0 AND p.disponible = 1`;
      const direccionQuery = `SELECT p.nombre, f.firma, d.nombre AS direccion
      FROM evento_s es
      JOIN usuario_fd ufd ON ufd.id = es.idusuario_fd
      JOIN usuario_f uf ON uf.id = ufd.idusuariof
      JOIN usuario u ON u.id = uf.idusuario
      JOIN persona p ON p.id = u.idpersona
      JOIN firmas f ON f.id = uf.idfirma
      JOIN direccion d ON d.id = ufd.idireccion
      WHERE es.idevento = ${idevento} and es.disponible = 1`;
      const auspiciadorQuery = `SELECT nombre, logo FROM auspiciadores WHERE id IN (SELECT idauspiciador FROM evento_aus WHERE idevento = ${idevento} and disponible = 1)`;

      const responseData = {};

      db.query(eventoQuery, (error, eventoResults) => {
        if (error) throw error;
        responseData.evento = eventoResults[0];

        db.query(personasQuery, (error, personasResults) => {
          if (error) throw error;
          responseData.personas = personasResults;

          // Promesa para la consulta de dirección
          const direccionPromise = new Promise((resolve, reject) => {
            db.query(direccionQuery, (error, direccionResults) => {
              if (error) reject(error);
              responseData.direccion = direccionResults; // Asignar todos los resultados
              resolve();
            });
          });

          // Promesa para la consulta de auspiciador
          const auspiciadorPromise = new Promise((resolve, reject) => {
            db.query(auspiciadorQuery, (error, auspiciadorResults) => {
              if (error) reject(error);
              responseData.auspiciador = auspiciadorResults;
              resolve();
            });
          });

          // Esperar a que ambas promesas se resuelvan
          Promise.all([direccionPromise, auspiciadorPromise])
            .then(() => {
              // Agregar los resultados de plantillaQuery a la respuesta final
              responseData.plantilla = plantillaResults[0];

              // Concatenar los resultados en un único objeto de respuesta
              const finalResponse = {
                plantilla: responseData.plantilla,
                evento: responseData.evento,
                personas: responseData.personas,
                direccion: responseData.direccion,
                auspiciador: responseData.auspiciador,
              };

              res.json(finalResponse);
            })
            .catch((error) => {
              throw error;
            });
        });
      });
    }
  });
});

router.put("/put/:id",upload.single("imagen"), (req, res) => {
  const id = req.params.id;
  const { idEvento, nombre, config, autor } = req.body;

  const nuevaImagen = req.file ? req.file.path : null;
  // Obtiene la ruta de la imagen actual en la base de datos
  const queryImagenActual = `SELECT logo FROM plantilla WHERE id = ${id}`;
  db.query(queryImagenActual, (error, results) => {
    if (error) {
      if (nuevaImagen) {
        fs.unlinkSync(nuevaImagen);
      }
      return res.status(500).json({ mensaje: "Error en la consulta a la base de datos" });
    }

    let rutaImagenAnterior = results[0].logo;

    // Eliminar imagen anterior si existe
    if (rutaImagenAnterior && fs.existsSync(rutaImagenAnterior)) {
      // Renombrar la imagen anterior con sufijo -bak
      const nuevaRutaImagenAnterior = rutaImagenAnterior + '-bak';
      fs.renameSync(rutaImagenAnterior, nuevaRutaImagenAnterior);
    }

    // Actualiza la ruta de la imagen en la base de datos con la nueva imagen
    const updateFields = ["logo = ?"];
    const params = [nuevaImagen];

    if (nombre) {
      updateFields.push("nombre = ?");
      params.push(nombre);
    }

    if (config) {
      updateFields.push("config = ?");
      params.push(config);
    }

    if (updateFields.length === 1) {
      return res.status(400).json({ mensaje: "Nada que actualizar" });
    }

    const updateQuery = `UPDATE plantilla SET ${updateFields.join(', ')}, fecha_a= NOW() WHERE id = ?`;
    params.push(id);

    db.query(updateQuery, params, (error, results) => {
      if (error) {
        return res.status(500).json({ mensaje: "Error en la consulta a la base de datos" });
      }
      res.json({ mensaje: "Registro actualizado exitosamente" });
    });
  });
});

router.put("/check/:id", (req, res) => {
  const id = req.params.id;
  const idevento = req.body.idevento
  // Verificar si todos los certificados con el mismo id_plantilla tienen notificado = 1
  const queryVerificarNotificados = `SELECT COUNT(*) as pendiente FROM evento_p ep JOIN plantilla p ON p.idevento = ep.idevento WHERE ep.idevento = ${idevento} AND ep.disponible = 1 AND ep.entregado = 0`;
  db.query(queryVerificarNotificados, (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: "Error en la consulta a la base de datos" });
    }

    const totalNotificados = results[0].pendiente;
    if (totalNotificados > 0) {
      // Si ninguno de los certificados tiene notificado = 1, no se puede actualizar la tabla
      return res.json({ mensaje: "No se puede actualizar la plantilla. No todos los certificados están notificados." });
    }

    // Si todos los certificados tienen notificado = 1, procedemos a actualizar la tabla plantilla
    const queryActualizarPlantilla = `UPDATE evento SET cerrado = 1 WHERE id = ${idevento}`;
    db.query(queryActualizarPlantilla, (error, results) => {
      if (error) {
        return res.status(500).json({ mensaje: "Error en la consulta a la base de datos" });
      }
      SendPushNotificationsEvent(idevento, 5)
      res.json({ mensaje: "Registro actualizado exitosamente" });
    });
  });
});

router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE plantilla SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

router.get("/sponsor/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT nombre, logo FROM auspiciadores WHERE id IN (SELECT idauspiciador FROM evento_aus WHERE idevento = ${id} and disponible = 1);`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/signature/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, f.firma, d.nombre AS direccion
  FROM evento_s es
  JOIN usuario_fd ufd ON ufd.id = es.idusuario_fd
  JOIN usuario_f uf ON uf.id = ufd.idusuariof
  JOIN usuario u ON u.id = uf.idusuario
  JOIN persona p ON p.id = u.idpersona
  JOIN firmas f ON f.id = uf.idfirma
  JOIN direccion d ON d.id = ufd.idireccion
  WHERE es.idevento = ${id} and es.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

module.exports = router;
