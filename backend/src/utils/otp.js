const crypto = require('crypto');

// 6-digit numeric code, easy for a student to type on a phone
function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

// We hash the OTP before saving it (same idea as password hashing) so that
// even if the database leaks, nobody can read out valid codes.
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

module.exports = { generateOtp, hashOtp };
