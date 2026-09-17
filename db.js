// db.js - Database connection and initialization
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shopaida';
    const options = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 20,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(mongoUri, options);

    console.log('✅ MongoDB connected successfully');
    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
};

module.exports = connectDB;
