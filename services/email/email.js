const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const { obtenerNombresAuspiciadores, actualizarCertificado, } = require("./query");
const  {generateEmailBody} = require('./email-body')
const moment = require("moment");
require("moment-timezone");
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({ limit: "20mb" }));

const smtpConfig = {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
    }, // true para SSL/TLS
    auth: {
        user: "certificacion@ucbtja.edu.bo",
        pass: "ConejoConejo.2023",
    },
};

// Función para enviar el correo electrónico
function enviarCorreo(destinatario, asunto, html, callback) {
    const mailOptions = {
        from: "Cert UCB Tarija <certificacion@ucbtja.edu.bo>",
        to: destinatario,
        subject: asunto,
        html: html,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error al enviar el correo electrónico:", error);
            callback(error);
        } else {
            callback(null, info);
        }
    });
}

// Crear transporte SMTP
const transporter = nodemailer.createTransport(smtpConfig);

// Endpoint refactorizado
router.post("/item/:id", (req, res) => {
    const destinatario = req.body.correo;
    const evento = req.body.evento;
    const persona = req.body.nombre;
    const nombres = persona.split(" ");
    const fecha_e = req.body.fecha_e;
    const idevento = req.body.idevento;
    const nombreCompleto = persona;
    const asunto = "Estimado " + persona + " ¡Tu certificado está listo!";
    const uid = req.body.uid;
    const url = "https://cert.tja.ucb.edu.bo/certificado/chk/codigo/" + uid;
    const fecha = moment();
    const fecha2 = moment(fecha_e);
    const fechaActual = moment(fecha, "ddd MMM DD YYYY HH:mm:ss ZZ");
    const fechaActual2 = moment(fecha2, "ddd MMM DD YYYY");
    const fechan = fechaActual.tz("America/La_Paz").format("YYYY-MM-DD HH:mm:ss");
    const fechae = fechaActual2.tz("America/La_Paz").format("DD/MM/YY");
  
    obtenerNombresAuspiciadores(idevento).then((auspiciadores) => {
        const html = generateEmailBody(nombreCompleto, evento, fechae, url, auspiciadores, destinatario);

        enviarCorreo(destinatario, asunto, html, (error, info) => {
          if (error) {
            console.log("Error al enviar el correo electrónico:", error);
            res.status(500).json({ error: "Error al enviar el correo electrónico" });
          } else {
            actualizarCertificado(uid, fechan)
              .then(() => {
                res.json({ mensaje: "Envio Realizado Correctamente" });
              })
              .catch((error) => {
                console.error(error);
                res.status(500).json({ error: "Error al actualizar el certificado" });
              });
          }
        });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los auspiciadores" });
      });
  });

module.exports = router;
