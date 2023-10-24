const express = require("express");
const router = express.Router();
const db = require("../../services/db");
const moment = require('moment');
const verifyToken = require('../../middleware/middleware');
const { queryDatabase } = require('../shared/querys')
const {SendPushNotificationsCertified,} = require ('../../services/notifications/main')
const {readUpdateCertified, readUpdateQRCertified, downloadCertified, checkDuplicateCertified, insertCertified, updatePersonEvent} = require ('./querys')
const messages = require ('../../templates/messages')
require('moment-timezone');

router.post("/post", verifyToken, async (req, res) => {
  const { idplantilla, idpersona_e, uid, autor } = req.body;

  try {
    // Verificar duplicados en la tabla certificado
    const { duplicateQuery, duplicateValues } = await checkDuplicateCertified(idplantilla, idpersona_e);

    const duplicateResults = await queryDatabase(duplicateQuery, duplicateValues);

    if (duplicateResults.length > 0) {
      const mensajeError = `Esta Persona Ya Tiene Su Certificado`;
      return res.status(500).json({ mensaje: mensajeError });
    }

    // Insertar nuevo certificado
    const { insertCertificadoQuery, insertCertificadoValues } = await insertCertified(uid, idplantilla, idpersona_e, autor);

    await queryDatabase(insertCertificadoQuery, insertCertificadoValues);

    // Actualizar la tabla evento_p
    const {updateEventoQuery, updateEventoValues} = await updatePersonEvent(idpersona_e)

    await queryDatabase(updateEventoQuery, updateEventoValues);

    res.json({ mensaje: "Registrado exitosamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/get", verifyToken, (req, res) => {
  const query = `SELECT p.id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, p.correo as "correo", e.id as idevento, e.nombre as evento, e.fecha as "fecha_e", IFNULL(c.status, '0') AS status, IFNULL(c.uid, 'sin_certificado') AS uid, c.id as "id_certificado", 
  IFNULL(c.revisado, '0') AS revisado,  IFNULL(c.vistas, '0') AS vistas,  IFNULL(c.notificado, '0') AS notificado, c.fecha_n, c.fecha_v, c.fecha_r
  FROM persona p
  JOIN evento_p ep ON p.id = ep.idpersona
  JOIN certificado c ON ep.id = c.idpersona_e
  JOIN evento e ON ep.idevento = e.id AND c.disponible = 1;`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/getById/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM certificado WHERE id = ${id} AND disponible = 1`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/admin/getByEvent/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const Query = `SELECT p.id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, p.correo as "correo", e.id as idevento, e.nombre as "evento", e.fecha as "fecha_e", IFNULL(c.status, '0') AS status, IFNULL(c.uid, 'sin_certificado') AS uid, c.id as "id_certificado",
  IFNULL(c.revisado, '0') AS revisado,  IFNULL(c.vistas, '0') AS vistas,  IFNULL(c.notificado, '0') AS notificado, c.fecha_n, c.fecha_v, c.fecha_r
  FROM persona p
  JOIN evento_p ep ON p.id = ep.idpersona
  JOIN certificado c ON ep.id = c.idpersona_e
  JOIN evento e ON ep.idevento = e.id WHERE e.id = ${id} AND c.disponible = 1`;

  db.query(Query, (error, result) => {
    if (error) throw error;

    res.json(result);
  });
});

router.get("/getByEvent/:id", verifyToken, (req, res) => {
  const eventoId = req.params.id;

  const personasQuery = `SELECT p.id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, e.nombre as evento, e.cerrado, ep.id as idpersona, IFNULL(c.status, '0') AS status, IFNULL(c.uid, 'sin_certificado') AS uid
                         FROM persona p
                         LEFT JOIN evento_p ep ON p.id = ep.idpersona
                         LEFT JOIN certificado c ON ep.id = c.idpersona_e
                         LEFT JOIN evento e ON ep.idevento = e.id
                         WHERE ep.idevento = ${eventoId} AND ep.disponible = 1`;

  db.query(personasQuery, (error, personasResults) => {
    if (error) throw error;

    if (personasResults.length === 0) {
      res.json({
        mensaje: "No se encontraron personas para el evento especificado",
      });
    } else {
      res.json(personasResults);
    }
  });
});

router.get("/massive/getById/:id", (req, res) => {
  const hash = req.params.id;
  const certificadoQuery = `SELECT * FROM certificado WHERE uid = '${hash}' AND disponible = 1`;

  db.query(certificadoQuery, (error, certificadoResults) => {
    if (error) throw error;
    if (certificadoResults.length === 0) {
      res.json({
        mensaje: "No se encontró el certificado con el ID especificado",
      });
    } else {
      const id = certificadoResults[0].id;
      const idpersona_e = certificadoResults[0].idpersona_e;

      const plantillaQuery = `SELECT * FROM plantilla WHERE id = (SELECT idplantilla FROM certificado WHERE id = ${id}) AND disponible = 1`;
      const eventoQuery = `SELECT * FROM evento WHERE id = (SELECT idevento FROM plantilla WHERE id = (SELECT idplantilla FROM certificado WHERE id = ${id}) AND disponible = 1) AND disponible = 1`;
      const personaQuery = `SELECT p.id, CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, p.correo, p.numero, p.ci, ep.id as "epid"
                            FROM persona p
                            JOIN evento_p ep ON p.id = ep.idpersona
                            WHERE ep.id = ${idpersona_e} AND p.disponible = 1 ORDER BY p.nombre`;
      const direccionQuery = `SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, f.firma, d.nombre AS direccion
                              FROM evento_s es
                              JOIN usuario_fd ufd ON ufd.id = es.idusuario_fd
                              JOIN usuario_f uf ON uf.id = ufd.idusuariof
                              JOIN usuario u ON u.id = uf.idusuario
                              JOIN persona p ON p.id = u.idpersona
                              JOIN firmas f ON f.id = uf.idfirma
                              JOIN direccion d ON d.id = ufd.idireccion
                              WHERE es.idevento = (SELECT idevento FROM plantilla WHERE id = (SELECT idplantilla FROM certificado WHERE id = ${id}) AND disponible = 1) and es.disponible = 1`;
      const auspiciadorQuery = `SELECT nombre, logo FROM auspiciadores WHERE id IN (SELECT idauspiciador FROM evento_aus WHERE idevento = (SELECT idevento FROM plantilla WHERE id = (SELECT idplantilla FROM certificado WHERE id = ${id}) AND disponible = 1) AND disponible = 1)`;

      const responseData = {};

      db.query(plantillaQuery, (error, plantillaResults) => {
        if (error) throw error;
        if (plantillaResults.length === 0) {
          res.json({
            mensaje: "No se encontró la plantilla asociada al certificado",
          });
        } else {
          responseData.plantilla = plantillaResults[0];

          db.query(eventoQuery, (error, eventoResults) => {
            if (error) throw error;
            if (eventoResults.length === 0) {
              res.json({
                mensaje: "No se encontró el evento asociado al certificado",
              });
            } else {
              responseData.evento = eventoResults[0];

              db.query(personaQuery, (error, personaResult) => {
                if (error) throw error;
                if (personaResult.length === 0) {
                  res.json({
                    mensaje: "No se encontró la persona asociada al certificado",
                  });
                } else {
                  responseData.persona = personaResult[0];

                  db.query(direccionQuery, (error, direccionResults) => {
                    if (error) throw error;
                    if (direccionResults.length === 0) {
                      res.json({
                        mensaje: "No se encontraron direcciones del evento",
                      });
                    } else {
                      responseData.direccion = direccionResults;

                      db.query(auspiciadorQuery, (error, auspiciadorResults) => {
                        if (error) throw error;
                        if (auspiciadorResults.length === 0) {
                          res.json({
                            mensaje: "No se encontraron auspiciadores del evento",
                          });
                        } else {
                          responseData.auspiciador = auspiciadorResults;

                          // Agregar los resultados de certificadoQuery a la respuesta final
                          responseData.certificado = certificadoResults[0];

                          // Concatenar los resultados en un único objeto de respuesta
                          const finalResponse = {
                            certificado: responseData.certificado,
                            plantilla: responseData.plantilla,
                            evento: responseData.evento,
                            persona: responseData.persona,
                            direccion: responseData.direccion,
                            auspiciador: responseData.auspiciador,
                          };

                          res.json(finalResponse);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

router.put("/put/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const { idplantilla, idusuario_r, idpersona_e, idusuario_fd } = req.body;
  const query = `UPDATE certificado SET idplantilla = ${idplantilla}, idusuario_r = ${idusuario_r}, idpersona_e = ${idpersona_e}, idusuario_fd = ${idusuario_fd} WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro actualizado exitosamente" });
  });
});

router.put("/aprobar/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const query = `UPDATE certificado SET status = 2 WHERE id = '${id}'`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Certificado Aprobado" });
  });
});

