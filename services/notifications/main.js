const { opencertified, qrcertified, newSponsorEvent, downloadcertified, closeEvent , newSignatureEvent, newPersonEvent, newtemplate } = require('../../templates/payloads-for-admins')
const { newUserGroup, newListEventGroup, newEvent } = require('../../templates/payloads-for-groups')
const { pushNotifications } = require('./push')
const { getCertifiedData, getEventGroupDataById, getSponsorEventData, getSignatureEventData, getNewUserGroupData, getPersonData } = require('./querys')
const { queryDatabase } = require('../../routes/shared/querys')
const { insertGroupReport, insertEventReport } = require('./query-send')
const messages = require('../../templates/messages')
const db = require('../db')

//NOTIFICACIONES PARA ADMINISTRADORES

async function SendPushNotificationsCertified(id, motivo) {
    try {
        const { query, values } = getCertifiedData(id);
        const results = await queryDatabase(query, values);

        if (results.length === 0) {
            return res.status(500).json({ mensaje: messages.emptytable });
        }

        for (const item of results) {
            let payload = '';
            switch (motivo) {
                case 1:
                    payload = await opencertified(item.event, item.persona);
                    await insertEventReport(item.idevento, 'VIEW', payload.notification.body, item.id, payload)
                    break;
                case 2:
                    payload = await qrcertified(item.event, item.persona);
                    await insertEventReport(item.idevento, 'SCAN', payload.notification.body, item.id, payload)
                    break;
                case 3:
                    payload = await downloadcertified(item.event, item.persona);
                    await insertEventReport(item.idevento, 'DOWNLOAD', payload.notification.body, item.id, payload)
                    break;
                default:
                    continue;
            }

            await pushNotifications(item.id, payload);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: messages.errorquery });
    }
}


async function SendPushNotificationsEvent(id, motivo) {
    let payload = '';
    switch (motivo) {
        // En caso de que se haya agregado un nuevo auspiciante
        case 1:
            const { querysponsor, valuesponsor } = getSponsorEventData(id);
            try {
                const results = await queryDatabase(querysponsor, valuesponsor);
                //AQUI ENVIO LA NOTIFICACION A TODOS LOS ENDPOINTS QUE DISPONE EL AUTOR DEL EVENTO
                results.map((item) => {
                    payload = newSponsorEvent(item.sponsor, item.evento, item.persona)
                    insertEventReport(item.idevento, 'INSERT', payload.notification.body, item.id, payload)
                })
            } catch (error) {
                console.error('Error al consultar la base de datos', error);
            }
            return;

        // En caso de que se haya agregado un nuevo firmante
        case 2:
            const { querysignature, valuesignature } = getSignatureEventData(id);
            try {
                const results = await queryDatabase(querysignature, valuesignature);
                //AQUI ENVIO LA NOTIFICACION A TODOS LOS ENDPOINTS QUE DISPONE EL AUTOR DEL EVENTO
                results.map((item) => {
                    payload = newSignatureEvent(item.signature, item.evento, item.persona);
                    insertEventReport(item.idevento, 'INSERT', payload.notification.body, item.id, payload);
                })
            } catch (error) {
                console.error('Error al consultar la base de datos', error);
            }
            return;

        // En caso de que se haya agregado un nuevo evento
        case 3:
            try {
                //Obtener los datos del event
                const { query, values } = getEventGroupDataById(id);
                const results = await queryDatabase(query, values);
                results.map(async (item) => {
                    payload = newEvent(item.grupo, item.evento);
                    await insertGroupReport(item.idgrupo, payload.notification.body, payload);
                    await insertEventReport(item.idevento, 'INSERT', payload.notification.body, item.idautor, payload);
                })
            } catch (error) {
                console.error(error);
                return;
            }
            return;

        // En caso de que se haya agregado una nueva plantilla
        case 4:
            try {
                //Obtener los datos del event
                const { query, values } = getEventGroupDataById(id);
                const results = await queryDatabase(query, values);
                results.map(async (item) => {
                    payload = newtemplate(item.grupo, item.evento);
                    await insertEventReport(item.idevento, 'INSERT', payload.notification.body, item.idautor, payload);
                })
            } catch (error) {
                console.error(error);
                return;
            }
            return;

        // En caso que el evento es cerrado
        case 5:
            try {
                //Obtener los datos del event
                const { query, values } = getEventGroupDataById(id);
                const results = await queryDatabase(query, values);
                results.map(async (item) => {
                    payload = await closeEvent(item.evento);
                    await insertEventReport(item.idevento, 'CLOSE', payload.notification.body, item.idautor, payload);
                    await insertGroupReport(item.idgrupo, payload.notification.body, payload);
                })
            } catch (error) {
                console.error(error);
                return;
            }
            return;
        case null:
            return null;
    }
}

//NOTIFICACIONES PARA USUARIOS-GRUPOS

async function SendPushNotificacionsGroups(id, motivo, extra) {
    let payload = '';
    //PASO 2 VER EL CASO QUE LE TOCO A ESTE PARA NOTIFICAR A LOS DEMAS
    switch (motivo) {
        // En caso de que se haya agregado un nuevo usuario al grupo
        case 1:
            try {
                const { queryuser, valuesuser } = getNewUserGroupData(extra);
                const users = await queryDatabase(queryuser, valuesuser);
                for (const item of users) {
                    //AQUI CARGAMOS EL PAYLOAD
                    payload = newUserGroup(item.grupo, item.persona);
                    //PASO 3 - LUEGO DE NOTIFICAR A LOS DEMAS, SE INSERTA EL REPORTE
                    await insertGroupReport(id, payload.notification.body, payload);
                }
            } catch (error) {
                console.error(error);
                return;
            }
            return;
        // En caso de que haya cargado un nuevo archivo de participantes
        case 2:
            try {
                //Obtener los datos del event
                const { query, values } = getEventGroupDataById(id);
                const results = await queryDatabase(query, values);
                results.map(async (item) => {
                    payload = newListEventGroup(item.grupo, item.evento, extra);
                    await insertGroupReport(item.idgrupo, payload.notification.body, payload);
                    await insertEventReport(item.idevento, 'INSERT', payload.notification.body, item.idautor, payload);
                })
            } catch (error) {
                console.error(error);
                return;
            }
            return;

        // En caso de que se agregue una nueva persona al evento
        case 3:
            try {
                //Obtener los datos del event
                const { query, values } = getEventGroupDataById(id);
                const results = await queryDatabase(query, values);
                const { queryPerson, valuesPerson } = getPersonData(extra);
                const results2 = await queryDatabase(queryPerson, valuesPerson);
                persona = results2[0].nombreCompleto;
                results.map(async (item) => {
                    payload = newPersonEvent(item.grupo, item.evento, persona);
                    await insertGroupReport(item.idgrupo, payload.notification.body, payload);
                    await insertEventReport(item.idevento, 'INSERT', payload.notification.body, item.idautor, payload);
                })
            } catch (error) {
                console.error(error);
                return;
            }
            return;
        case null:
            return null;
    }
}


module.exports = {
    SendPushNotificationsCertified,
    SendPushNotificationsEvent,
    SendPushNotificacionsGroups
}