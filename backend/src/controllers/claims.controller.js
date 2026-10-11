const db = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { createClaimSchema, reviewClaimSchema } = require('../validators/item.validators');

async function create(req, res) {
  const { proof_answer, contact_info } = createClaimSchema.parse(req.body);
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
    `INSERT INTO claims (item_id, claimant_id, proof_answer, contact_info)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [itemId, req.user.id, proof_answer, contact_info || null]
  );

  // Notifies the FINDER (the item's owner) that someone wants to claim it —
  // this is the notification the original poster will actually see.
  await db.query(
    `INSERT INTO notifications (user_id, type, message, item_id)
     VALUES ($1, 'claim_received', $2, $3)`,
    [item.user_id, `Someone claimed your item "${item.title}" — review their proof to approve or reject.`, item.id]
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
//
// Who can review: the item's owner (the finder decides who to return it to),
// OR security/admin (can step in / override). This matches the mockup's
// "finder approves" flow while keeping staff able to supervise.
async function review(req, res) {
  const { status, review_note } = reviewClaimSchema.parse(req.body);
  const claimId = req.params.id;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const claimResult = await client.query(
      `SELECT cl.*, i.user_id AS item_owner_id
       FROM claims cl JOIN items i ON i.id = cl.item_id
       WHERE cl.id = $1 FOR UPDATE`,
      [claimId]
    );
    if (claimResult.rows.length === 0) {
      throw new ApiError(404, 'CLAIM_NOT_FOUND', 'Claim not found');
    }

    const claim = claimResult.rows[0];
    const isOwner = claim.item_owner_id === req.user.id;
    const isStaff = ['security', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the item owner or staff can review this claim');
    }

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

// Claims RECEIVED on items the logged-in user owns — powers "Review Claims" tab
async function listReceived(req, res) {
  const result = await db.query(
    `SELECT cl.*, 
            i.title AS item_title, i.type AS item_type, i.location_id, l.name AS location_name,
            u.name AS claimant_name, u.email AS claimant_email
     FROM claims cl
     JOIN items i ON i.id = cl.item_id
     JOIN locations l ON l.id = i.location_id
     JOIN users u ON u.id = cl.claimant_id
     WHERE i.user_id = $1
     ORDER BY cl.created_at DESC`,
    [req.user.id]
  );
  return new ApiResponse(200, { claims: result.rows }).send(res);
}

// Claims the logged-in user has FILED — powers "My Claims" tab
async function listMine(req, res) {
  const result = await db.query(
    `SELECT cl.*, 
            i.title AS item_title, i.type AS item_type, i.location_id, l.name AS location_name,
            owner.name AS owner_name
     FROM claims cl
     JOIN items i ON i.id = cl.item_id
     JOIN locations l ON l.id = i.location_id
     JOIN users owner ON owner.id = i.user_id
     WHERE cl.claimant_id = $1
     ORDER BY cl.created_at DESC`,
    [req.user.id]
  );
  return new ApiResponse(200, { claims: result.rows }).send(res);
}

module.exports = { create, listForItem, review, listReceived, listMine };
