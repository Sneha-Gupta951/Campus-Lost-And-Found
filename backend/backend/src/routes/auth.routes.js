const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/verify-email', asyncHandler(authController.verifyEmail));
router.post('/resend-otp', asyncHandler(authController.resendOtp));
router.post('/login', asyncHandler(authController.login));
router.post('/google', asyncHandler(authController.googleLogin));
router.get('/me', authenticate, asyncHandler(authController.me));

module.exports = router;
