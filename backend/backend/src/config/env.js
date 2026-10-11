// Reads .env once, validates the critical values, and exports a clean object.
// Every other file imports FROM HERE instead of touching process.env directly —
// that way, if a required variable is missing, the app fails at startup
// with a clear message instead of crashing randomly later.

require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    // Fail fast: better to crash on startup than misbehave at 2am.
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || null,
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,

  // Comma-separated list of allowed frontend origins, e.g.
  // "http://localhost:3000,https://your-app.vercel.app"
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim()),

  aiMatchingEnabled: process.env.AI_MATCHING_ENABLED === 'true',
};
