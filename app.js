const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const verifyToken = require('./middleware/middleware');
require('dotenv').config();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '20mb' }));

/* const verifyToken = require('./middleware/middleware'); // Importar el middleware verifyToken */

// Importa las rutas
const r_auspiciadores = require("./routes/sponsors/main");
const r_certificado = require("./routes/certificates/main");
const r_direccion = require("./routes/occupation/main");
const r_evento = require("./routes/events/main");
const r_estructura = require("./routes/structure/estructura");
const r_firmas = require("./routes/signatures/main");
const r_grupos = require("./routes/groups/main");
const r_logo = require("./routes/logo");
const r_persona = require("./routes/persons/main");
const r_plantilla = require("./routes/templates/main");
const r_rol = require("./routes/rols/rol");
const r_usuario = require("./routes/users/main");
const r_email = require("./services/email/email");
const l_login = require("./services/login/main");
const r_notifiaciones = require("./routes/notifications/main");

// Direccion de Prueba
app.get("/api/test", (req, res) => {
  res.send("El Servidor esta bien prendido");
});

// Rutas desprotegidas 
app.use("/credentic/api/login", l_login);
app.use("/credentic/api/certificado", r_certificado);
app.use('/credentic/api/notificaciones', r_notifiaciones);
// Rutas protegidas que requieren token
app.use("/credentic/api/auspiciadores", verifyToken, r_auspiciadores);
app.use("/credentic/api/direccion", verifyToken, r_direccion);
app.use("/credentic/api/evento", verifyToken, r_evento);
app.use("/credentic/api/estructura", verifyToken, r_estructura);
app.use("/credentic/api/firmas", verifyToken, r_firmas);
app.use("/credentic/api/grupos", verifyToken, r_grupos);
app.use("/credentic/api/logo", verifyToken, r_logo);
app.use("/credentic/api/persona", verifyToken, r_persona);
app.use("/credentic/api/plantilla", verifyToken, r_plantilla);
app.use("/credentic/api/rol", verifyToken, r_rol);
app.use("/credentic/api/usuario", verifyToken, r_usuario);
app.use('/credentic/api/certificado/entrega', verifyToken, r_email);

app.use('/credentic/assets', express.static('assets'));

app.listen(80, () => {
  console.log("Bien Prendido")
});


