const db = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { createClaimSchema, reviewClaimSchema } = require('../validators/item.validators');

async function create(req, res) {
  const { proof_answer } = createClaimSchema.parse(req.body);
  const itemId = req.params.id;

  const itemResult = await db.query('SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL', [
    itemId,
  ]);
  if (itemResult.rows.length === 0) throw new ApiError(404, 'ITEM_NOT_FOUND', 'Item not found');

  const item = itemResult.rows[0];
  if (item.status !== 'open') {
    throw new ApiError(409, 'ITEM_NOT_CLAIMABLE', 'This item is no longer open for claims');
  }
  if (item.user_id === req.user.id) {
    throw new ApiError(400, 'CANNOT_CLAIM_OWN_ITEM', 'You cannot claim your own post');
  }

  // The one_claim_per_user_per_item UNIQUE constraint in the schema backs
  // this up at the database level too — this check just gives a nicer message.
  const result = await db.query(
    `INSERT INTO claims (item_id, claimant_id, proof_answer)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [itemId, req.user.id, proof_answer]
  );

  await db.query(
    `INSERT INTO notifications (user_id, type, message, item_id)
     VALUES ($1, 'claim_received', $2, $3)`,
    [item.user_id, `Someone claimed your item: "${item.title}"`, item.id]
  );

  return new ApiResponse(201, { claim: result.rows[0] }).send(res);
}

async function listForItem(req, res) {
  const itemId = req.params.id;

  const itemResult = await db.query('SELECT user_id FROM items WHERE id = $1', [itemId]);
  if (itemResult.rows.length === 0) throw new ApiError(404, 'ITEM_NOT_FOUND', 'Item not found');

  const isOwner = itemResult.rows[0].user_id === req.user.id;
  const isStaff = ['security', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    throw new ApiError(403, 'FORBIDDEN', 'You cannot view claims on this item');
  }

  const result = await db.query(
    `SELECT cl.*, u.name AS claimant_name, u.email AS claimant_email
     FROM claims cl
     JOIN users u ON u.id = cl.claimant_id
     WHERE cl.item_id = $1
     ORDER BY cl.created_at DESC`,
    [itemId]
  );

  return new ApiResponse(200, { claims: result.rows }).send(res);
}

// The important one: approving/rejecting a claim, done as a transaction so
// the claim and item status change together or not at all.
async function review(req, res) {
  const { status, review_note } = reviewClaimSchema.parse(req.body);
  const claimId = req.params.id;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const claimResult = await client.query('SELECT * FROM claims WHERE id = $1 FOR UPDATE', [
      claimId,
    ]);
    if (claimResult.rows.length === 0) {
      throw new ApiError(404, 'CLAIM_NOT_FOUND', 'Claim not found');
    }

    const claim = claimResult.rows[0];
    if (claim.status !== 'pending') {
      throw new ApiError(409, 'CLAIM_ALREADY_REVIEWED', 'This claim was already reviewed');
    }

    const updatedClaim = await client.query(
      `UPDATE claims
       SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = now()
       WHERE id = $4
       RETURNING *`,
      [status, review_note || null, req.user.id, claimId]
    );

    if (status === 'approved') {
      // The schema's unique index (one_approved_claim_per_item) protects
      // against a race condition even if two staff approve at once.
      await client.query(`UPDATE items SET status = 'claimed' WHERE id = $1`, [claim.item_id]);
    }

    await client.query(
      `INSERT INTO notifications (user_id, type, message, item_id)
       VALUES ($1, $2, $3, $4)`,
      [
        claim.claimant_id,
        status === 'approved' ? 'claim_approved' : 'claim_rejected',
        status === 'approved'
          ? 'Your claim was approved — arrange pickup with the finder or security desk.'
          : 'Your claim was rejected.',
        claim.item_id,
      ]
    );

    await client.query('COMMIT');
    return new ApiResponse(200, { claim: updatedClaim.rows[0] }).send(res);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { create, listForItem, review };
