const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\94ece90f-1a08-4a85-9fc6-cec59458b019';
const targetDir = 'c:\\Users\\HP\\Documents\\ShopAida';

// Map of partial artifact name to the products.json image path (without extension)
const mapping = {
  'perfume_niche': 'images/fragrances/perfume-niche',
  'perfume_designers': 'images/fragrances/perfume-designers',
  'perfume_arabian': 'images/fragrances/perfume-arabian',
  'body_mist_victoria': 'images/fragrances/body-mist-victoria-s-secret',
  'body_mist_bath': 'images/fragrances/body-mist-bath-body',
  'candle_single_wick': 'images/fragrances/candle-single-wick',
  'candle_three_wick': 'images/fragrances/candle-3-wick',
  'home_diffuser': 'images/fragrances/home-diffuser',
  'room_fragrance': 'images/fragrances/concentrated-room-fragrance',
  'hand_soap': 'images/fragrances/hand-soap',
  'sanitizer': 'images/fragrances/sanitizer',
  'body_lotion': 'images/body-care/body-lotion-nourishing',
  'body_oil': 'images/body-care/body-oil-hydrating',
  'brazilian_body_wave': 'images/hairs/brazilian-body-wave',
  'peruvian_straight': 'images/hairs/peruvian-straight',
  'malaysian_curly': 'images/hairs/malaysian-curly'
};

const artifacts = fs.readdirSync(srcDir);

let productsJsonStr = fs.readFileSync(path.join(targetDir, 'products.json'), 'utf8');

for (const [key, destPath] of Object.entries(mapping)) {
  const matchedFile = artifacts.find(f => f.startsWith(key + '_') && f.endsWith('.png'));
  if (matchedFile) {
    const srcPath = path.join(srcDir, matchedFile);
    const destFullPath = path.join(targetDir, destPath + '.png');
    
    fs.mkdirSync(path.dirname(destFullPath), { recursive: true });
    fs.copyFileSync(srcPath, destFullPath);
    
    productsJsonStr = productsJsonStr.split(destPath + '.jpg').join(destPath + '.png');
    
    console.log(`Copied ${matchedFile} to ${destPath}.png`);
  }
}

fs.writeFileSync(path.join(targetDir, 'products.json'), productsJsonStr);
console.log('Finished updating images and products.json');
