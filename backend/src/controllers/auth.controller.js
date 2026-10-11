const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { generateOtp, hashOtp } = require('../utils/otp');
const { domainCanReceiveEmail } = require('../utils/emailDomainCheck');
const { verifyGoogleToken } = require('../utils/googleAuth');
const emailService = require('../services/email.service');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOtpSchema,
  googleAuthSchema,
} = require('../validators/auth.validators');

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

// Creates a fresh OTP row and emails it. Reused by register and resend.
async function issueOtp(user) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.query(
    `INSERT INTO email_verifications (user_id, otp_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashOtp(otp), expiresAt]
  );

  await emailService.sendOtpEmail(user.email, otp);
}

function signToken(user) {
  // "sub" (subject) is the standard JWT field for "who is this token about"
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

// Strip password_hash before ever sending a user object back to the client
function toPublicUser(row) {
  const { password_hash, ...publicUser } = row;
  return publicUser;
}

async function register(req, res) {
  const { name, email, password } = registerSchema.parse(req.body);

  if (env.allowedEmailDomain && !email.endsWith(`@${env.allowedEmailDomain}`)) {
    throw new ApiError(400, 'INVALID_EMAIL_DOMAIN', `Use your @${env.allowedEmailDomain} email`);
  }

  // Catches typo'd domains (e.g. mitsgwll.ac.in) before wasting an OTP send.
  // Skipped automatically in tests/offline dev if you want — see note below.
  const deliverable = await domainCanReceiveEmail(email);
  if (!deliverable) {
    throw new ApiError(400, 'EMAIL_DOMAIN_UNREACHABLE', 'This email domain cannot receive mail — check for typos');
  }

  const existing = await db.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing.rows.length > 0) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, email, passwordHash]
  );

  const user = toPublicUser(result.rows[0]);

  // No token yet — the account exists but can't log in until verified.
  await issueOtp(user);

  return new ApiResponse(201, {
    user,
    message: 'Account created. Check your email for a 6-digit verification code.',
  }).send(res);
}

async function verifyEmail(req, res) {
  const { email, otp } = verifyEmailSchema.parse(req.body);

  const userResult = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const userRow = userResult.rows[0];
  if (!userRow) throw new ApiError(404, 'USER_NOT_FOUND', 'No account with this email');
  if (userRow.email_verified) throw new ApiError(400, 'ALREADY_VERIFIED', 'Email is already verified');

  const otpResult = await db.query(
    `SELECT * FROM email_verifications
     WHERE user_id = $1 AND consumed = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [userRow.id]
  );
  const record = otpResult.rows[0];

  if (!record) {
    throw new ApiError(400, 'NO_OTP_PENDING', 'Request a new code first');
  }
  if (new Date(record.expires_at) < new Date()) {
    throw new ApiError(400, 'OTP_EXPIRED', 'This code has expired, request a new one');
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Too many wrong attempts, request a new code');
  }

  if (hashOtp(otp) !== record.otp_hash) {
    await db.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1', [
      record.id,
    ]);
    throw new ApiError(400, 'INVALID_OTP', 'Incorrect code');
  }

  // Correct code: mark it used, mark the user verified — in one transaction
  // so a crash between the two can't leave things half-done.
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE email_verifications SET consumed = true WHERE id = $1', [record.id]);
    await client.query('UPDATE users SET email_verified = true WHERE id = $1', [userRow.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const user = toPublicUser({ ...userRow, email_verified: true });
  const token = signToken(user);

  return new ApiResponse(200, { user, token, message: 'Email verified' }).send(res);
}

async function resendOtp(req, res) {
  const { email } = resendOtpSchema.parse(req.body);

  const result = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const userRow = result.rows[0];

  // Same response whether the account exists or not — don't leak which
  // emails are registered.
  if (userRow && !userRow.email_verified) {
    await issueOtp(toPublicUser(userRow));
  }

  return new ApiResponse(200, {
    message: 'If that account exists and is unverified, a new code has been sent.',
  }).send(res);
}

async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);

  const result = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const userRow = result.rows[0];

  // Same error for "no such user" and "wrong password" — don't tell an
  // attacker which one it was.
  if (!userRow) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  }

  const passwordMatches = await bcrypt.compare(password, userRow.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  }

  if (userRow.is_banned) {
    throw new ApiError(403, 'ACCOUNT_BANNED', 'This account has been banned');
  }

  // The core of "only verified students can log in"
  if (!userRow.email_verified) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
  }

  const user = toPublicUser(userRow);
  const token = signToken(user);

  return new ApiResponse(200, { user, token }).send(res);
}

async function googleLogin(req, res) {
  const { id_token } = googleAuthSchema.parse(req.body);

  let payload;
  try {
    payload = await verifyGoogleToken(id_token);
  } catch (err) {
    throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Could not verify Google login');
  }

  // Google itself confirms this account belongs to the Workspace domain —
  // this is stronger than our own domain-suffix check, since Google
  // already did the hard work of tying the account to that organization.
  if (payload.hd !== env.allowedEmailDomain) {
    throw new ApiError(403, 'WRONG_GOOGLE_WORKSPACE', `Use your @${env.allowedEmailDomain} Google account`);
  }
  if (!payload.email_verified) {
    throw new ApiError(403, 'GOOGLE_EMAIL_NOT_VERIFIED', 'Your Google email is not verified');
  }

  // Look up by google_id first (fastest path for returning users)
  let result = await db.query('SELECT * FROM users WHERE google_id = $1', [payload.sub]);
  let userRow = result.rows[0];

  if (!userRow) {
    // Not seen this Google account before — check if they already have a
    // password-based account with the same email, and link the two.
    result = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [payload.email]);
    userRow = result.rows[0];

    if (userRow) {
      const linked = await db.query(
        `UPDATE users SET google_id = $1, email_verified = true WHERE id = $2 RETURNING *`,
        [payload.sub, userRow.id]
      );
      userRow = linked.rows[0];
    } else {
      // Brand new user — Google already verified their identity, so they
      // start out email_verified = true. No OTP needed for this path.
      const created = await db.query(
        `INSERT INTO users (name, email, google_id, email_verified)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [payload.name || payload.email.split('@')[0], payload.email, payload.sub]
      );
      userRow = created.rows[0];
    }
  }

  if (userRow.is_banned) {
    throw new ApiError(403, 'ACCOUNT_BANNED', 'This account has been banned');
  }

  const user = toPublicUser(userRow);
  const token = signToken(user);

  return new ApiResponse(200, { user, token }).send(res);
}

async function me(req, res) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return new ApiResponse(200, { user: toPublicUser(result.rows[0]) }).send(res);
}

module.exports = { register, login, me, verifyEmail, resendOtp, googleLogin };
