const express = require('express');
const { registersubs, getReport, getNotificacions, getCountNotificacions, readNotification, MainDashboard, checkIfExists } = require('./query');
const { queryDatabase } = require('../shared/querys')
const { welcomeUser } = require('../../services/notifications/push')
const messages = require('../../templates/messages')
const verifyToken = require('../../middleware/middleware');
const router = express();

router.post('/register/subscription', verifyToken, async (req, res) => {
  const id = req.body.id;
  const endpoint = req.body.body.endpoint;
  const p256dh = req.body.body.keys.p256dh;
  const auth = req.body.body.keys.auth;
  try {

    const {queryCheck, valuesCheck} = await checkIfExists(id, endpoint, p256dh, auth);
    const exists = await queryDatabase(queryCheck, valuesCheck)

    if (exists) {
      res.json({ mensaje: "La suscripción ya existe." });
    } else {
      const { querySubs, valuesSubs } = registersubs(id, endpoint, p256dh, auth);

      await queryDatabase(querySubs, valuesSubs);
      res.json({ mensaje: "A partir de ahora recibirá notificaciones de sus eventos y grupos." });
    }
  } catch (err) { console.log(err) }
});

router.get('/get/report', verifyToken, async (req, res) => {
  const { id, first, rows } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);
  const { querReports, valuesReports } = await getReport(id, startIndex, numRows);
  try {
    const results = await queryDatabase(querReports, valuesReports).catch(err => console.log(err));
    res.json(results);
  } catch (err) { console.log(err) }

});

router.get('/get/notifitacions', verifyToken, async (req, res) => {
  const { id, first, rows } = req.query;
  const startIndex = parseInt(first);
  const numRows = parseInt(rows);
  const { queryNotifications, valuesNotificacions } = await getNotificacions(id, startIndex, numRows);
  const { queryCountNotifications, valuesCountNotificacions } = await getCountNotificacions(id);
  try {
    const results = await queryDatabase(queryNotifications, valuesNotificacions)
    const resultsCount = await queryDatabase(queryCountNotifications, valuesCountNotificacions)
    const countResult = resultsCount[0].totalItems;
    res.json({ items: results, total: countResult });
  } catch (err) { console.log(err) }


});

router.put('/update/notificactions/:id', verifyToken, async (req, res) => {
  const id = req.params.id
  try {
    const { queryNotifications, valuesNotificacions } = readNotification(id);
    const results = await queryDatabase(queryNotifications, valuesNotificacions).catch(err => console.log(err));
    res.json(results);
  } catch (err) { console.log(err) }
});

router.get('/main/admin/dashboard', verifyToken, async (req, res) => {

  const { selectUsers, selectEvents, selectGroups, selectCertified, selectSponsors, selectSignatures, selectTemplates, selectTotalCheck, selectTotalWait, selectTotalSend, selectTotalAnulates, values
  } = await MainDashboard(req.query.id);

  try {
    const [
      resultsUsers,
      resultsEvents,
      resultsGroups,
      resultsCertified,
      resultsSponsors,
      resultsSignatures,
      resultsTemplates,
      resultsTotalCheck,
      resultsTotalWait,
      resultsTotalSend,
      resultsTotalAnulates
    ] = await Promise.all([
      queryDatabase(selectUsers, values),
      queryDatabase(selectEvents, values),
      queryDatabase(selectGroups, values),
      queryDatabase(selectCertified, values),
      queryDatabase(selectSponsors, values),
      queryDatabase(selectSignatures, values),
      queryDatabase(selectTemplates, values),
      queryDatabase(selectTotalCheck, values),
      queryDatabase(selectTotalWait, values),
      queryDatabase(selectTotalSend, values),
      queryDatabase(selectTotalAnulates, values)
    ]).catch(err => console.log(err));

    const totalUsuarios = resultsUsers[0].totalusuarios;
    const totalEventos = resultsEvents[0].totaleventos;
    const totalGrupos = resultsGroups[0].totalgrupos;
    const totalCertificados = resultsCertified[0].totalcertificados;
    const totalAuspiciadores = resultsSponsors[0].totalauspiciadores;
    const totalFirmantes = resultsSignatures[0].totalfirmantes;
    const totalPlantillas = resultsTemplates[0].totalplantillas;
    const totalRevision = resultsTotalCheck[0].totalrevision;
    const totalEspera = resultsTotalWait[0].totalespera;
    const totalEmitidos = resultsTotalSend[0].totalemitidos;
    const totalAnulados = resultsTotalAnulates[0].totalanulados;

    res.json({
      totalUsuarios,
      totalEventos,
      totalGrupos,
      totalCertificados,
      totalAuspiciadores,
      totalFirmantes,
      totalPlantillas,
      totalRevision,
      totalEspera,
      totalEmitidos,
      totalAnulados
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ mensaje: messages.errorquery });
  }
});


module.exports = router;
