/**
 * controllers/notificationController.js
 */

'use strict';

const notificationService = require('../services/notificationService');

async function getMyNotifications(req, res, next) {
  try {
    const data = await notificationService.getUnread(req.user.sub);
    res.json({ data });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    await notificationService.markAllRead(req.user.sub);
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (err) { next(err); }
}

module.exports = { getMyNotifications, markRead };
