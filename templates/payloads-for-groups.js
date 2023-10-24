// PAYLOADS PUSH PARA GRUPOS
function welcome(){
    return {
        "notification": {
            "title": `¡Enhorabuena!` ,
            "body": `A partir de ahora recibira notificaciones de sus eventos y grupos.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function newEvent(grupo, nombre){
    return {
        "notification": {
            "title": `${grupo}` ,
            "body": `Se ha creado el evento `+ `${nombre}` + `.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function closeEvent(nombre){
    return {
        "notification": {
            "title": `¡EVENTO CERRADO!` ,
            "body": `Se ha cerrado el evento `+ `${nombre}` + `.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }
}

function newUserGroup(grupo, persona) {
    return {
        "notification": {
            "title": `'${grupo}'`,
            "body": ` ${persona} ha sido agregado al grupo.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }

}

function newListEventGroup(grupo, evento, extra) {
    return {
        "notification": {
            "title": `'${grupo}'`,
            "body": `Se adiciono ${extra} personas al evento ${evento}.`,
            "icon": "https://tja.ucb.edu.bo/wp-content/uploads/2020/09/cropped-logo-UCB-300x300.png",
            "importance": "high",
            "vibrate": [100, 50, 100],
            "timestamp": Date.now() + 30 * 60 * 1000,
        }
    }

}

module.exports = {  
    welcome,
    newEvent,
    closeEvent,
    newUserGroup,
    newListEventGroup
}
