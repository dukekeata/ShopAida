const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = req.cookies?.authToken;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(401).json({ error: 'Invalid authentication token' });
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
    // Ignore invalid tokens for optional auth
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuth
};
