const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const { authMiddleware } = require('../middleware/authMiddleware');
const { generateToken } = require('../utils/jwt');
const { sanitizationMiddleware, sanitizeEmail } = require('../utils/sanitizer');
const { validateRegister, validateLogin } = require('../middleware/validateRequest');
const memoryStore = require('../utils/memoryStore');

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizationMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

async function recordLoginAttempt({ email, userId, success, ip, userAgent }) {
  const attemptData = {
    email: email || '',
    userId: userId || null,
    success: Boolean(success),
    ip: ip || '',
    userAgent: userAgent || '',
    timestamp: new Date()
  };

  const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;
  if (useMemoryStore) {
    return memoryStore.createLoginAttempt(attemptData);
  }

  return LoginAttempt.create(attemptData);
}

function setAuthCookie(res, token) {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

// Register
router.post('/register', authLimiter, validateRegister, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const sanitizedEmail = sanitizeEmail(email);

    // Check if MongoDB is available
    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;

    if (useMemoryStore) {
      // Use in-memory storage (development without MongoDB)
      const existingUser = await memoryStore.findUserByEmail(sanitizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const user = await memoryStore.createUser({
        email: sanitizedEmail,
        password,
        firstName: firstName || '',
        lastName: lastName || ''
      });

      const token = generateToken(user._id, user.email, user.role || 'user');
      setAuthCookie(res, token);

      res.status(201).json({
        message: 'User registered successfully (in-memory mode)',
        token,
        user: memoryStore.getUserData(user)
      });
    } else {
      // Use MongoDB
      const existingUser = await User.findOne({ email: sanitizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const user = new User({
        email: sanitizedEmail,
        password,
        firstName: firstName || '',
        lastName: lastName || '',
        oauthProvider: 'local',
        role: 'user'
      });

      await user.save();

      const token = generateToken(user._id, user.email);
      setAuthCookie(res, token);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: user.toJSON()
      });
    }
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', authLimiter, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const sanitizedEmail = sanitizeEmail(email);

    // Check if MongoDB is available
    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;

    if (useMemoryStore) {
      // Use in-memory storage
      const user = await memoryStore.findUserByEmail(sanitizedEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await memoryStore.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is disabled' });
      }

      const token = generateToken(user._id, user.email);
      setAuthCookie(res, token);

      await recordLoginAttempt({
        email: sanitizedEmail,
        userId: user._id || user.id,
        success: true,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || ''
      });

      res.json({
        message: 'Login successful',
        token,
        user: memoryStore.getUserData(user)
      });
    } else {
      // Use MongoDB
      const user = await User.findOne({ email: sanitizedEmail }).select('+password');
      if (!user || user.oauthProvider !== 'local') {
        await recordLoginAttempt({
          email: sanitizedEmail,
          userId: null,
          success: false,
          ip: req.ip,
          userAgent: req.headers['user-agent'] || ''
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        await recordLoginAttempt({
          email: sanitizedEmail,
          userId: user._id,
          success: false,
          ip: req.ip,
          userAgent: req.headers['user-agent'] || ''
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.isActive) {
        await recordLoginAttempt({
          email: sanitizedEmail,
          userId: user._id,
          success: false,
          ip: req.ip,
          userAgent: req.headers['user-agent'] || ''
        });
        return res.status(403).json({ error: 'Account is disabled' });
      }

      const token = generateToken(user._id, user.email, user.role || 'user');
      setAuthCookie(res, token);

      await recordLoginAttempt({
        email: sanitizedEmail,
        userId: user._id,
        success: true,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || ''
      });

      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON()
      });
    }
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ message: 'Logged out successfully' });
});

// Current user
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;

    if (useMemoryStore) {
      const user = await memoryStore.findUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(memoryStore.getUserData(user));
    } else {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user.toJSON());
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
