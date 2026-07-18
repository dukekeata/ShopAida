const mongoose = require('mongoose');

const LoginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    sparse: true
  },
  success: {
    type: Boolean,
    default: false
  },
  ip: {
    type: String,
    trim: true,
    default: ''
  },
  userAgent: {
    type: String,
    trim: true,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

LoginAttemptSchema.index({ timestamp: -1 });
LoginAttemptSchema.index({ email: 1 });
LoginAttemptSchema.index({ userId: 1 });
LoginAttemptSchema.index({ success: 1 });

module.exports = mongoose.model('LoginAttempt', LoginAttemptSchema);
