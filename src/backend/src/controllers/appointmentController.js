/**
 * controllers/appointmentController.js
 *
 * ADICIONES respecto a la versión anterior:
 *  - createSlot: el médico crea un nuevo slot disponible
 *  - reschedule:  el médico modifica fecha/hora de un slot existente
 *  - getAppointment: obtener detalles de una cita
 *  - getAllAppointments: listar todas las citas (para médicos)
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

// ── NUEVO: obtener detalles de una cita específica ───────────────────
async function getAppointment(req, res, next) {
  try {
    const { id: slotId } = req.params;
    const appointment = await appointmentService.getAppointmentById(slotId);
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ data: appointment });
  } catch (err) { next(err); }
}

// ── NUEVO: listar todas las citas (solo médico) ───────────────────────
async function getAllAppointments(req, res, next) {
  try {
    const appointments = await appointmentService.getAllAppointments(req.query);
    res.json({ data: appointments });
  } catch (err) { next(err); }
}

// ── NUEVO: el médico crea un slot de horario disponible ─────────────
async function createSlot(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  try {
    const { date, time } = req.body;
    const doctorUserId = req.user.sub; // ID del doctor autenticado
    const slot = await appointmentService.createSlot({ date, time, doctorUserId });
    res.status(201).json({ message: 'Slot creado exitosamente', data: slot });
  } catch (err) { next(err); }
}

// ── NUEVO: el médico reprograma un slot existente ────────────────────
async function reschedule(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  try {
    const { id: slotId } = req.params;
    const { date, time } = req.body;
    const slot = await appointmentService.rescheduleSlot({ slotId, date, time });
    res.json({ message: 'Cita reprogramada', data: slot });
  } catch (err) { next(err); }
}

module.exports = { getSlots, book, cancel, myAppointments, getAppointment, getAllAppointments, createSlot, reschedule };