const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    images: [
      {
        type: String,
        trim: true
      }
    ],
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

ProductSchema.index({ name: 'text', description: 'text', category: 1, tags: 1 });

module.exports = mongoose.model('Product', ProductSchema);
