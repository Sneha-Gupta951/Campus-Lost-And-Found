// Verifies the ID token Google's Sign-In button hands to the frontend.
// "Verify" means: check Google's cryptographic signature on the token, so
// we KNOW it really came from Google and wasn't forged by the client.
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');

const client = new OAuth2Client(env.googleClientId);

// Returns the verified payload, or throws if the token is invalid/forged.
async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientId, // must have been issued FOR our app specifically
  });

  const payload = ticket.getPayload();
  // payload contains: email, email_verified, name, sub (Google's user id),
  // hd (the Google Workspace domain, only present for Workspace accounts)
  return payload;
}

module.exports = { verifyGoogleToken };