router.put("/check/:id", (req, res) => {
  const id = req.params.id;
  const fecha = moment();
  const fechaActual = moment(fecha, 'ddd MMM DD YYYY HH:mm:ss ZZ');
  // Convierte la fecha y hora a la zona horaria de Bolivia (GMT-4)
  const fechan = fechaActual.tz('America/La_Paz').format('YYYY-MM-DD HH:mm:ss');

  const {query, values } = readUpdateCertified(fechan, id)
  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ mensaje: messages.errorquery });
    }    
    SendPushNotificationsCertified(id, 1)    
  });
});

router.put("/qr/:id", async (req, res) => {
  const id = req.params.id;
  const fecha = moment();
  const fechaActual = moment(fecha, 'ddd MMM DD YYYY HH:mm:ss ZZ');
  // Convierte la fecha y hora a la zona horaria de Bolivia (GMT-4)
  const fechan = fechaActual.tz('America/La_Paz').format('YYYY-MM-DD HH:mm:ss');
  const {query, values } = await readUpdateQRCertified(fechan, id)
  const result = await queryDatabase(query, values);
  await SendPushNotificationsCertified(id, 2)  
});

router.put("/download/:id", async (req, res) => {
  const id = req.params.id;
  const fecha = moment();
  const fechaActual = moment(fecha, 'ddd MMM DD YYYY HH:mm:ss ZZ');
  // Convierte la fecha y hora a la zona horaria de Bolivia (GMT-4)
  const fechan = fechaActual.tz('America/La_Paz').format('YYYY-MM-DD HH:mm:ss');
  const {query, values } = await downloadCertified(fechan, id)
  const result = await queryDatabase(query, values);
  await SendPushNotificationsCertified(id, 3)  
});

router.delete("/denied/:id", (req, res) => {
  const id = req.params.id;
  const query = `UPDATE certificado SET disponible = 4 WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Certificado Anulado Exitosamente" });
  });
});

router.delete("/delete/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const query = `DELETE FROM WHERE id = ${id}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ mensaje: "Registro eliminado exitosamente" });
  });
});

module.exports = router;
