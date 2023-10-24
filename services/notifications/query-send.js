const { queryDatabase } = require('../../routes/shared/querys')
const { pushNotifications } = require('./push')
const { insertUserToNotify, insertUserGroupReport, insertUserEventReport, getGroupMembers } = require('./querys')

async function insertGroupReport(idgrupo, mensaje, payload) {
    try {
        // PASO 4 - INSERTAR EL MENSAJE PARA EL GRUPO      
        const { queryReport, valuesReport } = await insertUserGroupReport(idgrupo, mensaje)
        const insertResult = await queryDatabase(queryReport, valuesReport);
        let idmsj = insertResult.insertId;
        // PASO 5 - OBTENER LOS MIEMBROS DEL GRUPO
        const { querymember, valuesmember } = getGroupMembers(idgrupo);
        const members = await queryDatabase(querymember, valuesmember);
        // Iterar sobre los miembros y realizar inserciones de usuarios a notificar
        for (const userToNotify of members) {
            const { queryInsert, valuesInsert } = await insertUserToNotify(idmsj, userToNotify.idug);
            await queryDatabase(queryInsert, valuesInsert);
            // PASO 6 - ENVIAR NOTIFICACIONES
            await pushNotifications(userToNotify.idusuario, payload);
        }

        console.log("¡Todo se ha insertado correctamente!");
    } catch (error) {
        console.error("Error al insertar en la base de datos:", error);
    }
}

async function insertEventReport(idevento, motivo, mensaje, idautor, payload) {
    try {
        const { queryReport, valuesReport } = insertUserEventReport(idevento, motivo, mensaje)
        // Insertar el reporte del evento en la base de datos
        await queryDatabase(queryReport, valuesReport);
        await pushNotifications(idautor, payload); 
    } catch (error) {
        console.error(error);
        // Puedes manejar el error aquí, enviar una respuesta de error o lanzar una excepción si es necesario.
        throw error;
    }
}
module.exports = { insertGroupReport, insertEventReport };