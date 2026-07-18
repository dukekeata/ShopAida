const fs = require('fs');
const path = require('path');

// simple file log in case console output isn't visible in this environment
const logPath = path.join(__dirname, 'generate_product_pages.log');
function log(msg) {
  try { fs.writeFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' }); } catch (e) { /* ignore */ }
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const products = await Product.find();
  console.log('generate_product_pages.js: loaded ' + products.length + ' products from MongoDB');
  log('loaded ' + products.length + ' products from MongoDB');

const outDir = path.join(__dirname, 'product');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const siteRoot = 'https://example.com'; // replace if you have a live URL
const pages = [];

try {
    products.forEach(p => {
      // Normalize p like script.js does
      const product = {
        ...p._doc,
        id: (p.metadata && p.metadata.originalId) ? p.metadata.originalId : (p._id || p.id),
        image: (p.images && p.images.length ? p.images[0] : (p.image || '')),
        subcategory: p.subcategory || (p.tags && p.tags.length ? p.tags[0] : '')
      };

      const slug = slugify(product.name);
      const filename = `${product.id}-${slug}.html`;
      const filepath = path.join(outDir, filename);
      const url = `${siteRoot}/product/${filename}`;

      const title = `${product.description || product.name} | ShopAida`;
      const description = `Buy ${product.description || product.name} in ${product.category}. Price: ₦${product.price}. Shop now at ShopAida.`;

      const imgUrl = product.image.startsWith('http') ? product.image : `../${product.image}`;

      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(product.name)}, ${escapeHtml(product.category)}, ${escapeHtml(product.subcategory)}, ShopAida" />
  <link rel="canonical" href="${url}">
  <link rel="stylesheet" href="../style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
  <header>
    <div class="navbar">
      <div class="logo"><a href="../index.html" class="logo-link"><img src="../images/logo-mark.png" class="logo-mark" alt="ShopAida mark" /></a> <div><span class="brand">ShopAida</span><div class="logo-tagline">Curated Elegance</div></div></div>
      <nav class="navbar-links">
        <a href="../categories.html">Categories</a> 
        <a href="../index.html">Shop</a>
        <a href="../cart.html"><i class="fas fa-shopping-cart nav-icon"></i>Cart</a>
        <a href="../login.html" id="auth-link"><i class="fas fa-sign-in-alt nav-icon"></i><span id="auth-text">Login</span></a>
      </nav>
    </div>
  </header>
  <main style="max-width:900px;margin:32px auto;padding:0 24px;">
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
      <img src="${imgUrl}" alt="${escapeHtml(product.name)}" loading="lazy" style="width:320px;height:320px;object-fit:cover;border-radius:12px;border:1px solid #eee;" onerror="this.onerror=null;this.src='../images/placeholder.svg';" />
      <div style="flex:1;min-width:300px;">
        <h1 style="color:var(--primary);margin-bottom:8px;">${escapeHtml(product.description || product.name)}</h1>
        <div style="font-size:1rem;color:var(--muted);margin-bottom:12px;">${escapeHtml(product.category)} ${product.subcategory ? '• ' + escapeHtml(product.subcategory) : ''}</div>
        <div style="font-size:1.8rem;font-weight:700;margin-bottom:20px;color:var(--text);" id="product-price">₦${new Intl.NumberFormat('en-NG').format(product.price)}</div>
        <button class="add-btn" onclick="addToCart('${product.id}')" style="max-width:240px;">Add to Cart</button>
        <div style="margin-top:24px;color:var(--muted);font-size:0.95rem;line-height:1.6;">
          <p><i class="fas fa-truck" style="margin-right:8px;"></i>Free shipping on orders over ₦100,000</p>
          <p><i class="fas fa-shield-alt" style="margin-right:8px;"></i>Secure payment processing</p>
          <p><i class="fas fa-undo" style="margin-right:8px;"></i>Satisfaction guaranteed</p>
        </div>
      </div>
    </div>

    <section style="margin-top:40px;border-top:1px solid #eee;padding-top:24px;">
      <h2 style="margin-bottom:12px;">About this product</h2>
      <p style="color:#444;line-height:1.7;">High-quality ${escapeHtml(product.name)} from ShopAida. ${product.subcategory ? escapeHtml(product.subcategory) + ' — ' : ''}perfect for customers seeking premium options in ${escapeHtml(product.category)}.</p>
    </section>
  </main>
  <footer class="footer-content">
    <div class="footer-copy">&copy; 2026 ShopAida. All rights reserved.</div>
  </footer>

  <script src="../shared.js"></script>
  <script>
    // Expose the product data in a predictable place for product pages
    window.__product = {
      id: '${product.id}',
      name: ${JSON.stringify(product.name)},
      price: ${product.price},
      image: ${JSON.stringify(product.image)}
    };
  </script>
  <script src="../script.js"></script>
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": [product.image],
    "description": description,
    "sku": String(product.id),
    "brand": { "@type": "Brand", "name": "ShopAida" },
    "offers": { "@type": "Offer", "url": url, "priceCurrency": "NGN", "price": product.price.toFixed(2), "availability": "https://schema.org/InStock" }
  }, null, 2)}
  </script>
</body>
</html>`;

      console.log('generate_product_pages.js: writing ' + filepath);
      log('writing ' + filepath);
      fs.writeFileSync(filepath, html, 'utf8');
      pages.push({ loc: url, lastmod: new Date().toISOString() });
    });

  // Write sitemap.xml
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(p => `  <url><loc>${p.loc}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n')}
  </urlset>`;
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');
  console.log(`Generated ${pages.length} product pages in ${outDir} and sitemap.xml`);
  log(`Generated ${pages.length} product pages in ${outDir} and sitemap.xml`);
  
  await mongoose.disconnect();
  process.exitCode = 0;
} catch (err) {
  console.error('generate_product_pages.js: Error', err);
  log('error: ' + (err && err.message ? err.message : String(err)));
  await mongoose.disconnect();
  process.exitCode = 1;
}
}

run();

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
