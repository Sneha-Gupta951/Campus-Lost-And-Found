const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const itemsRoutes = require('./routes/items.routes');
const claimsRoutes = require('./routes/claims.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const errorHandler = require('./middleware/errorHandler');
const env = require('./config/env');

const app = express();

// --- Security & parsing middleware (runs on every request) ---
app.use(helmet()); // sets safe HTTP headers

// Only allow requests from our own frontend(s) — not every website on the
// internet. env.frontendUrls comes from FRONTEND_URL in .env.
app.use(cors({
  origin: env.frontendUrls,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' })); // parse JSON bodies
app.use(morgan('dev')); // log each request to the console

// General protection against spam/abuse across the whole API
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // requests per IP per window
  })
);

// Stricter limit specifically on login/register — these are the routes
// someone would try to brute-force or spam, so they get a tighter cap.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per IP per 15 minutes
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts, try again later' } },
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/google', authLimiter);

// --- Health check (useful for deployment platforms) ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/items', itemsRoutes);
app.use('/items/:id/claims', claimsRoutes); // nested: POST/GET /items/:id/claims
app.use('/claims', claimsRoutes.reviewRouter); // PATCH /claims/:id, GET /claims/received, /claims/mine
app.use('/notifications', notificationsRoutes);

// --- 404 for anything unmatched ---
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// --- Error handler (MUST be last) ---
app.use(errorHandler);

module.exports = app;
