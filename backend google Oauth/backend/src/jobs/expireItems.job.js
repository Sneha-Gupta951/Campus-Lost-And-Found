// Runs on a schedule (wired up in server.js with node-cron) to close out
// old unclaimed posts, matching the expiry policy from the requirements.
const db = require('../config/db');

async function expireOldItems() {
  const result = await db.query(
    `UPDATE items
     SET status = 'expired'
     WHERE status = 'open' AND expires_at < now()
     RETURNING id`
  );
  console.log(`[expireItems] Expired ${result.rowCount} item(s)`);
  return result.rowCount;
}

module.exports = expireOldItems;

// Allows running manually: npm run job:expire
if (require.main === module) {
  expireOldItems()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
