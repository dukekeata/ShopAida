require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('./models/Product');

async function seedProducts() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in .env');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB');

    // Read products.json
    const productsPath = path.join(__dirname, 'products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

    // Clear existing products and indexes
    await Product.deleteMany({});
    try {
      await Product.collection.dropIndexes();
    } catch (e) {
      console.log('No indexes to drop or error dropping indexes:', e.message);
    }
    console.log('Cleared existing products in DB');

    // Prepare data
    const productsToInsert = productsData.map(p => ({
      _id: new mongoose.Types.ObjectId(), // generate new ID or use mapped string if needed
      name: p.name,
      description: p.description || '',
      price: p.price,
      currency: 'NGN',
      category: p.category || 'General',
      tags: p.subcategory ? [p.subcategory] : [],
      images: p.image ? [p.image] : [],
      stock: 100, // default stock
      isActive: true,
      metadata: { originalId: p.id } // keeping original ID for reference just in case
    }));

    await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${productsToInsert.length} products`);

  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedProducts();
