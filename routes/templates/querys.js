// Función para obtener eventos paginados
function getPaginatedTemplates(id, globalFilter) {
    let query = `SELECT p.id, p.nombre, p.logo, p.fecha_c, e.id as idevento, e.nombre as "evento", e.cerrado as "cerrado" 
    FROM plantilla p 
    JOIN evento e ON p.idevento = e.id WHERE e.disponible=1 
    AND p.disponible = 1 
    AND e.idgrupo = ${id}`;
    // Aplica el filtro global si se proporciona
    if (globalFilter) {
        query += ` AND (e.nombre LIKE '%${globalFilter}%')`;
    }

    return query;
}

// Función para contar el número total de registros
function getTotalTemplatesRecords(id) {
    return `SELECT COUNT(*) as totalRecords FROM plantilla p JOIN evento e ON p.idevento = e.id WHERE e.disponible=1 AND p.disponible = 1 AND e.idgrupo = ${id}`;
}

function insertTemplateQuery(idevento, nombre, config, imagen, autor) {
    const query = `INSERT INTO plantilla (idevento, nombre, config, logo, idautor) VALUES (?, ?, ?, ?, ?)`;
    const values = [idevento, nombre, config, imagen || "", autor];

    return { query, values };   
}

module.exports = {
    getPaginatedTemplates,
    getTotalTemplatesRecords,
    insertTemplateQuery
};
