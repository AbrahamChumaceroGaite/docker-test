const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const db = require("../../services/db");
const { comparePassword } = require("../../utils/compare-passwords");
const { generateFileHash } = require("../../utils/generateHash");
const { getEventById, postEvent, putEvent, deleteEvent, lockEvent, unlockEvent, searchUser, checkDuplicatesTable } = require('./querys-event');
const { getControlledEvents, queryDatabase } = require('../shared/querys')
const { checkDuplicatesSignature, selectPersonQuery, insertSignatureQuery } = require('./querys-signature')
const { checkDuplicatePersonEventQuery, getPersonEventQuery, insertPersonEventQuery } = require('./querys-person')
const { getPaginatedEvents, getTotalEventRecords, getByGroupEvents } = require('./querys-group-event');
const messages = require("../../templates/messages")
const { SendPushNotificationsEvent, SendPushNotificacionsGroups } = require('../../services/notifications/main')

const moment = require('moment-timezone');
moment.tz.setDefault('America/La_Paz');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "assets/eventos/logos");
  },
  filename: function (req, file, cb) {
    const { nombre, idgrupo, autor } = req.body; // Obtén idgrupo y autor desde el body
    const extension = file.originalname.split('.').pop(); // Obtener la extensión del archivo original
    const timestamp = Date.now(); // Obtener el timestamp actual

    const nombreArchivo = `${nombre}-${idgrupo}-${autor}-${timestamp}.${extension}`;
    const rutaArchivo = `assets/eventos/logos/${nombreArchivo}`;

    // Verificar si el archivo ya existe
    if (fs.existsSync(rutaArchivo)) {
      cb("Ya existe un archivo con el mismo nombre", null);
    } else {
      cb(null, nombreArchivo);
    }
  },
});


const upload = multer({ storage: storage });

