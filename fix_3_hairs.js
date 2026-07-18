const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\94ece90f-1a08-4a85-9fc6-cec59458b019';
const hairsDir = path.join(__dirname, 'images', 'hairs');

const imageMappings = [
  { prefix: 'hair_curly_strands_', targetId: 29, dest: 'curly-strands.png' },
  { prefix: 'hair_bouncy_wavy_', targetId: 28, dest: 'bouncy-wavy.png' },
  { prefix: 'hair_bone_straight_', targetId: 27, dest: 'bone-straight.png' }
];

async function updateImages() {
  const files = fs.readdirSync(artifactsDir);

  // 1. Copy Hair Images
  for (const mapping of imageMappings) {
    const file = files.find(f => f.startsWith(mapping.prefix) && f.endsWith('.png'));
    if (file) {
      const srcPath = path.join(artifactsDir, file);
      const destPath = path.join(hairsDir, mapping.dest);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file} to ${mapping.dest}`);
    }
  }

  // 2. Update products.json
  const productsPath = path.join(__dirname, 'products.json');
  let products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  for (const mapping of imageMappings) {
    const p = products.find(prod => prod.id === mapping.targetId);
    if (p) {
      p.image = `images/hairs/${mapping.dest}`;
    }
  }
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
  console.log('Updated products.json');

  // 3. Update MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    for (const mapping of imageMappings) {
      const p = await Product.findOne({ 'metadata.originalId': mapping.targetId });
      if (p) {
        p.images = [`images/hairs/${mapping.dest}`];
        await p.save();
        console.log(`Updated DB for Product ID ${mapping.targetId}`);
      }
    }
  } catch (e) {
    console.error('MongoDB update failed:', e.message);
  } finally {
    mongoose.disconnect();
  }
}

updateImages();
