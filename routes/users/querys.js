const db = require('../../services/db');
const { isAdminOrOwner } = require('../../utils/isAllow');

// Función para obtener la consulta principal con LIMIT
function getPaginatedUsers(id, globalFilter, sortField, sortOrder, first, rows) {
    return new Promise((resolve, reject) => {

        const isAllowQuery = isAdminOrOwner(id);
        let queryAux = '';

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `
                SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, u.*, COALESCE(f.firma, 'Sin Firma') AS firma, COALESCE(d.nombre, 'Sin Cargo') AS direccion, COALESCE(r.rol, 'Sin Rol') AS rol
                FROM usuario u
                LEFT JOIN persona p ON u.idpersona = p.id
                LEFT JOIN usuario_f uf ON u.id = uf.idusuario
                LEFT JOIN firmas f ON uf.idfirma = f.id
                LEFT JOIN usuario_fd fd ON uf.id = fd.idusuariof
                LEFT JOIN direccion d ON fd.idireccion = d.id
                LEFT JOIN usuario_r ur ON ur.idusuario = u.id
                LEFT JOIN rol r ON ur.idrol = r.id
                WHERE u.disponible = 1`;
            } else {
                queryAux = `
                SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS nombre, u.*, COALESCE(f.firma, 'Sin Firma') AS firma, COALESCE(d.nombre, 'Sin Cargo') AS direccion, COALESCE(r.rol, 'Sin Rol') AS rol
                FROM usuario u
                LEFT JOIN persona p ON u.idpersona = p.id
                LEFT JOIN usuario_f uf ON u.id = uf.idusuario
                LEFT JOIN firmas f ON uf.idfirma = f.id
                LEFT JOIN usuario_fd fd ON uf.id = fd.idusuariof
                LEFT JOIN direccion d ON fd.idireccion = d.id
                LEFT JOIN usuario_r ur ON ur.idusuario = u.id
                LEFT JOIN rol r ON ur.idrol = r.id
                WHERE u.disponible = 1 AND u.idautor = ${id}`;
            }

            let query = queryAux;
            // Aplica el filtro global si se proporciona
            if (globalFilter) {
                const filter = db.escape(`%${globalFilter}%`);
                query += ` AND p.nombre LIKE ${filter} `;
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

// Función para obtener la consulta de contar el número total de registros (sin LIMIT)
function getTotalUsersRecords(id) {
    return new Promise((resolve, reject) => {
        const isAllowQuery = isAdminOrOwner(id);
        let queryAux = '';

        db.query(isAllowQuery, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result.length > 0) {
                queryAux = `SELECT COUNT(*) as totalRecords  FROM usuario u
                LEFT JOIN persona p ON u.idpersona = p.id
                LEFT JOIN usuario_f uf ON u.id = uf.idusuario
                LEFT JOIN firmas f ON uf.idfirma = f.id
                LEFT JOIN usuario_fd fd ON uf.id = fd.idusuariof
                LEFT JOIN direccion d ON fd.idireccion = d.id
                LEFT JOIN usuario_r ur ON ur.idusuario = u.id
                LEFT JOIN rol r ON ur.idrol = r.id
                WHERE u.disponible = 1`;
            } else {
                queryAux = `SELECT COUNT(*) as totalRecords FROM usuario u
                LEFT JOIN persona p ON u.idpersona = p.id
                LEFT JOIN usuario_f uf ON u.id = uf.idusuario
                LEFT JOIN firmas f ON uf.idfirma = f.id
                LEFT JOIN usuario_fd fd ON uf.id = fd.idusuariof
                LEFT JOIN direccion d ON fd.idireccion = d.id
                LEFT JOIN usuario_r ur ON ur.idusuario = u.id
                LEFT JOIN rol r ON ur.idrol = r.id
                WHERE u.disponible = 1 AND u.idautor = ${id}`;
            }

            resolve(queryAux);
        });

    });
}

module.exports = {
    getPaginatedUsers,
    getTotalUsersRecords,
};