router.post("/post", upload.single("logo"), async (req, res) => {
  try {
    const { idgrupo, nombre, fecha, fechaF, autor } = req.body;
    const logo = req.file ? req.file.path : null;

    // Verificar duplicados de nombre
    const { query: duplicateQuery, values: duplicateValues } = checkDuplicatesTable(idgrupo, nombre);
    const duplicateResults = await queryDatabase(duplicateQuery, duplicateValues);

    if (duplicateResults[0].count > 0) {
      if (logo) {
        // Eliminar el archivo de logo
        fs.unlinkSync(logo);
      }
      return res.status(409).json({ mensaje: messages.duplicateevent });
    }

    let logoHash = null;
    if (logo) {
      // Generar el hash del logo
      logoHash = generateFileHash(logo);
    }

    const { query: postQuery, values: postValues } = postEvent(idgrupo, nombre, fecha, fechaF, logo || "0", logoHash, autor);
    const results = await queryDatabase(postQuery, postValues);
    SendPushNotificationsEvent(results.insertId, 3)

    res.json({ mensaje: messages.postsuccess });
  } catch (error) {
    console.error(error);
    if (logo) {
      // Eliminar el archivo de logo en caso de error
      fs.unlinkSync(logo);
    }
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/get", async (req, res) => {
  const { id, idgroup } = req.query;
  const query = await getControlledEvents(id, idgroup);
  try {
    db.query(query, async (error, results) => {
      if (error) {
        return res.status(500).json({ mensaje: messages.emptytable });
      }
      res.json(results);
    });
  } catch (error) {
    // Maneja errores aquí
    console.error(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/getLazy", (req, res) => {
  const { id, first, rows, globalFilter, sortField, sortOrder } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);

  const countQuery = getTotalEventRecords(id);
  const query = getPaginatedEvents(id, startIndex, numRows, globalFilter, sortField, sortOrder);


  db.query(countQuery, (countError, countResult) => {

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

  })
});

router.get("/getByGroup", async (req, res) => {
  const { id, } = req.query;
  try {
    const { queryGroup, valuesGroup } = getByGroupEvents(id);
    const results = await queryDatabase(queryGroup, valuesGroup)
    res.json(results);
  } catch (error) { }

});

router.get("/getCharts/:id", (req, res) => {
  const id = req.params.id;

  // Consulta 1: Obtener información básica del evento
  const query1 = `SELECT e.nombre, e.fecha, e.fechaf, e.logo, e.cerrado as status FROM evento e WHERE e.id = ${id}`;

  // Consulta 2: Contar el número de inscritos
  const query2 = `SELECT COUNT(*) as inscritos FROM evento_p p JOIN evento e ON p.idevento = e.id WHERE p.disponible = 1 AND e.id = ${id}`;

  // Consulta 3: Contar el número de anulados
  const query3 = `SELECT COUNT(*) as anulados FROM evento_p p JOIN evento e ON p.idevento = e.id WHERE p.disponible = 0 AND e.id = ${id}`;

  // Consulta 4: Contar el número de instituciones
  const query4 = `SELECT COUNT(*) as instituciones FROM evento_aus eu WHERE eu.idevento = ${id}`;

  // Consulta 5: Contar el número de firmantes
  const query5 = `SELECT COUNT(*) as firmantes FROM evento_s es WHERE es.idevento = ${id}`;

  // Consulta 6: Contar el número de inscritos con certificados
  const query6 = `SELECT COUNT(*) as con_certificados FROM evento_p ep WHERE ep.idevento = ${id} AND ep.disponible = 1 AND ep.entregado = 1`;

  // Consulta 7: Contar el número de inscritos sin certificados
  const query7 = `SELECT COUNT(*) as sin_certificados FROM evento_p ep WHERE ep.idevento = ${id} AND ep.disponible = 1 AND (ep.entregado = 0 OR ep.entregado IS NULL)`;

  const query8 = `SELECT COUNT(*) as en_revision FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 1 AND c.disponible = 1 AND e.disponible = 1 AND e.id = ${id}`;

  // Consulta 9: Contar el número de certificados en espera
  const query9 = `SELECT COUNT(*) as en_espera FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 2 AND c.disponible = 1 AND e.disponible = 1  AND e.id = ${id}`;

  // Consulta 10: Contar el número de certificados emitidos
  const query10 = `SELECT COUNT(*) as en_emitido FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 3 AND c.disponible = 1 AND e.disponible = 1  AND e.id = ${id}`;

  // Consulta 11: Contar el número de certificados anulados
  const query11 = `SELECT COUNT(*) as en_anulado FROM certificado c JOIN plantilla p ON c.idplantilla = p.id JOIN evento e ON p.idevento = e.id WHERE c.status = 4 AND c.disponible = 1 AND e.disponible = 1  AND e.id = ${id}`;

  // Ejecutar las consultas en paralelo
  db.query(query1, (error1, results1) => {
    if (error1) throw error1;

    db.query(query2, (error2, results2) => {
      if (error2) throw error2;

      db.query(query3, (error3, results3) => {
        if (error3) throw error3;

        db.query(query4, (error4, results4) => {
          if (error4) throw error4;

          db.query(query5, (error5, results5) => {
            if (error5) throw error5;

            db.query(query6, (error6, results6) => {
              if (error6) throw error6;

              db.query(query7, (error7, results7) => {
                if (error7) throw error7;

                db.query(query8, (error8, results8) => {
                  if (error8) throw error8;

                  db.query(query9, (error9, results9) => {
                    if (error9) throw error9;

                    db.query(query10, (error10, results10) => {
                      if (error10) throw error10;

                      db.query(query11, (error11, results11) => {
                        if (error11) throw error11;

                        // Construir un objeto JSON con las respuestas
                        const response = {
                          infoBasica: results1[0],
                          inscritos: results2[0].inscritos,
                          anulados: results3[0].anulados,
                          instituciones: results4[0].instituciones,
                          firmantes: results5[0].firmantes,
                          conCertificados: results6[0].con_certificados,
                          sinCertificados: results7[0].sin_certificados,
                          en_revision: results8[0].en_revision,
                          en_espera: results9[0].en_espera,
                          en_emitido: results10[0].en_emitido,
                          en_anulado: results11[0].en_anulado
                        };

                        // Enviar el objeto JSON como respuesta
                        res.json(response);
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

router.get("/getById/:id", (req, res) => {
  const id = req.params.id;
  const { query, values } = getEventById(id);
  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: messages.errorquery });
    }
    res.json(results);
  });
});

// Ruta PUT para actualizar eventos
router.put("/put/:id", upload.single("logo"), async (req, res) => {
  const eventId = req.params.id;
  const { idgrupo, nombre, fecha, fechaF, autor } = req.body;
  const logo = req.file ? req.file.path : null;

  try {
    // Verificar si el evento a actualizar existe
    const eventExistsQuery = "SELECT COUNT(*) AS count, logo FROM evento WHERE id = ?";
    const eventExistsValues = [eventId];
    const eventExistsResult = await queryDatabase(eventExistsQuery, eventExistsValues);

    if (eventExistsResult[0].count === 0) {
      if (logo) {
        // Eliminar el archivo de logo
        fs.unlinkSync(logo);
      }
      return res.status(404).json({ mensaje: messages.eventnotfound });
    }

    // Verificar si el nuevo nombre ya existe en otro evento
    if (nombre) {
      const duplicateQuery = "SELECT COUNT(*) AS count FROM evento WHERE nombre = ? AND id <> ?";
      const duplicateValues = [nombre, eventId];
      const duplicateResult = await queryDatabase(duplicateQuery, duplicateValues);

      if (duplicateResult[0].count > 0) {
        if (logo) {
          // Eliminar el archivo de logo
          fs.unlinkSync(logo);
        }
        return res.status(409).json({ mensaje: messages.duplicateevent });
      }
    }

    let logoHash = null;
    if (logo) {
      // Generar el hash del nuevo logo
      logoHash = generateFileHash(logo);
    
      // Verificar si el archivo original existe antes de intentar renombrarlo
      if (eventExistsResult[0].logo && fs.existsSync(eventExistsResult[0].logo)) {
        const existingLogoPath = eventExistsResult[0].logo;
        const bakLogoPath = existingLogoPath + "-bak";
        
        // Renombrar el archivo original con la extensión "-bak"
        fs.renameSync(existingLogoPath, bakLogoPath);
      }
    }

    // Construir la actualización de los campos que llegaron en la solicitud
    const updateFields = [];
    const updateValues = [];

    if (idgrupo) {
      updateFields.push("idgrupo = ?");
      updateValues.push(idgrupo);
    }

    if (nombre) {
      updateFields.push("nombre = ?");
      updateValues.push(nombre);
    }

    if (fecha) {
      updateFields.push("fecha = ?");
      updateValues.push(fecha);
    }

    if (fechaF) {
      updateFields.push("fechaF = ?");
      updateValues.push(fechaF);
    }

    if (logo) {
      updateFields.push("logo = ?");
      updateValues.push(logo);
      updateFields.push("logo_hash = ?");
      updateValues.push(logoHash);
    }

    // Realizar la actualización en la base de datos
    const updateQuery = `UPDATE evento SET ${updateFields.join(", ")}, fecha_a = NOW()  WHERE id = ?`;
    updateValues.push(eventId);

    await queryDatabase(updateQuery, updateValues);

    res.json({ mensaje: messages.updatesuccess });
  } catch (error) {
    console.error(error);
    if (logo) {
      // Eliminar el archivo de logo en caso de error
      fs.unlinkSync(logo);
    }
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const { query, values } = deleteEvent(id);
  db.query(query, values, (error) => {
    if (error) {
      return res.status(500).json({ mensaje: messages.errorquery });
    }
    res.json({ mensaje: messages.deletesuccess });
  });
});

router.post('/unlock', (req, res) => {
  const { id, autor, contrasena } = req.body;
  // Buscar el usuario en la base de datos por iduser
  const { query, values } = searchUser(autor);
  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: messages.errorquery });
    } else {
      if (results.length > 0) {
        const user = results[0];
        // Comparar la contraseña ingresada con la almacenada en la base de datos
        if (comparePassword(contrasena, user.contrasena)) {
          const { query, values } = unlockEvent(id);
          db.query(query, values, (error) => {
            if (error) {
              return res.status(500).json({ mensaje: messages.errorquery });
            }
            res.json({ mensaje: "Evento Desbloqueado Exitosamente" });
          });
        } else {
          res.status(401).json({ mensaje: messages.loginfailed });
        }
      } else {
        res.status(401).json({ mensaje: messages.loginouser });
      }
    }
  });
});

router.delete("/lock/:id", (req, res) => {
  const id = req.params.id;
  const { query, values } = lockEvent(id);
  db.query(query, values, (error) => {
    if (error) {
      return res.status(500).json({ mensaje: messages.errorquery });
    }
    res.json({ mensaje: "Evento Bloqueado Exitosamente" });
  });
});

////// TABLA DE EVENTO Y AUSPICIADOR //////

router.post("/auspiciador/post", (req, res) => {
  const { idevento, idauspiciador, autor } = req.body;

  // Verificar si ya existe un registro con los mismos valores
  const selectQuery = `SELECT * FROM evento_aus WHERE idevento = ${idevento} AND idauspiciador = ${idauspiciador};`;
  db.query(selectQuery, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Si se encontró un registro existente, obtener el nombre del auspiciador
      const selectAuspiciadorQuery = `SELECT  u.nombre from evento_aus e join auspiciadores u on e.idauspiciador = u.id where e.idauspiciador = ${idauspiciador};`;
      db.query(selectAuspiciadorQuery, (error, auspiciadorResults) => {
        if (error) throw error;

        // Obtener el nombre del auspiciador encontrado en la consulta
        const nombreAuspiciador = auspiciadorResults[0].nombre;

        // Generar mensaje de error con el nombre del auspiciador
        const mensajeError = `${nombreAuspiciador} ya está registrado para este evento.`;
        return res.status(400).json({ mensaje: mensajeError });
      });
    } else {
      // Si no se encontró un registro existente, realizar la inserción
      const insertQuery = `INSERT INTO evento_aus (idevento, idauspiciador, disponible, idautor) VALUES (?, ?, 1, ?);`;
      const values = [idevento, idauspiciador, autor]
      db.query(insertQuery, values, (error, result) => {
        if (error) throw error;
        const id = result.insertId;
        SendPushNotificationsEvent(id, 1)
        res.json({ mensaje: "Registrado exitosamente" });
      });
    }
  });
});

router.get("/auspiciador/get", (req, res) => {
  const query = `SELECT a.nombre as "auspiciador", a.logo as "logoa", e.nombre as "evento", e.cerrado as "cerrado", e.logo as "logoe", ep.* FROM evento_aus ep JOIN auspiciadores a on ep.idauspiciador = a.id JOIN evento e on ep.idevento = e.id WHERE ep.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/auspiciador/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT a.nombre as "auspiciador", a.logo as "logoa", e.nombre as "evento", e.logo, ep.* FROM evento_aus ep JOIN auspiciadores a on ep.idauspiciador = a.id JOIN evento e on ep.idevento = e.id WHERE ep.disponible = 1 AND ep.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/auspiciador/getByEvent/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT a.nombre as "auspiciador", a.logo as "logoa", e.nombre as "evento", e.cerrado as "cerrado", e.logo, ep.* FROM evento_aus ep JOIN auspiciadores a on ep.idauspiciador = a.id JOIN evento e on ep.idevento = e.id WHERE ep.disponible = 1 AND e.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/auspiciador/put/:id", (req, res) => {
  const id = req.params.id;
  const { idauspiciador, idevento, autor } = req.body;

  let query;
  let values = [];

  if (idauspiciador && idevento) {
    // Ambos valores se proporcionaron, comprobar si ya existe la combinación en la misma fila
    query = `SELECT * FROM evento_aus WHERE idevento = ? AND idauspiciador = ? AND id != ?`;
    values = [idevento, idauspiciador, id];
  } else if (idauspiciador) {
    // Solo se proporcionó el valor de idauspiciador, comprobar si existe la combinación en alguna fila
    query = `SELECT * FROM evento_aus WHERE idauspiciador = ? AND idevento IN (SELECT idevento FROM evento_aus WHERE id = ?) AND id != ?`;
    values = [idauspiciador, id, id];
  } else if (idevento) {
    // Solo se proporcionó el valor de idevento, comprobar si existe la combinación en alguna fila
    query = `SELECT * FROM evento_aus WHERE idevento = ? AND idauspiciador IN (SELECT idauspiciador FROM evento_aus WHERE id = ?) AND id != ?`;
    values = [idevento, id, id];
  } else {
    // No se enviaron campos para actualizar
    return res.json({ mensaje: "No se enviaron campos para actualizar" });
  }

  // Realizar la consulta para comprobar la existencia de la combinación
  db.query(query, values, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Si se encontró un registro existente, generar mensaje de error
      const mensajeError = "Ya se encuentra registrado a este Evento";
      return res.json({ mensaje: mensajeError });
    } else {
      // No se encontraron registros existentes, realizar la actualización
      let updates = '';

      if (idevento) {
        updates += `idevento = ${idevento}`;
      }
      if (idauspiciador) {
        if (updates !== '') {
          updates += ', ';
        }
        updates += `idauspiciador = ${idauspiciador}`;
      }
      if (autor) {
        if (updates !== '') {
          updates += ', ';
        }
        updates += `idautor = ${autor}`;
      }

      if (updates === '') {
        // No se enviaron campos para actualizar
        return res.json({ mensaje: "No se enviaron campos para actualizar" });
      }

      const updateQuery = `UPDATE evento_aus SET ${updates}, fecha_a = NOW() WHERE id = ${id}`;
      db.query(updateQuery, (error) => {
        if (error) throw error;
        res.json({ mensaje: "Registro actualizado exitosamente" });
      });
    }
  });
});

router.delete("/auspiciador/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `DELETE FROM evento_aus WHERE id= ${id}`;
  db.query(query, (error) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

////// TABLA DE PERSONAS Y EVENTOS //////

router.post("/inscrito/post", async (req, res) => {
  try {
    const { idpersona, idevento, autor } = req.body;

    const { selectQuery, selectValues } = await checkDuplicatePersonEventQuery(idpersona, idevento)

    const results = await queryDatabase(selectQuery, selectValues);

    if (results.length > 0) {
      // Si se encontró un registro existente, obtener el nombre de la persona
      const { selectPersonaQuery, selectPersonaValues } = await getPersonEventQuery(idpersona)
      const personaResults = await queryDatabase(selectPersonaQuery, selectPersonaValues);

      // Obtener el nombre de la persona encontrado en la consulta
      const nombrePersona = personaResults[0].nombre;

      // Generar mensaje de error con el nombre de la persona
      const mensajeError = `${nombrePersona} ya está inscrito para este evento.`;
      return res.status(400).json({ mensaje: mensajeError });
    } else {
      // Si no se encontró un registro existente, realizar la inserción

      const { insertQuery, insertValues } = await insertPersonEventQuery(idpersona, idevento, autor)

      await queryDatabase(insertQuery, insertValues);
      await SendPushNotificacionsGroups(idevento, 3, idpersona)
      res.json({ mensaje: messages.postsuccess });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/inscrito/get", (req, res) => {
  const query = `SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS persona, e.nombre as "evento", e.logo, ep.* FROM evento_p ep JOIN persona p on ep.idpersona = p.id JOIN evento e on ep.idevento = e.id WHERE ep.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/inscrito/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS persona, e.nombre as "evento", e.logo, ep.* FROM evento_p ep JOIN persona p on ep.idpersona = p.id JOIN evento e on ep.idevento = e.id WHERE ep.disponible = 1 AND ep.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/inscrito/getByEvent/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS persona, e.nombre as "evento",e.cerrado as "cerrado", e.logo, ep.* FROM evento_p ep JOIN persona p on ep.idpersona = p.id JOIN evento e on ep.idevento = e.id WHERE ep.disponible = 1 AND e.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/inscrito/put/:id", (req, res) => {
  const id = req.params.id;
  const { idpersona, idevento } = req.body;

  let query;
  let values = [];

  if (idpersona && idevento) {
    // Ambos valores se proporcionaron, comprobar si ya existe la combinación en la misma fila
    query = `SELECT * FROM evento_p WHERE idpersona = ? AND idevento = ? AND id != ?`;
    values = [idpersona, idevento, id];
  } else if (idpersona) {
    // Solo se proporcionó el valor de idpersona, comprobar si existe la combinación en alguna fila
    query = `SELECT * FROM evento_p WHERE idpersona = ? AND idevento IN (SELECT idevento FROM evento_p WHERE id = ?) AND id != ?`;
    values = [idpersona, id, id];
  } else if (idevento) {
    // Solo se proporcionó el valor de idevento, comprobar si existe la combinación en alguna fila
    query = `SELECT * FROM evento_p WHERE idevento = ? AND idpersona IN (SELECT idpersona FROM evento_p WHERE id = ?) AND id != ?`;
    values = [idevento, id, id];
  } else {
    // No se enviaron campos para actualizar
    return res.json({ mensaje: "No se enviaron campos para actualizar" });
  }

  // Realizar la consulta para comprobar la existencia de la combinación
  db.query(query, values, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Si se encontró un registro existente, generar mensaje de error
      const mensajeError = "Ya ha sido Inscrito a este Evento";
      return res.json({ mensaje: mensajeError });
    } else {
      // No se encontraron registros existentes, realizar la actualización
      let updates = '';
      const updateValues = [];

      if (idpersona) {
        updates += `idpersona = ?`;
        updateValues.push(idpersona);
      }
      if (idevento) {
        if (updates !== '') {
          updates += ', ';
        }
        updates += `idevento = ?`;
        updateValues.push(idevento);
      }

      if (updates === '') {
        // No se enviaron campos para actualizar
        return res.json({ mensaje: "No se enviaron campos para actualizar" });
      }

      const updateQuery = `UPDATE evento_p SET ${updates}, fecha_a = NOW() WHERE id = ?`;
      updateValues.push(id);

      db.query(updateQuery, updateValues, (error) => {
        if (error) throw error;
        res.json({ mensaje: "Registro actualizado exitosamente" });
      });
    }
  });
});

router.delete("/inscrito/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE evento_p SET disponible = 0 WHERE id = ${id}`;
  db.query(query, (error) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

////// TABLA DE PERSONAS Y Firmantes //////

router.post("/firmantes/post", async (req, res) => {
  const { idusuario, idevento, autor } = req.body;

  try {
    // Verificar si ya existe un registro con los mismos valores
    const { selectQuery, selectValues } = await checkDuplicatesSignature(idusuario, idevento)
    const results = await queryDatabase(selectQuery, selectValues);

    if (results.length > 0) {
      // Si se encontró un registro existente, obtener el nombre de la persona
      const { selectPersonaQuery, selectPersonaValues } = await selectPersonQuery(idusuario)
      const personaResults = await queryDatabase(selectPersonaQuery, selectPersonaValues);

      // Obtener el nombre de la persona encontrado en la consulta
      const nombrePersona = personaResults[0].nombre;

      // Generar mensaje de error con el nombre de la persona
      const mensajeError = `${nombrePersona} ya estaba registrado en este evento.`;
      return res.status(400).json({ mensaje: mensajeError });
    } else {
      // Si no se encontró un registro existente, realizar la inserción
      const { insertQuery, insertValues } = await insertSignatureQuery(idusuario, idevento, autor)
      const result = await queryDatabase(insertQuery, insertValues);
      // PASO 1 - Enviar notificación al usuario
      const id = result.insertId;
      SendPushNotificationsEvent(id, 2);
      res.json({ mensaje: "Registrado exitosamente" });
    }
  } catch (error) {
    console.error('Error al realizar la operación', error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

router.get("/firmantes/get", (req, res) => {
  const query = `SELECT s.id as "id", s.*, CONCAT_WS(' ', p.nombre, p.apellido) AS usuario, f.firma as "firma", e.nombre as "evento", e.logo as "logo" FROM evento_s s
  JOIN usuario_fd uf on s.idusuario_fd = uf.id
  JOIN usuario_f u on uf.idusuariof = u.id
  JOIN usuario u2 on u.idusuario = u2.id
  JOIN persona p on u2.idpersona = p.id
  JOIN evento e on s.idevento = e.id
  JOIN firmas f on u.idfirma = f.id WHERE s.disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/firmantes/getById/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT s.id as "id", s.*, CONCAT_WS(' ', p.nombre, p.apellido) AS usuario, f.firma as "firma", e.nombre as "evento", e.logo as "logo" FROM evento_s s
  JOIN usuario_fd uf on s.idusuario_fd = uf.id
  JOIN usuario_f u on uf.idusuariof = u.id
  JOIN usuario u2 on u.idusuario = u2.id
  JOIN persona p on p.id = u2.idpersona
  JOIN evento e on s.idevento = e.id
  JOIN firmas f on u.idfirma = f.id WHERE s.disponible = 1 AND s.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/firmantes/getByEvent/:id", (req, res) => {
  const id = req.params.id;
  const query = `SELECT s.id as "id", s.*, CONCAT_WS(' ', p.nombre, p.apellido) AS usuario, f.firma as "firma", e.nombre as "evento", e.cerrado as "cerrado", e.logo as "logo" FROM evento_s s
  JOIN usuario_fd uf on s.idusuario_fd = uf.id
  JOIN usuario_f u on uf.idusuariof = u.id
  JOIN usuario u2 on u.idusuario = u2.id
  JOIN persona p on p.id = u2.idpersona
  JOIN evento e on s.idevento = e.id
  JOIN firmas f on u.idfirma = f.id WHERE s.disponible = 1 AND e.id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.put("/firmantes/put/:id", (req, res) => {
  const id = req.params.id;
  const { idusuario, idevento, autor } = req.body;

  let query;
  let values = [];

  if (idusuario && idevento) {
    // Ambos valores se proporcionaron, comprobar si ya existe el firmante para el evento
    query = `SELECT * FROM evento_s WHERE idusuario_fd = ? AND idevento = ? AND id != ?`;
    values = [idusuario, idevento, id];
  } else if (idusuario) {
    // Solo se proporcionó el valor de idusuario, comprobar si existe el firmante para algún evento
    query = `SELECT * FROM evento_s WHERE idusuario_fd = ? AND idevento IN (SELECT idevento FROM evento_s WHERE id = ?) AND id != ?`;
    values = [idusuario, id, id];
  } else if (idevento) {
    // Solo se proporcionó el valor de idevento, comprobar si existe el firmante para algún usuario
    query = `SELECT * FROM evento_s WHERE idevento = ? AND idusuario_fd IN (SELECT idusuario_fd FROM evento_s WHERE id = ?) AND id != ?`;
    values = [idevento, id, id];
  } else {
    // No se enviaron campos para actualizar
    return res.json({ mensaje: "No se enviaron campos para actualizar" });
  }

  // Realizar la consulta para comprobar la existencia del firmante para el evento
  db.query(query, values, (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      // Si se encontró un registro existente, generar mensaje de error
      const mensajeError = "Ya existe un Firmante para este Evento";
      return res.json({ mensaje: mensajeError });
    } else {
      // No se encontraron registros existentes, realizar la actualización
      let updates = '';

      if (idusuario) {
        updates += `idusuario_fd = ${idusuario}`;
      }
      if (idevento) {
        if (updates !== '') {
          updates += ', ';
        }
        updates += `idevento = ${idevento}`;
      }
      if (autor) {
        if (updates !== '') {
          updates += ', ';
        }
        updates += `idautor = ${autor}`;
      }

      if (updates === '') {
        // No se enviaron campos para actualizar
        return res.json({ mensaje: "No se enviaron campos para actualizar" });
      }

      const updateQuery = `UPDATE evento_s SET ${updates}, fecha_a = NOW() WHERE id = ${id}`;
      db.query(updateQuery, (error) => {
        if (error) throw error;
        res.json({ mensaje: "Registro actualizado exitosamente" });
      });
    }
  });
});

router.delete("/firmantes/delete/:id", (req, res) => {
  const id = req.params.id;
  const query = `DELETE FROM evento_s WHERE id = ${id}`;
  db.query(query, (error) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;