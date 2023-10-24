const key = require('../../templates/keys')
const webpush = require('web-push');
const { getAutorPushData, getNewAutorPushData } = require('./querys')
const { queryDatabase } = require('../../routes/shared/querys')
const { welcome } = require('../../templates/payloads-for-groups')
const db = require('../db')
const messages = require('../../templates/messages')
let VapidKeys = {
    subject: 'mailto:tu@email.com',
    privateKey: key.PrivateKey,
    publicKey: key.PublicKey
};

//Precarga para enviar las notificaciones
async function pushNotifications(id, payload) {
    try {
        const { query, values } = getAutorPushData(id);
        const result = await queryDatabase(query, values);

        for (const userSubscriptions of result) {
            await sendNotifications(userSubscriptions, payload);
        }

    } catch (error) {
        console.error('Error al consultar la base de datos', error);
        return res.status(500).json({ mensaje: messages.emptypushdata });
    }
}

// Función genérica para enviar notificaciones
async function sendNotifications(subscriptions, payload) {
    console.log("Antes de enviar: ", subscriptions)
    const subscription = {
        endpoint: subscriptions.endpoint,
        keys: {
            auth: subscriptions.auth,
            p256dh: subscriptions.p256dh
        }
    };
    try {
        await webpush.sendNotification(
            subscription,
            JSON.stringify(payload),
            {
                vapidDetails: VapidKeys,
                TTL: 30
            }
        );
    } catch (error) {
        console.error('Error al enviar notificación', error);
    }

}

// Mensaje de bienvenida
async function welcomeUser(id) {
    const { queryPush, valuesPush } = await getNewAutorPushData(id)

    try {
        const result = await queryDatabase(queryPush, valuesPush);
        const payload = welcome();
        sendNotifications(result, payload).catch(notificationError => {
            console.error('Error al enviar notificaciones', notificationError);
        });
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    welcomeUser,
    pushNotifications
}