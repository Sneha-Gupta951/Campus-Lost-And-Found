const { z } = require('zod');

// zod describes the SHAPE of valid input. If the request doesn't match,
// .parse() throws a ZodError automatically — errorHandler.js turns that
// into a clean 400 response. The controller never has to check "is this
// field missing?" by hand.
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const resendOtpSchema = z.object({
  email: z.string().email(),
});

const googleAuthSchema = z.object({
  id_token: z.string().min(10),
});

module.exports = { registerSchema, loginSchema, verifyEmailSchema, resendOtpSchema, googleAuthSchema };
