const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const itemsRoutes = require('./routes/items.routes');
const claimsRoutes = require('./routes/claims.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// --- Security & parsing middleware (runs on every request) ---
app.use(helmet()); // sets safe HTTP headers
app.use(cors()); // allow the frontend's origin to call this API
app.use(express.json({ limit: '2mb' })); // parse JSON bodies
app.use(morgan('dev')); // log each request to the console

// Basic protection against spam/abuse — tune per route later if needed
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // requests per IP per window
  })
);

// --- Health check (useful for deployment platforms) ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/items', itemsRoutes);
app.use('/items/:id/claims', claimsRoutes); // nested: POST/GET /items/:id/claims
app.use('/claims', claimsRoutes.reviewRouter); // PATCH /claims/:id

// --- 404 for anything unmatched ---
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// --- Error handler (MUST be last) ---
app.use(errorHandler);

module.exports = app;
