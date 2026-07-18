const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\94ece90f-1a08-4a85-9fc6-cec59458b019';
const hairsDir = path.join(__dirname, 'images', 'hairs');
const bannersDir = path.join(__dirname, 'images', 'banners');

if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true });

// Map of generated image prefix to product name/ID and new filename
const imageMappings = [
  { prefix: 'hair_closure_wig_', targetId: 4, dest: 'closure-wig.png' },
  { prefix: 'hair_deep_wave_bundle_', targetId: 5, dest: 'deep-wave-bundle.png' },
  { prefix: 'hair_kinky_straight_', targetId: 6, dest: 'kinky-straight.png' },
  { prefix: 'hair_lace_frontal_', targetId: 7, dest: 'lace-frontal.png' },
  { prefix: 'hair_afro_puff_', targetId: 8, dest: 'afro-puff.png' },
  { prefix: 'hair_silk_straight_', targetId: 9, dest: 'silk-straight.png' },
  { prefix: 'hair_water_wave_', targetId: 10, dest: 'water-wave.png' },
  { prefix: 'hair_pixie_cut_wig_', targetId: 11, dest: 'pixie-cut-wig.png' },
  { prefix: 'hair_loose_deep_', targetId: 12, dest: 'loose-deep.png' },
  { prefix: 'hair_food_serum_', targetId: 26, dest: 'hair-food-serum.png' }
];

const bannerMappings = [
  { prefix: 'hero_spring_collection_', dest: 'hero-spring.png' },
  { prefix: 'hero_new_arrivals_', dest: 'hero-new.png' },
  { prefix: 'hero_gift_edit_', dest: 'hero-gift.png' }
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

  // 2. Copy Banner Images
  for (const mapping of bannerMappings) {
    const file = files.find(f => f.startsWith(mapping.prefix) && f.endsWith('.png'));
    if (file) {
      const srcPath = path.join(artifactsDir, file);
      const destPath = path.join(bannersDir, mapping.dest);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied banner ${file} to ${mapping.dest}`);
    }
  }

  // 3. Update products.json
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

  // 4. Update MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    for (const mapping of imageMappings) {
      // Find product by metadata.originalId
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
