/**
 * controllers/patientController.js
 */

'use strict';

const patientService = require('../services/patientService');

async function list(req, res, next) {
  try {
    const data = await patientService.listPatients();
    res.json({ data });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const patient = await patientService.getPatientById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ data: patient });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    const patient = await patientService.getPatientByUserId(req.user.sub);
    if (!patient) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json({ data: patient });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const patient = await patientService.updatePatient(req.params.id, req.body);
    res.json({ data: patient });
  } catch (err) { next(err); }
}

async function deactivate(req, res, next) {
  try {
    await patientService.deactivatePatient(req.params.id);
    res.json({ message: 'Paciente desactivado' });
  } catch (err) { next(err); }
}

module.exports = { list, getById, getMe, update, deactivate };
