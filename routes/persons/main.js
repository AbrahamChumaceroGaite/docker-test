const express = require("express");
const router = express.Router();
const { queryDatabase } = require('../shared/querys')
const { SendPushNotificacionsGroups } = require('../../services/notifications/main')
const { getPaginatedPersons,
  getTotalPersonsRecords,
  getPerson,
  getPersonById,
  getPersonByEvent,
  checkDuplicatePerson,
  checkDuplicatePersonEvent,
  checkDuplicatePersonUpdate,
  deletePerson,
  insertPerson,
  insertPersonEvent,
  formatName,
  cleanName } = require('./querys');
const messages = require('../../templates/messages')
require("moment-timezone");


router.post("/post", async (req, res) => {
  const { nombre, apellido, correo, ci, numero, autor } = req.body;
  console.log(req.body)
  let ciLimpiado = await cleanName(ci);

  ciLimpiado = ciLimpiado.toString().replace(/\D/g, '0');
  const { queryDuplicate, valuesDuplicate } = checkDuplicatePerson(ciLimpiado);

  try {
    const duplicateResults = await queryDatabase(queryDuplicate, valuesDuplicate);

    if (duplicateResults.length > 0) {
      const duplicados = duplicateResults.map((resultado) => {
        if (resultado.ci === ciLimpiado) return "ciLimpiado";
      });

      const mensajeError = messages.duplicateValue + `${duplicados.join(", ")}`;
      return res.json({ mensaje: mensajeError });
    }

    // No hay duplicados, realizar la inserción
    const { queryInsert, valuesInsert } = insertPerson(nombre, apellido, correo, numero, ciLimpiado, autor);
    await queryDatabase(queryInsert, valuesInsert);

    res.json({ mensaje: messages.postsuccess });
  } catch (error) {
    console.error('Error al procesar la solicitud', error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.post("/check", async (req, res) => {
  const { ci } = req.body;

  // Verificar si existen duplicados
  const { queryDuplicate, valuesDuplicate } = checkDuplicatePerson(ci);
  try {
    const duplicateResults = await queryDatabase(queryDuplicate, valuesDuplicate);

    if (duplicateResults.length > 0) {
      const duplicados = duplicateResults.map((resultado) => {
        if (resultado.ci === ci) return resultado.ci;
      });

      const mensajeError = messages.duplicateValue + `${duplicados.join(", ")}`;
      return res.status(400).json({ error: mensajeError });
    }

    res.json({ mensaje: messages.duplicateValueOK });
  } catch (error) {
    console.error('Error al procesar la solicitud', error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.post("/post/massive", async (req, res) => {
  const personas = Array.isArray(req.body.body) ? req.body.body : [req.body.body];
  const idevento = req.body.idevento;
  const autor = req.body.autor;
  const duplicadosPersona = [];
  const duplicadosEvento = [];
  const errores = [];
  let totaliteraciones = 0;

  try {
    for (const persona of personas) {
      try {
        const nombreFormateado = await formatName(cleanName(persona.nombre));
        const apellidoFormateado = await formatName(cleanName(persona.apellido));
        let ciLimpiado = await cleanName(persona.ci);

        ciLimpiado = ciLimpiado.toString().replace(/\D/g, '0');

        if (
          persona.nombre === "Nombre" &&
          persona.apellido === "Apellido" &&
          persona.correo === "Correo" &&
          persona.numero === "Numero" &&
          (ciLimpiado === "Ci" || ciLimpiado === "0" || ciLimpiado === "")
        ) {
          continue; // Saltar al siguiente objeto persona
        }

        // Validar campos y detectar errores
        if (
          typeof persona.nombre === "undefined" ||
          typeof persona.apellido === "undefined" ||
          typeof persona.correo === "undefined" ||
          typeof persona.numero === "undefined" ||
          typeof persona.ci === "undefined" ||
          persona.nombre.length > 255 ||
          persona.apellido.length > 255 ||
          persona.correo.length > 255 ||
          persona.numero.toString().length > 15 ||
          ciLimpiado.toString().length > 15 ||
          ciLimpiado === "0" ||
          ciLimpiado === ""
        ) {
          const errorMotivo = "El campo excede el límite o es inválido";
          if (ciLimpiado === "0" || ciLimpiado === "") {
            const ciError = "No se admite '0' ni valores vacíos como CI";
            errorMotivo = `${errorMotivo}. ${ciError}`;
          }
          const datosRechazados = {
            nombre: persona.nombre,
            apellido: persona.apellido,
            correo: persona.correo,
            numero: persona.numero,
            ci: ciLimpiado,
            motivo: errorMotivo,
          };
          errores.push(datosRechazados);
          continue; // Saltar al siguiente objeto persona
        }

        console.log("PASO 2 - Revisando Duplicados");
        const { queryDuplicate, valuesDuplicate } = await checkDuplicatePerson(ciLimpiado);
        const resultado = await queryDatabase(queryDuplicate, valuesDuplicate);
        let idPersona;

        if (resultado.length > 0) {
          idPersona = resultado[0].id;
          const mensajeDuplicado = "Esta persona ya está en el sistema, se procedió a registrarla en el evento";
          const datosDuplicados = {
            nombre: persona.nombre,
            apellido: persona.apellido,
            correo: persona.correo,
            numero: persona.numero,
            ci: ciLimpiado,
            motivo: mensajeDuplicado,
          };
          errores.push(datosDuplicados);
        } else {
          console.log("PASO 3 - Insertando Persona Si Esta No Existe");
          // Persona no duplicada, insertarla en la tabla persona
          const { queryInsert, valuesInsert } = await insertPerson(nombreFormateado, apellidoFormateado, persona.correo, persona.numero, ciLimpiado, autor);

          try {
            const result = await queryDatabase(queryInsert, valuesInsert);
            idPersona = result.insertId;
          } catch (insertError) {
            // Registrar el error en el array de errores
            const datosRechazados = {
              nombre: persona.nombre,
              apellido: persona.apellido,
              correo: persona.correo,
              numero: persona.numero,
              ci: ciLimpiado,
              motivo: insertError.message, // Agregar el mensaje de error
            };
            errores.push(datosRechazados);
            // Continuar con el siguiente objeto persona
            continue;
          }
        }

        try {
          // Aquí ya tenemos el id de la persona, por lo que podemos continuar con el paso 4
          console.log("PASO 4 - REVISANDO DUPLICADOS EN EVENTO");
          const { selectQuery, values } = await checkDuplicatePersonEvent(idPersona, idevento);
          const duplicadosEventoActual = await queryDatabase(selectQuery, values);
          if (duplicadosEventoActual.length === 0) {
            // Insertar registro en la tabla evento_p
            console.log("PASO 5 - Insertando Persona en Evento");
            const { insertQuery, valuesQuery } = await insertPersonEvent(idPersona, idevento, autor);
            const insertfinal = await queryDatabase(insertQuery, valuesQuery);
            totaliteraciones++;
          } else {
            const mensajeDuplicadoEvento = "Esta persona ya está registrada en el evento";
            const datosDuplicadosEvento = {
              nombre: persona.nombre,
              apellido: persona.apellido,
              correo: persona.correo,
              numero: persona.numero,
              ci: ciLimpiado,
              motivo: mensajeDuplicadoEvento,
            };
            errores.push(datosDuplicadosEvento);
          }
        } catch (error) {
          // Registrar el error en el array de errores
          const datosRechazados = {
            nombre: persona.nombre,
            apellido: persona.apellido,
            correo: persona.correo,
            numero: persona.numero,
            ci: ciLimpiado,
            motivo: error.message,
          };
          errores.push(datosRechazados);
        }
      } catch (error) {
        // Registrar el error en el array de errores
        const datosRechazados = {
          nombre: persona.nombre,
          apellido: persona.apellido,
          correo: persona.correo,
          numero: persona.numero,
          ci: persona.ci,
          motivo: error.message,
        };
        errores.push(datosRechazados);
      }
    }

    if (totaliteraciones > 0) {
      SendPushNotificacionsGroups(idevento, 2, totaliteraciones);
    }
    console.log("Errores: ", errores)
    res.json({
      mensaje: messages.postsuccess,
      duplicadosPersona,
      duplicadosEvento,
      errores,
    });
  } catch (error) {
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/get", async (req, res) => {
  try {
    const query = getPerson();
    const results = await queryDatabase(query);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/getLazy", async (req, res) => {
  const { id, globalFilter, sortField, sortOrder, first, rows } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);
  try {
    // Obtener la consulta paginada de personas
    const query = await getPaginatedPersons(id, globalFilter, sortField, sortOrder, startIndex, numRows)

    // Obtener la consulta para contar el total de registros
    const countQuery = await getTotalPersonsRecords(id);

    // Obtener el total de registros
    const countResult = await queryDatabase(countQuery);

    if (!countResult || countResult.length === 0) {
      return res.status(500).json({ mensaje: messages.emptytable });
    }

    const totalRecords = countResult[0].totalRecords; // Obtenemos el total de registros

    // Obtener los registros paginados
    const results = await queryDatabase(query);

    res.json({ items: results, totalRecords: totalRecords });
  } catch (error) {
    // Manejar errores aquí
    console.log(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/getById/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { query, values } = getPersonById(id);
    const results = await queryDatabase(query, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.get("/get/ByEvent/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { query, values } = getPersonByEvent(id);
    const results = await queryDatabase(query, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.put("/put/:id", async (req, res) => {
  const id = req.params.id;
  const { nombre, apellido, ci, correo, numero, autor } = req.body;
  const updateFields = [];

  if (nombre) updateFields.push(`nombre = '${nombre}'`);
  if (apellido) updateFields.push(`apellido = '${apellido}'`);
  if (correo) updateFields.push(`correo = '${correo}'`);
  if (numero || numero === 0) updateFields.push(`numero = ${numero}`);
  if (ci || ci === 0) { updateFields.push(`ci = ${ci}`) }
  if (autor) updateFields.push(`idautor = '${autor}'`);

  if (updateFields.length === 0) {
    return res.json({ mensaje: "Nada que actualizar" });
  }

  try {
    const { queryDuplicate, valuesDuplicate } = await checkDuplicatePersonUpdate(id, ci);
    const duplicateResults = await queryDatabase(queryDuplicate, valuesDuplicate);

    if (duplicateResults.length > 0) {
      return res.status(400).json({ mensaje: "Ya existe un registro con el mismo CI" });
    }

    const updateQuery = `UPDATE persona SET ${updateFields.join(", ")}, fecha_a = NOW() WHERE id = ${id}`;
    const updateResults = await queryDatabase(updateQuery);

    if (updateResults.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Registro no encontrado" });
    }

    res.json({ mensaje: messages.putsuccess });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: messages.errorquery });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const id = req.params.id;
  const { query, values } = deletePerson(id);
  try {
    const result = await queryDatabase(query, values);
    res.json({ mensaje: messages.deletesuccess });
  } catch (error) {
    console.error('Error al procesar la solicitud', error);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});


module.exports = router;