const db = require('../../services/db');
const { queryDatabase } = require('../shared/querys')
const { isAdminOrOwner } = require('../../utils/isAllow');

// Función para obtener auspiciadores paginados
function getPaginatedSponsors(id, globalFilter, sortField, sortOrder, first, rows) {
    return new Promise((resolve, reject) => {
        const isAllowQuery = isAdminOrOwner(id);
        let queryAux = '';

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `SELECT * FROM auspiciadores WHERE disponible = 1`;
            } else {
                queryAux = `SELECT * FROM auspiciadores WHERE disponible = 1 AND idautor = ${id}`;
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
function getTotalSponsorRecords(id) {
    return new Promise((resolve, reject) => {
        const isAllowQuery = isAdminOrOwner(id);
        let queryAux = '';

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `SELECT COUNT(*) as totalRecords FROM auspiciadores WHERE disponible = 1`;
            } else {
                queryAux = `SELECT COUNT(*) as totalRecords FROM auspiciadores WHERE disponible = 1 AND idautor = ${id}`;
            }
            resolve(queryAux);
        });
    });
}


async function checkDuplicateLogoHash(hash, currentFirmaId) {
    if (!hash) {
      return false;
    }
  
    const query = "SELECT COUNT(*) AS count FROM auspiciadores WHERE logo_hash = ? AND id <> ?";
    const result = await queryDatabase(query, [hash, currentFirmaId]);
    return result[0].count > 0;
  }

module.exports = {
    checkDuplicateLogoHash,
    getPaginatedSponsors,
    getTotalSponsorRecords,
};
