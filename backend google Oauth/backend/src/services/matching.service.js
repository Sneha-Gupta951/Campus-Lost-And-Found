// Rule-based matching (no AI needed). This is the scoring logic from the
// requirements step, turned into code. It runs automatically whenever a
// new item is posted, and notifies the owner of any opposite-type item
// that scores 60 or higher.
const db = require('../config/db');
const env = require('../config/env');
const aiMatchService = require('./ai/smartMatch.service');

const MATCH_THRESHOLD = 60;

function scoreMatch(a, b) {
  let score = 0;
  if (a.category_id === b.category_id) score += 40;
  if (a.location_id === b.location_id) score += 25;

  const daysApart = Math.abs(new Date(a.date_happened) - new Date(b.date_happened)) / 86400000;
  if (daysApart <= 3) score += 15;

  const wordsA = new Set(a.title.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.title.toLowerCase().split(/\W+/).filter(Boolean));
  const shared = [...wordsA].filter((w) => wordsB.has(w));
  if (shared.length > 0) score += 20;

  return score;
}

async function findAndNotifyMatches(newItem) {
  const oppositeType = newItem.type === 'lost' ? 'found' : 'lost';

  const candidates = await db.query(
    `SELECT * FROM items
     WHERE type = $1 AND status = 'open' AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 200`,
    [oppositeType]
  );

  let matches = candidates.rows
    .map((candidate) => ({ candidate, score: scoreMatch(newItem, candidate) }))
    .filter((m) => m.score >= MATCH_THRESHOLD);

  // Optional AI refinement — only runs if explicitly enabled in .env.
  // The rule-based result above always works even if this is off or fails.
  if (env.aiMatchingEnabled) {
    try {
      matches = await aiMatchService.rerank(newItem, matches);
    } catch (err) {
      console.error('AI rerank failed, falling back to rule-based matches', err);
    }
  }

  for (const match of matches) {
    await db.query(
      `INSERT INTO notifications (user_id, type, message, item_id)
       VALUES ($1, 'match_found', $2, $3)`,
      [
        match.candidate.user_id,
        `A possible match was found for your ${match.candidate.type} post: "${newItem.title}"`,
        newItem.id,
      ]
    );
  }

  return matches;
}

module.exports = { scoreMatch, findAndNotifyMatches, MATCH_THRESHOLD };
