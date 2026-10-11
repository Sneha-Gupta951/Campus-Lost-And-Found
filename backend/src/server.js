const cron = require('node-cron');
const app = require('./app');
const env = require('./config/env');
const expireOldItems = require('./jobs/expireItems.job');

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Run the expiry job once a day at 2am
cron.schedule('0 2 * * *', () => {
  expireOldItems().catch((err) => console.error('Expiry job failed', err));
});
