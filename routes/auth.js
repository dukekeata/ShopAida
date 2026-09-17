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
  max: 50,
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
    const useMemoryStore = (memoryStore.isEnabled() || process.env.NODE_ENV !== 'production') && mongoose.connection.readyState !== 1;

    if (mongoose.connection.readyState !== 1 && !useMemoryStore) {
      return res.status(503).json({
        error: 'Database connection currently unavailable. Please verify MONGODB_URI on Render environment variables and MongoDB Atlas IP Whitelist (0.0.0.0/0).'
      });
    }

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
    const useMemoryStore = (memoryStore.isEnabled() || process.env.NODE_ENV !== 'production') && mongoose.connection.readyState !== 1;

    if (mongoose.connection.readyState !== 1 && !useMemoryStore) {
      return res.status(503).json({
        error: 'Database connection currently unavailable. Please verify MONGODB_URI on Render environment variables and MongoDB Atlas IP Whitelist (0.0.0.0/0).'
      });
    }

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

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendPasswordResetEmail } = require('../utils/email');
const { validateForgotPassword, validateResetPassword } = require('../middleware/validateRequest');

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

// Update Profile
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;

    if (useMemoryStore) {
      const user = await memoryStore.findUserById(req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (address !== undefined) user.address = address;
      return res.json({ message: 'Profile updated successfully', user: memoryStore.getUserData(user) });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    await user.save();

    res.json({ message: 'Profile updated successfully', user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// Forgot Password
router.post('/forgot-password', validateForgotPassword, async (req, res, next) => {
  try {
    const { email } = req.body;
    const sanitizedEmail = sanitizeEmail(email);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;

    if (useMemoryStore) {
      const user = await memoryStore.findUserByEmail(sanitizedEmail);
      if (user) {
        user.passwordResetToken = resetToken;
        user.passwordResetExpiry = resetExpiry;
      }
    } else {
      const user = await User.findOne({ email: sanitizedEmail });
      if (user) {
        user.passwordResetToken = resetToken;
        user.passwordResetExpiry = resetExpiry;
        await user.save();
      }
    }

    const resetUrl = `${req.protocol}://${req.get('host')}/login.html?token=${resetToken}`;
    await sendPasswordResetEmail(sanitizedEmail, resetToken, resetUrl);

    res.json({
      message: 'If an account with that email exists, a password reset email has been sent.',
      resetToken // included in response for dev testing
    });
  } catch (err) {
    next(err);
  }
});

// Reset Password
router.post('/reset-password', validateResetPassword, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;

    if (useMemoryStore) {
      let foundUser = null;
      for (const u of memoryStore.users.values()) {
        if (u.passwordResetToken === token && u.passwordResetExpiry > new Date()) {
          foundUser = u;
          break;
        }
      }
      if (!foundUser) {
        return res.status(400).json({ error: 'Invalid or expired password reset token' });
      }

      const salt = await bcrypt.genSalt(10);
      foundUser.password = await bcrypt.hash(password, salt);
      foundUser.passwordResetToken = undefined;
      foundUser.passwordResetExpiry = undefined;

      return res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
