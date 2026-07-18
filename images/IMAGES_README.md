# ShopAida Product Images - Organization Guide

## Directory Structure

```
images/
├── logo-mark.png          # ShopAida brand logo
├── logo-mark.svg          # ShopAida logo vector
│
├── hairs/                 # Hair products category
│   ├── brazilian-body-wave.jpg
│   ├── peruvian-straight.jpg
│   ├── malaysian-curly.jpg
│   ├── closure-wig.jpg
│   ├── deep-wave-bundle.jpg
│   ├── kinky-straight.jpg
│   ├── lace-frontal.jpg
│   ├── afro-puff.jpg
│   ├── silk-straight.jpg
│   ├── water-wave.jpg
│   ├── pixie-cut-wig.jpg
│   ├── loose-deep.jpg
│   ├── hair-food-growth-serum.jpg
│   ├── bone-straight-strands-10.jpg
│   ├── bouncy-wavy-strands-10.jpg
│   └── curly-strands-10.jpg
│
├── fragrances/            # Fragrances category
│   ├── perfume-niche.jpg
│   ├── perfume-designers.jpg
│   ├── perfume-arabian.jpg
│   ├── body-mist-victorias-secret.jpg
│   ├── body-mist-bath-body.jpg
│   ├── candle-single-wick.jpg
│   ├── candle-3-wick.jpg
│   ├── home-diffuser.jpg
│   ├── concentrated-room-fragrance.jpg
│   ├── hand-soap.jpg
│   └── sanitizer.jpg
│
└── body-care/             # Body care products
    ├── body-lotion-nourishing.jpg
    └── body-oil-hydrating.jpg
```

## Product Image Sources

### Current Implementation
All product images are currently sourced from **Unsplash** (free, high-quality stock photography). This provides:
- ✅ High-quality professional images
- ✅ No licensing concerns
- ✅ Consistent visual style
- ✅ Fast loading (CDN-cached)
- ✅ No server storage required

### Image URLs in products.json
Each product references images via Unsplash URLs:
```json
{
  "id": 1,
  "name": "Brazilian Body Wave",
  "price": 60,
  "image": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80",
  "category": "Hairs",
  "subcategory": "Bouncy wavy strands"
}
```

## Image Categories

### Hair Products (IDs 1-12, 26-29)
- Body waves and wavy textures
- Straight strand variations
- Curly and textured styles
- Closure wigs and frontal pieces

**Products:** 16 total
- Bouncy wavy strands: IDs 1, 5, 10, 12, 28
- Bone straight strands: IDs 2, 6, 9, 27
- Curly strands: IDs 3, 8, 29
- Closures: IDs 4, 7, 11
- Hair serums: ID 26

### Fragrances (IDs 13-23)
- Niche, designer, and Arabian perfumes
- Body mists (Victoria's Secret, Bath & Body)
- Candles (single and 3-wick)
- Diffusers and room fragrances
- Hand soaps and sanitizers

**Products:** 11 total

### Body Care (IDs 24-25)
- Nourishing lotions
- Hydrating body oils

**Products:** 2 total

## Download & Local Storage (Optional)

If you want to download and store images locally instead of using Unsplash URLs:

1. Create image files in each category subdirectory
2. Update `products.json` image URLs from Unsplash CDN to local paths:
   ```json
   "image": "/images/hairs/brazilian-body-wave.jpg"
   ```
3. Ensure image files are optimized (compressed, ~100-200KB max per image)

**Benefits of local storage:**
- No external CDN dependency
- Faster loading on slow connections (no redirect)
- Full control over image versions

**Trade-offs:**
- Larger project size (~5-10MB for all product images)
- Requires image optimization
- Need to manage image assets separately

## Image Specifications

### Recommended Image Properties
- **Format:** JPG (quality: 80-85) or WebP
- **Dimensions:** 400x400px (square) for consistency
- **File Size:** 50-150KB per image
- **Color Space:** sRGB
- **Aspect Ratio:** 1:1 (square)

### Current Unsplash URLs
All URLs include optimization parameters:
- `auto=format` - Automatic format selection (WebP for supported browsers)
- `fit=crop` - Smart crop to maintain aspect ratio
- `w=400` - 400px width
- `q=80` - 80% quality (optimized balance)

## Adding New Products

1. Add product to `products.json` with Unsplash image URL
2. If storing locally, add image file to appropriate category subfolder
3. Update image URL in products.json:
   ```json
   "image": "/images/fragrances/new-perfume.jpg"
   ```
4. Ensure image is optimized before uploading

## Testing Image Display

All product images are automatically displayed on:
- **Homepage** - Product carousels (Unsplash images)
- **Product pages** - Individual product details
- **Category pages** - Category gallery cards
- **Search results** - Product grid with filter results

## Future Enhancements

- [ ] Implement image lazy loading for faster page load
- [ ] Add product image hover effects (gallery carousel)
- [ ] Create image thumbnails for mobile optimization
- [ ] Setup image CDN for even faster delivery
- [ ] Add admin panel for image uploads
