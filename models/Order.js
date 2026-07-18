// models/Order.js - Order schema for payment history
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: Number,
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['paypal', 'paystack', 'stripe', 'card', 'bank_transfer'],
    required: true
  },
  paymentReference: String,
  
  // Shipping info
  shippingAddress: {
    firstName: String,
    lastName: String,
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    phone: String
  },
  
  // Metadata
  metadata: {},
  notes: String,
  
  // Events Trail
  events: [{
    status: { type: String, required: true },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ paymentReference: 1 });
OrderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', OrderSchema);
