// Función para obtener eventos paginados
function getPaginatedEvents(id, startIndex, numRows, globalFilter, sortField, sortOrder) {
    let query = `SELECT e.* FROM evento e WHERE e.disponible = 1 AND e.idgrupo = ${id}`;

    if (globalFilter) {
        query += ` AND (e.nombre LIKE '%${globalFilter}%')`;
    }

    if (sortField && sortOrder) {
        query += ` ORDER BY ${sortField} ${sortOrder === '1' ? 'ASC' : 'DESC'}`;
    }

    query += ` LIMIT ${startIndex}, ${numRows}`;

    return query;
}

function getByGroupEvents(id) {
    const queryGroup =`SELECT e.* FROM evento e WHERE e.disponible = 1 AND e.idgrupo = ${id}`;
    const valuesGroup = [id];

    return {queryGroup, valuesGroup}
}
// Función para contar el número total de registros
function getTotalEventRecords(id) {
    return `SELECT COUNT(*) as totalRecords FROM evento WHERE disponible = 1 AND idgrupo = ${id}`;
}

module.exports = {
    getPaginatedEvents,
    getTotalEventRecords,
    getByGroupEvents
};
