'use strict';

const db = require('../config/database');

async function getUnread(userId) {
  const { rows } = await db.query(
    `SELECT id, message, created_at FROM notifications
     WHERE user_id = $1 AND is_read = false
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function getAll(userId) {
  const { rows } = await db.query(
    `SELECT id, message, is_read, created_at FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function markAllRead(userId) {
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
}

async function markAsRead(notificationId) {
  const { rows } = await db.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
    [notificationId]
  );
  return rows[0];
}

async function deleteNotification(notificationId) {
  await db.query('DELETE FROM notifications WHERE id = $1', [notificationId]);
}

async function createNotification(userId, message) {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, message)
     VALUES ($1, $2)
     RETURNING id, user_id, message, is_read, created_at`,
    [userId, message]
  );
  return rows[0];
}

async function countUnread(userId) {
  const { rows } = await db.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return parseInt(rows[0].count, 10);
}

module.exports = { getUnread, getAll, markAllRead, markAsRead, deleteNotification, createNotification, countUnread };