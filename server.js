// server.js - Secure Express server with authentication and payment integration
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Database and models
const connectDB = require('./db');

// Middleware and utilities
const errorHandler = require('./middleware/errorHandler');
const { sanitizationMiddleware } = require('./utils/sanitizer');
const User = require('./models/User');
const memoryStore = require('./utils/memoryStore');

const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@shopaida.test';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';

async function ensureDefaultAdmin() {
  const adminEmail = DEFAULT_ADMIN_EMAIL.toLowerCase().trim();
  const adminData = {
    email: adminEmail,
    password: DEFAULT_ADMIN_PASSWORD,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    emailVerified: true,
    isActive: true
  };

  if (memoryStore.isEnabled()) {
    const existing = await memoryStore.findUserByEmail(adminEmail);
    if (!existing) {
      await memoryStore.createUser(adminData);
      console.log(`✅ Default admin created: ${adminEmail} / ${DEFAULT_ADMIN_PASSWORD}`);
    } else if (existing.role !== 'admin' || !existing.emailVerified) {
      existing.role = 'admin';
      existing.emailVerified = true;
      existing.isActive = true;
    }
    return;
  }

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    if (existing.role !== 'admin' || !existing.emailVerified) {
      existing.role = 'admin';
      existing.emailVerified = true;
      existing.isActive = true;
      await existing.save();
      console.log(`✅ Updated existing user to admin: ${adminEmail}`);
    }
    return;
  }

  const admin = new User(adminData);
  await admin.save();
  console.log(`✅ Default admin created: ${adminEmail} / ${DEFAULT_ADMIN_PASSWORD}`);
}

// Routes
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');
const { requestLogger, errorLogger } = require('./utils/logger');

const app = express();

// ============ SECURITY MIDDLEWARE ============

// Helmet - Security headers (with stricter config)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(cookieParser());

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.PUBLIC_BASE_URL ? [process.env.PUBLIC_BASE_URL.replace(/\/$/, '')] : [])
  : ['http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:5500', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    const staticPaths = ['/health', '/style.css', '/script.js', '/cart.js', '/shared.js', '/products.json'];
    if (staticPaths.includes(req.path)) return true;
    if (req.path.startsWith('/images/') || req.path.startsWith('/category/') || req.path.startsWith('/product/')) return true;
    return false;
  }
});


app.use(globalLimiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Higher limit in development
  skipSuccessfulRequests: true,
  message: JSON.stringify({ error: 'Too many login/register attempts, please try again later.' }),
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login/register attempts, please try again later.' });
  }
});

app.use('/api/auth', authLimiter);

// Stricter rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: 'Too many payment requests, please try again later.'
});

app.use('/api/payments', paymentLimiter);

// Body parser with size limits
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/payments/stripe/webhook') {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use(requestLogger);

// Input sanitization middleware
app.use(sanitizationMiddleware);

// Security headers - Additional custom headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/auth', oauthRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ STATIC FRONTEND MOUNTING ============
// Serve static assets individually or via specified folders to prevent exposing sensitive files (.env, package.json, etc.)
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/category', express.static(path.join(__dirname, 'category')));
app.use('/product', express.static(path.join(__dirname, 'product')));
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/script.js', express.static(path.join(__dirname, 'script.js')));
app.use('/cart.js', express.static(path.join(__dirname, 'cart.js')));
app.use('/shared.js', express.static(path.join(__dirname, 'shared.js')));
app.use('/products.json', express.static(path.join(__dirname, 'products.json')));

// Specific HTML pages
const frontendPages = [
  'index.html', 'login.html', 'register.html', 'cart.html',
  'categories.html', 'profile.html', 'admin.html',
  'order-success.html', 'auth-success.html'
];
frontendPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, page));
  });
});
// Root serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ ERROR HANDLING ============
app.use(errorLogger);
app.use(errorHandler);

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============ DATABASE & SERVER STARTUP ============
// ============ ENVIRONMENT VALIDATION ============
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required');
  console.error('Please create a .env file with JWT_SECRET=your-secret-key');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // Connect to database
    await connectDB();
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    const allowNoDb = process.env.ALLOW_NO_DB === 'true' || !isProd;

    if (!allowNoDb) {
      console.error('❌ Failed to start server:', err.message);
      process.exit(1);
    }

    console.warn('⚠️  Starting server without MongoDB');
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      await ensureDefaultAdmin();
    } catch (err) {
      console.warn('⚠️ Default admin setup failed:', err.message);
    }
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})();

module.exports = app;

