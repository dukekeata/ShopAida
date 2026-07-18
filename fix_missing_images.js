const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\HP\\Documents\\ShopAida';

const map = {
  // Use Straight Hair
  'images/hairs/closure-wig': 'images/hairs/peruvian-straight.png',
  'images/hairs/kinky-straight': 'images/hairs/peruvian-straight.png',
  'images/hairs/lace-frontal': 'images/hairs/peruvian-straight.png',
  'images/hairs/silk-straight': 'images/hairs/peruvian-straight.png',
  'images/hairs/pixie-cut-wig': 'images/hairs/peruvian-straight.png',
  'images/hairs/bone-straight-strands-10': 'images/hairs/peruvian-straight.png',
  
  // Use Wavy Hair
  'images/hairs/deep-wave-bundle': 'images/hairs/brazilian-body-wave.png',
  'images/hairs/water-wave': 'images/hairs/brazilian-body-wave.png',
  'images/hairs/loose-deep': 'images/hairs/brazilian-body-wave.png',
  'images/hairs/bouncy-wavy-strands-10': 'images/hairs/brazilian-body-wave.png',
  
  // Use Curly Hair
  'images/hairs/afro-puff': 'images/hairs/malaysian-curly.png',
  'images/hairs/curly-strands-10': 'images/hairs/malaysian-curly.png',

  // Hair food (I will use body oil as fallback since it's a bottle)
  'images/hairs/hair-food-growth-serum': 'images/body-care/body-oil-hydrating.png'
};

let productsJsonStr = fs.readFileSync(path.join(targetDir, 'products.json'), 'utf8');

for (const [key, destImg] of Object.entries(map)) {
  const replaceRegex = new RegExp(key.replace(/\//g, '\\\\/') + '\\.jpg', 'g');
  productsJsonStr = productsJsonStr.replace(replaceRegex, destImg);
}

fs.writeFileSync(path.join(targetDir, 'products.json'), productsJsonStr);
console.log('Fixed products.json missing images');
