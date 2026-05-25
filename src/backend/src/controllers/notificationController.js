/**
 * controllers/notificationController.js
 */

'use strict';

const notificationService = require('../services/notificationService');
const { validationResult } = require('express-validator');

async function getMyNotifications(req, res, next) {
  try {
    const data = await notificationService.getUnread(req.user.sub);
    res.json({ data });
  } catch (err) { next(err); }
}

async function getAllNotifications(req, res, next) {
  try {
    const data = await notificationService.getAll(req.user.sub);
    res.json({ data });
  } catch (err) { next(err); }
}

async function countUnread(req, res, next) {
  try {
    const count = await notificationService.countUnread(req.user.sub);
    res.json({ unreadCount: count });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const { notificationId } = req.body;
    if (notificationId) {
      await notificationService.markAsRead(notificationId);
      return res.json({ message: 'Notificación marcada como leída' });
    }
    await notificationService.markAllRead(req.user.sub);
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (err) { next(err); }
}

async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id);
    res.json({ message: 'Notificación eliminada' });
  } catch (err) { next(err); }
}

module.exports = { getMyNotifications, getAllNotifications, countUnread, markRead, deleteNotification };
