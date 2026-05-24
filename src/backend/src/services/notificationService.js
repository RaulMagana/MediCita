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

async function markAllRead(userId) {
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
}

module.exports = { getUnread, markAllRead };