/**
 * utils/emailService.js
 * Servicio de envío de correos electrónicos mediante SMTP
 * Configurado para Gmail/Google Workspace
 */

'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

/**
 * Inicializa el transporte de correos SMTP
 */
function initializeMailer() {
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER || 'preyvictoria@gmail.com';
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');

  if (!smtpPass) {
    logger.warn('⚠️  SMTP_PASS no configurada. El envío de correos estará deshabilitado.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  logger.info('✅ Transporte SMTP inicializado correctamente');
  return transporter;
}

/**
 * Envía un correo de notificación
 * @param {string} to - Correo destino
 * @param {string} subject - Asunto
 * @param {string} text - Texto plano
 * @param {string} html - HTML del correo (opcional)
 * @returns {Promise<boolean>} - true si se envió exitosamente
 */
async function sendEmail(to, subject, text, html = null) {
  try {
    const mailer = transporter || initializeMailer();

    if (!mailer) {
      logger.warn(`📧 Correo no enviado (SMTP no configurado): ${to}`);
      return false;
    }

    const info = await mailer.sendMail({
      from: process.env.SMTP_USER || 'preyvictoria@gmail.com',
      to,
      subject,
      text,
      html: html || text,
    });

    logger.info(`📧 Correo enviado exitosamente a ${to}:`, {
      messageId: info.messageId,
      subject,
    });
    return true;
  } catch (error) {
    logger.error(`❌ Error al enviar correo a ${to}:`, {
      error: error.message,
      subject,
    });
    return false;
  }
}

/**
 * Notifica al paciente sobre una nueva cita agendada por el médico
 */
async function notifyAppointmentBooked(patientEmail, patientName, slotDate, slotTime) {
  const subject = '✅ Nueva cita médica agendada - MediCita';
  const text = `
Hola ${patientName},

El médico ha agendado una nueva cita para usted.

Fecha: ${slotDate}
Hora: ${slotTime}

Por favor, confirme su asistencia en el sistema.

Saludos,
MediCita - Centro Médico
  `.trim();

  const html = `
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">✅ Nueva Cita Médica Agendada</h2>
      
      <p>Hola <strong>${patientName}</strong>,</p>
      
      <p>El médico ha agendado una nueva cita para usted:</p>
      
      <div style="background-color: #ecf0f1; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
        <p><strong>📅 Fecha:</strong> ${slotDate}</p>
        <p><strong>🕐 Hora:</strong> ${slotTime}</p>
      </div>
      
      <p>Por favor, confirme su asistencia en el sistema.</p>
      
      <p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
        Este es un correo automático del sistema MediCita. Por favor no responda a este correo.
      </p>
    </div>
  </body>
</html>
  `.trim();

  return sendEmail(patientEmail, subject, text, html);
}

/**
 * Notifica al paciente sobre la cancelación de su cita
 */
async function notifyAppointmentCancelled(patientEmail, patientName, slotDate, slotTime) {
  const subject = '❌ Cita médica cancelada - MediCita';
  const text = `
Hola ${patientName},

Lamentamos informarle que su cita médica ha sido cancelada.

Fecha: ${slotDate}
Hora: ${slotTime}

Si tiene preguntas, puede contactar al centro médico.

Saludos,
MediCita - Centro Médico
  `.trim();

  const html = `
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #e74c3c; border-bottom: 3px solid #e74c3c; padding-bottom: 10px;">❌ Cita Médica Cancelada</h2>
      
      <p>Hola <strong>${patientName}</strong>,</p>
      
      <p>Lamentamos informarle que su cita médica ha sido <strong>cancelada</strong>:</p>
      
      <div style="background-color: #fadbd8; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
        <p><strong>📅 Fecha:</strong> ${slotDate}</p>
        <p><strong>🕐 Hora:</strong> ${slotTime}</p>
      </div>
      
      <p>Si tiene preguntas o desea reprogramar, puede contactar al centro médico.</p>
      
      <p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
        Este es un correo automático del sistema MediCita. Por favor no responda a este correo.
      </p>
    </div>
  </body>
</html>
  `.trim();

  return sendEmail(patientEmail, subject, text, html);
}

/**
 * Notifica al paciente sobre reprogramación de su cita
 */
async function notifyAppointmentRescheduled(patientEmail, patientName, oldDate, oldTime, newDate, newTime) {
  const subject = '🔄 Cita médica reprogramada - MediCita';
  const text = `
Hola ${patientName},

Su cita médica ha sido reprogramada.

Fecha anterior: ${oldDate} a las ${oldTime}
Nueva fecha: ${newDate} a las ${newTime}

Por favor, ajuste su agenda en consecuencia.

Saludos,
MediCita - Centro Médico
  `.trim();

  const html = `
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #f39c12; border-bottom: 3px solid #f39c12; padding-bottom: 10px;">🔄 Cita Médica Reprogramada</h2>
      
      <p>Hola <strong>${patientName}</strong>,</p>
      
      <p>Su cita médica ha sido <strong>reprogramada</strong>:</p>
      
      <div style="background-color: #fef5e7; padding: 15px; border-left: 4px solid #f39c12; margin: 20px 0;">
        <p><strong>❌ Anterior:</strong> ${oldDate} a las ${oldTime}</p>
        <p><strong>✅ Nueva fecha:</strong> ${newDate} a las ${newTime}</p>
      </div>
      
      <p>Por favor, ajuste su agenda en consecuencia.</p>
      
      <p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
        Este es un correo automático del sistema MediCita. Por favor no responda a este correo.
      </p>
    </div>
  </body>
</html>
  `.trim();

  return sendEmail(patientEmail, subject, text, html);
}

/**
 * Notifica al médico cuando un paciente reserva una cita
 */
async function notifyDoctorPatientBooked(doctorEmail, doctorName, patientName, slotDate, slotTime) {
  const subject = '📋 Paciente reservó una cita - MediCita';
  const text = `
Hola ${doctorName},

El paciente ${patientName} ha reservado una cita con usted.

Fecha: ${slotDate}
Hora: ${slotTime}

Por favor, prepárese para la cita en el horario especificado.

Saludos,
MediCita - Centro Médico
  `.trim();

  const html = `
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #27ae60; border-bottom: 3px solid #27ae60; padding-bottom: 10px;">📋 Nueva Reserva de Paciente</h2>
      
      <p>Hola <strong>${doctorName}</strong>,</p>
      
      <p>El paciente <strong>${patientName}</strong> ha reservado una cita con usted:</p>
      
      <div style="background-color: #d5f4e6; padding: 15px; border-left: 4px solid #27ae60; margin: 20px 0;">
        <p><strong>👤 Paciente:</strong> ${patientName}</p>
        <p><strong>📅 Fecha:</strong> ${slotDate}</p>
        <p><strong>🕐 Hora:</strong> ${slotTime}</p>
      </div>
      
      <p>Por favor, prepárese para la cita en el horario especificado.</p>
      
      <p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
        Este es un correo automático del sistema MediCita. Por favor no responda a este correo.
      </p>
    </div>
  </body>
</html>
  `.trim();

  return sendEmail(doctorEmail, subject, text, html);
}

/**
 * Envía notificación de prueba (para testing)
 */
async function sendTestEmail(to = 'preyvictoria@gmail.com') {
  const subject = '[TEST] MediCita - Correo de Prueba';
  const text = `Este es un correo de prueba enviado desde el sistema MediCita en ${new Date().toISOString()}`;
  return sendEmail(to, subject, text);
}

module.exports = {
  initializeMailer,
  sendEmail,
  notifyAppointmentBooked,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyDoctorPatientBooked,
  sendTestEmail,
};
