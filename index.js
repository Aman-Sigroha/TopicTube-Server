/* eslint-disable no-undef */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigin = process.env.CORS_ORIGIN || (isProd ? 'https://topic-tube.vercel.app' : '*');

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.'
});
app.use('/api/auth', authLimiter);

// Import and use routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running!' });
});

// Global error handler (no stack trace in prod)
/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (isProd) {
    res.status(500).json({ error: 'Something went wrong!' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
}); 