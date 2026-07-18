// middleware/auth.js - JWT authentication middleware
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = req.cookies?.authToken;
    }

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = req.cookies?.authToken;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (err) {
    // Silently fail - user is optional
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuth
};
