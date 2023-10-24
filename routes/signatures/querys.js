const db = require('../../services/db')
const {  queryDatabase } = require('../shared/querys')

const { isAdminOrOwner } = require('../../utils/isAllow')

// Función para obtener firmas paginados
function getPaginatedSignatures(id, globalFilter, sortField, sortOrder, first, rows) {
    return new Promise((resolve, reject) => {
        const isAllowQuery = isAdminOrOwner(id);
        let queryAux = '';

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `SELECT * FROM firmas WHERE disponible = 1`;
            } else {
                queryAux = `SELECT * FROM firmas WHERE disponible = 1 AND idautor = ${id}`;
            }

            let query = queryAux;
            // Aplica el filtro global si se proporciona
            if (globalFilter) {
                const filter = db.escape(`%${globalFilter}%`);
                query += ` AND (nombre LIKE ${filter})`;
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

// Función para contar el número total de registros
function getTotalSignatureRecords(id) {
    return new Promise((resolve, reject) => {
        const isAllowQuery = isAdminOrOwner(id);
        let queryAux;

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `SELECT COUNT(*) as totalRecords FROM firmas WHERE disponible = 1`;
            } else {
                queryAux = `SELECT COUNT(*) as totalRecords FROM firmas WHERE disponible = 1 AND idautor = ${id}`;
            }

            resolve(queryAux);
        });
    });
}

async function checkDuplicateFirmaHash(hash, currentFirmaId) {
    if (!hash) {
      return false;
    }
  
    const query = "SELECT COUNT(*) AS count FROM firmas WHERE firma_hash = ? AND id <> ? AND disponible = 1";
    const result = await queryDatabase(query, [hash, currentFirmaId]);
    return result[0].count > 0;
  }
  

module.exports = {
    checkDuplicateFirmaHash,
    getPaginatedSignatures,
    getTotalSignatureRecords,
};