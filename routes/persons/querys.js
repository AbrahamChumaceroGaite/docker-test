const { isAdminOrOwner } = require('../../utils/isAllow');
const db = require('../../services/db');
const { promisify } = require('util');

// funcion para obtener personas
function getPerson() {
    const query = `SELECT id, CONCAT_WS(' ', nombre, apellido) AS nombre FROM persona WHERE disponible = 1 ORDER BY nombre`
    return query
}

// Función para obtener una persona por id
function getPersonById(id) {
    const query = `SELECT * FROM persona WHERE id = ? AND disponible = 1`
    const values = [id]
    return { query, values }
}

// Función para obtener personas paginadas
function getPaginatedPersons(id, globalFilter, sortField, sortOrder, first, rows) {
    return new Promise((resolve, reject) => {
        const isAllowQuery = isAdminOrOwner(id);
        let queryAux = '';

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `SELECT * FROM persona WHERE disponible = 1`;
            } else {
                queryAux = `SELECT * FROM persona WHERE disponible = 1 AND idautor = ${id}`;
            }

            let query = queryAux;
            // Aplica el filtro global si se proporciona
            if (globalFilter) {
                const filter = db.escape(`%${globalFilter}%`);
                query += ` AND (nombre LIKE ${filter} OR apellido LIKE ${filter} OR correo LIKE ${filter} OR numero LIKE ${filter} OR ci LIKE ${filter})`;
              }
            

            // Aplica el ordenamiento (sort) si se proporciona
            if (sortField && sortOrder) {
                query += ` ORDER BY ${sortField} ${sortOrder === '1' ? 'ASC' : 'DESC'}`;
            }

            // Aplica LIMIT para la paginación
            if (first && rows) {
                const startIndex = parseInt(first);
                const numRows = parseInt(rows);
                query += ` LIMIT ${startIndex}, ${numRows}`;
            }

            resolve(query);
        });
    });
}

// Función para obtener personas por evento
function getPersonByEvent(id) {
    const query = `SELECT p.id, p.nombre, p.correo, p.numero, p.ci
    FROM persona p
    JOIN evento_p ep ON p.id = ep.idpersona
    JOIN evento e ON e.id = ep.idevento
    WHERE e.id = ${id} AND p.disponible = 1`;
    const values = [id]

    return { query, values }
}

// Función para contar el número total de registros
function getTotalPersonsRecords(id) {
    return new Promise((resolve, reject) => {
        const isAllowQuery = isAdminOrOwner(id);
        let queryAux = '';

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `SELECT COUNT(*) as totalRecords FROM persona WHERE disponible = 1`;
            } else {
                queryAux = `SELECT COUNT(*) as totalRecords FROM persona WHERE disponible = 1 AND idautor = ${id}`;
            }

            resolve(queryAux);
        });
    });
}

//Funcion para revisar duplicados de ci
function checkDuplicatePerson(ci) {
    let queryDuplicate = '';
    if (ci === 0) {
        // Si el ci es 0, se permitirá como repetido
        queryDuplicate = `SELECT * FROM persona WHERE (ci = ? OR ci = 0) AND disponible = 1`;
    } else {
        queryDuplicate = `SELECT * FROM persona WHERE ci = ? AND disponible = 1`;
    }
    valuesDuplicate = [ci];

    return { queryDuplicate, valuesDuplicate }
}

//Funcion para revisar duplicados de ci en update
function checkDuplicatePersonUpdate(id, ci) {
    let queryDuplicate = '';
    const valuesDuplicate = [ci];

    if (ci === 0) {
        // Si el ci es 0, se permitirá como repetido
        queryDuplicate = `SELECT * FROM persona WHERE (ci = ? OR ci = 0) AND disponible = 1`;
    } else {
        // Excluye el registro actual del usuario por ID
        queryDuplicate = `SELECT * FROM persona WHERE ci = ? AND disponible = 1 AND id != ?`;
        valuesDuplicate.push(id); // Agrega el ID del usuario actual
    }

    return { queryDuplicate, valuesDuplicate };
}

// Función para insertar una persona
function insertPerson(nombre, apellido, correo, numero, ci, autor, callback) {
    const queryInsert = `INSERT INTO persona (nombre, apellido, correo, numero, ci, idautor) VALUES (?, ?, ?, ?, ?, ?)`;
    const valuesInsert = [nombre, apellido, correo, numero, ci, autor];

    return { queryInsert, valuesInsert }
}

// Función para formatear el nombre
function formatName(nombre) {
    return nombre
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, function (a) {
            return a.toUpperCase();
        });
}

// Función para limpiar el nombre
function cleanName(texto) {
    if (typeof texto === "string") {
        return texto.trim();
    } else {
        return texto;
    }
}

// Funcion insertar a la persona al evento
function insertPersonEvent(idPersona, idevento, autor, callback) {
    const insertQuery = `INSERT INTO evento_p (idpersona, idevento,  idautor) VALUES (?, ?, ?);`;

    const valuesQuery = [idPersona, idevento, autor];

    return { insertQuery, valuesQuery}
}

// Funcion para revisar duplicados de persona en evento
function checkDuplicatePersonEvent(idPersona, idevento) {
    const selectQuery = `SELECT * FROM evento_p WHERE idpersona = ? AND idevento = ? AND disponible = 1;`;
    const values = [idPersona, idevento];
    return { selectQuery, values}
}

function deletePerson(id){
    const query = `UPDATE persona SET disponible = 0 WHERE id = ? AND disponible = 1`;
    const values = [id]
    return { query, values}
}

module.exports = {
    checkDuplicatePerson,
    checkDuplicatePersonEvent,
    checkDuplicatePersonUpdate,
    insertPerson,
    insertPersonEvent,
    deletePerson,
    formatName,
    cleanName,
    getPerson,
    getPaginatedPersons,
    getPersonById,
    getPersonByEvent,
    getTotalPersonsRecords,
};
