// PAYLOADS PUSH PARA ADMINISTRADOR DE EVENTOS
function opencertified(nombre, persona) {
    return {
        "notification": {
            "title": `¡CERTIFICADO ABIERTO`,
            "body": ` ${persona} ha abierto su certificado del evento ${nombre}.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function downloadcertified(nombre, persona) {
    return {
        "notification": {
            "title": `¡CERTIFICADO DESCARGADO!`,
            "body": ` ${persona} ha descargado su certificado del evento ${nombre}.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function qrcertified(nombre, persona) {
    return {
        "notification": {
            "title": `¡CERTIFICADO ESCANEADO!`,
            "body": ` ${persona} ha escaneado el codigo QR de su certificado del evento ${nombre}.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function newtemplate(grupo, nombre) {
    return {
        "notification": {
            "title": `${grupo}`,
            "body": `Se ha creado una nueva plantilla para el evento ${nombre}.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function newSponsorEvent(sponsor, event, persona) {
    return {
        "notification": {
            "title": `'${event}'`,
            "body": ` ${persona} ha agregado a '${sponsor}' como auspiciador.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function newSignatureEvent(signature, event, persona) {
    return {
        "notification": {
            "title": `'${event}'`,
            "body": ` ${persona} ha agregado a '${signature}' como firmante.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }

}

function newPersonEvent(grupo, evento, nombre){
    return {
        "notification": {
            "title": `${grupo}` ,
            "body": `${nombre} ha sido agregado al evento ${evento}.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function closeEvent(evento){
    return {
        "notification": {
            "title": `¡EVENTO CERRADO!` ,
            "body": `Se ha completado la asignación de certificados para el evento ${evento}, desde ahora no se podra modificar ni agregar nada mas.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

module.exports = {
    downloadcertified,
    opencertified,
    closeEvent,
    qrcertified,
    newPersonEvent,
    newSponsorEvent,
    newSignatureEvent,
    newtemplate,
}


