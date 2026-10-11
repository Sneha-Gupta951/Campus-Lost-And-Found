const db = require('../config/db');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

async function list(req, res) {
  const result = await db.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  const unreadCount = result.rows.filter((n) => !n.is_read).length;
  return new ApiResponse(200, { notifications: result.rows, unreadCount }).send(res);
}

async function markRead(req, res) {
  const result = await db.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  return new ApiResponse(200, { notification: result.rows[0] }).send(res);
}

async function markAllRead(req, res) {
  await db.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [
    req.user.id,
  ]);
  return new ApiResponse(200, { message: 'All notifications marked read' }).send(res);
}

module.exports = { list, markRead, markAllRead };
