/**
 * services/notificationService.js — adaptado a MySQL
 */
'use strict';

const db = require('../config/database');

async function getUnread(userId) {
  const { rows } = await db.query(
    `SELECT id, message, created_at FROM notifications
     WHERE user_id = ? AND is_read = 0
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function markAllRead(userId) {
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
}

module.exports = { getUnread, markAllRead };
