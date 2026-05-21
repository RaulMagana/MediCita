/**
 * controllers/appointmentController.js
 */

'use strict';

const { validationResult } = require('express-validator');
const appointmentService   = require('../services/appointmentService');
const patientService       = require('../services/patientService');

async function getSlots(req, res, next) {
  try {
    const slots = await appointmentService.getSlots(req.query);
    res.json({ data: slots });
  } catch (err) { next(err); }
}

async function book(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  try {
    const { slotId, patientId: bodyPatientId } = req.body;
    const { role, sub: userId } = req.user;

    let patientId = bodyPatientId;

    // Si es paciente, el patientId se obtiene de su propio perfil
    if (role === 'patient') {
      const patient = await patientService.getPatientByUserId(userId);
      if (!patient) return res.status(404).json({ error: 'Perfil de paciente no encontrado' });
      patientId = patient.id;
    }

    const result = await appointmentService.bookSlot({
      slotId,
      patientId,
      bookedBy: role,
      doctorUserId: role === 'doctor' ? userId : undefined,
    });

    res.status(201).json({ message: 'Cita reservada exitosamente', data: result });
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    const { id: slotId } = req.params;
    await appointmentService.cancelAppointment({
      slotId,
      requesterId: req.user.sub,
      requesterRole: req.user.role,
    });
    res.json({ message: 'Cita cancelada' });
  } catch (err) { next(err); }
}

async function myAppointments(req, res, next) {
  try {
    const patient = await patientService.getPatientByUserId(req.user.sub);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    const data = await appointmentService.getPatientAppointments(patient.id);
    res.json({ data });
  } catch (err) { next(err); }
}

module.exports = { getSlots, book, cancel, myAppointments };
