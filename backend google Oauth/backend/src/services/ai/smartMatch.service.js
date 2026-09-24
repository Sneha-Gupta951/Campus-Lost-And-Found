// AI FEATURES LIVE HERE — kept isolated on purpose.
//
// Why a separate file/folder instead of mixing this into matching.service.js:
//   1. The app must work perfectly with this file doing NOTHING (AI is a
//      bonus, not a dependency — see AI_MATCHING_ENABLED in .env).
//   2. You can swap the AI provider (OpenAI, Claude, a local model) by
//      editing only this file.
//   3. If this later needs to move to its own service (e.g. a Python model
//      server), only this folder moves — routes/controllers don't change.
//
// This is a stub. Wire in a real API call when you're ready — for example,
// sending the top rule-based candidates to an LLM to re-rank by how
// similar the descriptions and photos really are.

async function rerank(newItem, ruleBasedMatches) {
  // TODO: call an AI API here, e.g.:
  // const response = await fetch('https://api.anthropic.com/v1/messages', { ... })
  // and use it to re-order or filter `ruleBasedMatches` based on
  // description similarity, not just category/location/date overlap.

  // For now, just return the rule-based matches unchanged.
  return ruleBasedMatches;
}

// Future AI feature idea: auto-suggest a category from a photo/description
async function suggestCategory(description) {
  // TODO
  return null;
}

module.exports = { rerank, suggestCategory };
