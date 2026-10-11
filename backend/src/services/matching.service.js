// Rule-based matching, now with cosine similarity on the item's title +
// description. This is the scoring logic from the requirements step,
// turned into code. Runs automatically whenever a new item is posted,
// and notifies the owner of any opposite-type item that scores high enough.
const db = require('../config/db');
const env = require('../config/env');
const aiMatchService = require('./ai/smartMatch.service');

const MATCH_THRESHOLD = 60;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'was', 'in', 'on', 'at', 'of', 'and', 'to', 'with',
  'near', 'my', 'it', 'this', 'that', 'for', 'i', 'found', 'lost', 'has',
]);

// Turns a string into a word-frequency map, e.g.
// "Black Wildcraft backpack, black zipper" -> { black: 2, wildcraft: 1, backpack: 1, zipper: 1 }
// This is the "vector" — each unique word is one dimension, and the count
// is that dimension's value.
function textToVector(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  const freq = {};
  for (const word of words) freq[word] = (freq[word] || 0) + 1;
  return freq;
}

// The actual cosine similarity formula: dot product of the two vectors,
// divided by the product of their magnitudes ("lengths"). Returns a value
// from 0 (completely unrelated) to 1 (identical word usage).
function cosineSimilarity(vecA, vecB) {
  const allWords = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const word of allWords) {
    const a = vecA[word] || 0;
    const b = vecB[word] || 0;
    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0; // avoid divide-by-zero
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

// Combines title + description into one block of text for comparison.
function descriptionSimilarity(a, b) {
  const textA = `${a.title} ${a.description || ''}`;
  const textB = `${b.title} ${b.description || ''}`;
  return cosineSimilarity(textToVector(textA), textToVector(textB));
}

function scoreMatch(a, b) {
  let score = 0;
  if (a.category_id === b.category_id) score += 30;
  if (a.location_id === b.location_id) score += 20;

  const daysApart = Math.abs(new Date(a.date_happened) - new Date(b.date_happened)) / 86400000;
  if (daysApart <= 3) score += 10;

  // Cosine similarity contributes up to 40 points — the biggest single
  // factor, since matching wording is a strong signal ("black wallet" vs
  // "black leather wallet" scores high even with different exact words).
  const similarity = descriptionSimilarity(a, b);
  score += similarity * 40;

  return { score: Math.round(score), similarity };
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
    .map((candidate) => {
      const { score, similarity } = scoreMatch(newItem, candidate);
      return { candidate, score, similarity };
    })
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score); // best matches first

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
    const similarityPct = Math.round(match.similarity * 100);
    await db.query(
      `INSERT INTO notifications (user_id, type, message, item_id)
       VALUES ($1, 'match_found', $2, $3)`,
      [
        match.candidate.user_id,
        `A possible match was found for your ${match.candidate.type} post: "${newItem.title}" (${similarityPct}% description match)`,
        newItem.id,
      ]
    );
  }

  return matches;
}

module.exports = { scoreMatch, cosineSimilarity, textToVector, findAndNotifyMatches, MATCH_THRESHOLD };
