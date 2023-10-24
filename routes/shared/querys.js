const db = require("../../services/db");

const { isAdminOrOwner } = require("../../utils/isAllow");

async function getControlledGroups(iduser) {
  try {
    const isAllowQuery = isAdminOrOwner(iduser);
    let queryAux = "";

    const isAdminOrOwnerResult = await queryDatabase(isAllowQuery);

    if (isAdminOrOwnerResult.length > 0) {
      queryAux = `SELECT g.id, g.nombre, r.id as idautor, CONCAT_WS(' ', p.nombre, p.apellido) AS autor FROM grupos g
                JOIN usuario_r r ON g.idautor = r.id
                JOIN usuario u ON r.idusuario = u.id
                JOIN persona p ON u.idpersona = p.id
                WHERE g.disponible = 1 
                AND g.idautor = r.id ORDER BY g.nombre`;
    } else {
      queryAux = `SELECT g.id, g.nombre, g.idautor FROM grupos g
      JOIN usuario_rg rg ON g.id = rg.idgrupo
      WHERE rg.idusuario_r = ${iduser} AND g.disponible = 1
      
      UNION
      
      SELECT g.id, g.nombre, g.idautor FROM grupos g
      WHERE g.idautor = ${iduser} AND g.disponible = 1
      ORDER BY nombre;
      `;
    }

    const query = queryAux;
    return query;
  } catch (error) {
    console.error("Error al obtener grupos controlados:", error);
    throw error;
  }
}

function getControlledEvents(iduser, idgroup) {
  return new Promise((resolve, reject) => {
    const isAllowQuery = isAdminOrOwner(iduser);
    let queryAux = "";

    db.query(isAllowQuery, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      if (result.length > 0) {
        queryAux = `SELECT e.id, e.nombre, e.idgrupo FROM evento e
                WHERE e.idgrupo =  ${idgroup}`;
      } else {
        queryAux = `SELECT e.id, e.nombre, e.idgrupo FROM evento e
                WHERE e.idgrupo =  ${idgroup}`;
      }

      let query = queryAux;
      resolve(query);
    });
  });
}

// Función genérica para consultar la base de datos y devolver una promesa
function queryDatabase(query, values) {
  return new Promise((resolve, reject) => {
    db.query(query, values, (err, res) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}


module.exports = {
  getControlledGroups,
  getControlledEvents,
  queryDatabase,
};
