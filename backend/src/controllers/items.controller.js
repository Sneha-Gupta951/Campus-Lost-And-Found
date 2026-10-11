const db = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { createItemSchema, listItemsQuerySchema } = require('../validators/item.validators');
const matchingService = require('../services/matching.service');

// Removes hidden_detail unless the caller is allowed to see it.
// This is where the "never leak the secret" rule from the schema is enforced.
function sanitizeItem(item, requesterId, requesterRole) {
  const canSeeSecret =
    requesterRole === 'admin' || requesterRole === 'security' || item.user_id === requesterId;

  if (!canSeeSecret) {
    const { hidden_detail, ...rest } = item;
    return rest;
  }
  return item;
}

async function list(req, res) {
  const q = listItemsQuerySchema.parse(req.query);
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  function addFilter(column, value) {
    params.push(value);
    conditions.push(`${column} = $${params.length}`);
  }

  if (q.type) addFilter('type', q.type);
  if (q.category_id) addFilter('category_id', q.category_id);
  if (q.location_id) addFilter('location_id', q.location_id);
  if (q.status) addFilter('status', q.status);

  if (q.q) {
    params.push(q.q);
    conditions.push(`search_vector @@ plainto_tsquery('english', $${params.length})`);
  }

  const offset = (q.page - 1) * q.limit;
  params.push(q.limit, offset);

  const sql = `
    SELECT i.*, c.name AS category_name, l.name AS location_name
    FROM items i
    JOIN categories c ON c.id = i.category_id
    JOIN locations  l ON l.id = i.location_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY i.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await db.query(sql, params);
  const items = result.rows.map((row) => sanitizeItem(row, req.user.id, req.user.role));

  return new ApiResponse(200, { items, page: q.page, limit: q.limit }).send(res);
}

// Items posted by the logged-in user — powers the "My Posts" page.
// Owner always sees their own hidden_detail (sanitizeItem allows this).
async function listMine(req, res) {
  const result = await db.query(
    `SELECT i.*, c.name AS category_name, l.name AS location_name
     FROM items i
     JOIN categories c ON c.id = i.category_id
     JOIN locations  l ON l.id = i.location_id
     WHERE i.user_id = $1 AND i.deleted_at IS NULL
     ORDER BY i.created_at DESC`,
    [req.user.id]
  );
  const items = result.rows.map((row) => sanitizeItem(row, req.user.id, req.user.role));
  return new ApiResponse(200, { items }).send(res);
}

async function getById(req, res) {
  const result = await db.query(
    `SELECT i.*, c.name AS category_name, l.name AS location_name
     FROM items i
     JOIN categories c ON c.id = i.category_id
     JOIN locations  l ON l.id = i.location_id
     WHERE i.id = $1 AND i.deleted_at IS NULL`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'ITEM_NOT_FOUND', 'Item not found');
  }

  const imagesResult = await db.query(
    'SELECT url FROM item_images WHERE item_id = $1 ORDER BY position',
    [req.params.id]
  );

  const item = sanitizeItem(result.rows[0], req.user.id, req.user.role);
  item.images = imagesResult.rows.map((r) => r.url);

  return new ApiResponse(200, { item }).send(res);
}

async function create(req, res) {
  const input = createItemSchema.parse(req.body);
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const itemResult = await client.query(
      `INSERT INTO items
        (user_id, type, title, description, category_id, location_id,
         date_happened, hidden_detail, current_holder)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.user.id,
        input.type,
        input.title,
        input.description || null,
        input.category_id,
        input.location_id,
        input.date_happened,
        input.hidden_detail || null,
        input.current_holder || null,
      ]
    );

    const item = itemResult.rows[0];

    if (input.image_urls?.length) {
      const values = input.image_urls
        .map((_, idx) => `($1, $${idx + 2}, ${idx})`)
        .join(', ');
      await client.query(
        `INSERT INTO item_images (item_id, url, position) VALUES ${values}`,
        [item.id, ...input.image_urls]
      );
    }

    await client.query('COMMIT');

    // Fire-and-forget: don't make the user wait on match scoring.
    // In production this would go on a queue instead of running inline.
    matchingService.findAndNotifyMatches(item).catch((err) => console.error('Matching failed', err));

    return new ApiResponse(201, { item: sanitizeItem(item, req.user.id, req.user.role) }).send(res);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(req, res) {
  const existing = await db.query('SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL', [
    req.params.id,
  ]);
  if (existing.rows.length === 0) throw new ApiError(404, 'ITEM_NOT_FOUND', 'Item not found');

  const item = existing.rows[0];
  const isOwner = item.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only edit your own posts');
  }

  const allowedFields = ['title', 'description', 'category_id', 'location_id', 'status'];
  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      params.push(req.body[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    throw new ApiError(400, 'NO_UPDATES', 'No valid fields to update');
  }

  params.push(req.params.id);
  const result = await db.query(
    `UPDATE items SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  return new ApiResponse(200, { item: sanitizeItem(result.rows[0], req.user.id, req.user.role) }).send(res);
}

async function remove(req, res) {
  const existing = await db.query('SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL', [
    req.params.id,
  ]);
  if (existing.rows.length === 0) throw new ApiError(404, 'ITEM_NOT_FOUND', 'Item not found');

  const isOwner = existing.rows[0].user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own posts');
  }

  // Soft delete — keeps the row for records/analytics, just hides it
  await db.query('UPDATE items SET deleted_at = now() WHERE id = $1', [req.params.id]);

  return res.status(204).send();
}

module.exports = { list, listMine, getById, create, update, remove };
