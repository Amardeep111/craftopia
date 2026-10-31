/**
 * Catalog for Jamae's Craftopia.
 * In production, products are served exclusively from the PostgreSQL database via Prisma.
 * The static catalog below is preserved for local seeding and testing.
 */
export const catalogSeedProducts = [
  {
    id: 'honey-bear',
    name: 'Honey Bear',
    category: 'crochet-toys',
    price: 1499,
    featured: true,
    short: 'A snuggly little bear with honey-warm yarn and embroidered eyes.',
    description:
      'Honey Bear is stitched slowly, one loop at a time, with a round tummy made for hugging. Each bear has tiny embroidered features and a ribbon that can be customized in your favourite colour.',
    materials: 'Soft cotton-blend yarn, embroidered details, hypoallergenic filling.',
    care: 'Spot clean gently. Keep away from washing machines and tumble dryers.',
    customization: 'Ribbon colour, size, and a tiny heart on the paw can be customized.',
    visual: 'teddy',
    palette: ['#E8C9A8', '#F3D5D0', '#7A645C'],
    image: 'https://images.unsplash.com/photo-1559563458-527698bf5295?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1559563458-527698bf5295?w=800&q=80',
      'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=800&q=80',
    ],
  },
  {
    id: 'blossom-bunny',
    name: 'Blossom Bunny',
    category: 'crochet-toys',
    price: 1299,
    featured: true,
    short: 'A petal-soft bunny with floppy ears and a flower crown.',
    description:
      'Blossom Bunny is a gentle companion for nurseries, gift boxes, and quiet corners. The flower crown is stitched on by hand and can be made in blush, lavender, or sage.',
    materials: 'Cotton yarn, polyester filling, hand-stitched florals.',
    care: 'Light surface clean only. Avoid soaking.',
    customization: 'Flower colours, ear length, and an optional name tag.',
    visual: 'bunny',
    palette: ['#F7EFE6', '#E8B4B8', '#D9CDE8'],
    image: 'https://images.unsplash.com/photo-1611601322175-ef8ec8c85f01?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1611601322175-ef8ec8c85f01?w=800&q=80',
      'https://images.unsplash.com/photo-1581595219315-a187dd40c322?w=800&q=80',
    ],
  },
  {
    id: 'sunset-bouquet',
    name: 'Sunset Bouquet',
    category: 'flowers',
    price: 1899,
    featured: true,
    short: 'A forever bouquet in peach, blush, and warm cream.',
    description:
      'These crochet blooms stay open all year. Arranged like a little sunset, the bouquet is perfect for birthdays, anniversaries, or a table that needs a bit of softness.',
    materials: 'Cotton yarn flowers, wrapped stems, optional kraft wrap.',
    care: 'Dust lightly. Keep dry.',
    customization: 'Colour story, bouquet size, and wrapping.',
    visual: 'bouquet',
    palette: ['#F3C9B8', '#E8B4B8', '#F7EFE6'],
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800&q=80',
    ],
  },
  {
    id: 'lavender-rose',
    name: 'Lavender Rose Stem',
    category: 'flowers',
    price: 499,
    featured: true,
    short: 'A single everlasting rose in the softest lilac.',
    description:
      'One rose, made petal by petal. Gift it on its own, tuck it into a book, or gather a handful into a custom bouquet.',
    materials: 'Cotton yarn, floral wire stem.',
    care: 'Handle the petals gently. Store away from moisture.',
    customization: 'Any colour you dream of — send a swatch or a feeling.',
    visual: 'flower',
    palette: ['#D9CDE8', '#B89BC9', '#F7EFE6'],
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
      'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=800&q=80',
    ],
  },
  {
    id: 'initial-keychain',
    name: 'Initial Keychain',
    category: 'keychains',
    price: 349,
    featured: true,
    short: 'A tiny letter, stitched in your favourite pastel.',
    description:
      'A handmade initial to clip onto keys, bags, or gift wrapping. Compact, cute, and quietly personal.',
    materials: 'Cotton yarn, metal ring, optional bead.',
    care: 'Keep dry. Wipe with a soft cloth if needed.',
    customization: 'Letter, colour, and a mini flower or heart accent.',
    visual: 'keychain',
    palette: ['#E8B4B8', '#C5D1C0', '#F3C9B8'],
    image: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
    ],
  },
  {
    id: 'daisy-bandana',
    name: 'Daisy Flower Bandana',
    category: 'accessories',
    price: 799,
    featured: true,
    short: 'A sweet floral bandana for hair, brunches, and slow days.',
    description:
      'Crochet daisies along a soft band — made to sit gently in the hair. Pair it with a linen dress or gift it to someone who loves little pretty things.',
    materials: 'Cotton yarn, stretch-friendly band.',
    care: 'Hand wash cold if needed. Lay flat to dry.',
    customization: 'Flower colours and band width.',
    visual: 'bandana',
    palette: ['#FBF6F0', '#E8B4B8', '#C5D1C0'],
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
      'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=800&q=80',
    ],
  },
  {
    id: 'juda-pin-set',
    name: 'Juda Pin Garden',
    category: 'accessories',
    price: 649,
    featured: false,
    short: 'A set of tiny floral pins for buns, braids, and festive days.',
    description:
      'Delicate crochet flowers on pins, meant for judo styling and everyday prettiness. Sold as a small garden of three.',
    materials: 'Cotton yarn flowers, metal pins.',
    care: 'Store in a dry box. Avoid pulling the petals.',
    customization: 'Colour mix and number of pins.',
    visual: 'pins',
    palette: ['#F3C9B8', '#D9CDE8', '#E8B4B8'],
    image: 'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=800&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
    ],
  },
  {
    id: 'name-gift-box',
    name: 'Named Keepsake Gift',
    category: 'personalized',
    price: 1699,
    featured: true,
    short: 'A personalized handmade piece, packed like a little celebration.',
    description:
      'Tell us a name, a colour, and an occasion. We will craft a keepsake — often a small toy, flower, or initial piece — and wrap it with a handwritten-feeling tag.',
    materials: 'Varies by request; always handmade yarn goods.',
    care: 'Care notes included with every order.',
    customization: 'Name, palette, occasion, and gift message.',
    visual: 'gift',
    palette: ['#F3D5D0', '#D9CDE8', '#EADFD3'],
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    ],
  },
  {
    id: 'heart-keychain',
    name: 'Little Heart Keychain',
    category: 'keychains',
    price: 299,
    featured: false,
    short: 'A plump crochet heart that fits in a palm.',
    description:
      'Small enough for a pocket, sweet enough for a surprise. Add initials on the back if you would like it extra personal.',
    materials: 'Cotton yarn, metal ring.',
    care: 'Keep dry.',
    customization: 'Colour and optional embroidered initials.',
    visual: 'heart',
    palette: ['#E8B4B8', '#C96B7B', '#F7EFE6'],
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80',
      'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800&q=80',
    ],
  },
  {
    id: 'cloud-teddy',
    name: 'Cloud Teddy',
    category: 'crochet-toys',
    price: 1599,
    featured: true,
    short: 'A cream teddy with the softest, cloud-like stitches.',
    description:
      'Cloud Teddy is for people who love quiet palettes. Ivory yarn, a dusty-rose nose, and a sage bow — simple, cozy, and made to last on a shelf or in a hug.',
    materials: 'Premium cotton yarn, embroidered face, soft filling.',
    care: 'Spot clean. Do not machine wash.',
    customization: 'Bow colour and size.',
    visual: 'teddy',
    palette: ['#F7EFE6', '#E8B4B8', '#C5D1C0'],
    image: 'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=800&q=80',
      'https://images.unsplash.com/photo-1559563458-527698bf5295?w=800&q=80',
    ],
  },
  {
    id: 'peach-peony',
    name: 'Peach Peony Cluster',
    category: 'flowers',
    price: 1299,
    featured: false,
    short: 'Full, ruffled peonies in a warm peach hush.',
    description:
      'A cluster of crochet peonies that look like they were picked at golden hour. Beautiful as a centrepiece or a gift that will not fade.',
    materials: 'Cotton yarn, wrapped stems.',
    care: 'Dust with a soft brush.',
    customization: 'Number of blooms and wrapping style.',
    visual: 'bouquet',
    palette: ['#F3C9B8', '#F3D5D0', '#FBF6F0'],
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80',
      'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&q=80',
    ],
  },
  {
    id: 'custom-crochet-outfit',
    name: 'Custom Crochet Outfit',
    category: 'clothes',
    price: 3499,
    featured: true,
    short: 'A handmade crochet outfit crafted to your size, colour, and style.',
    description:
      'A handmade crochet outfit, stitched slowly to your measurements and your mood. From cozy cardigans to flowy tops and soft dresses, every piece is made in colours, sizes, and silhouettes that feel quietly yours. Send a reference, a colour, or a feeling — we will plan the make together and keep you close to the process.',
    materials: 'Soft cotton-blend yarn, hand-stitched seams, gentle stretch-friendly fibres.',
    care: 'Hand wash cold with a mild detergent. Lay flat to dry. Avoid wringing.',
    customization: 'Size, body measurements, colour story, silhouette (top, cardigan, dress), and sleeve or hem length.',
    visual: 'yarn',
    palette: ['#E8B4B8', '#F7EFE6', '#D9CDE8'],
    image: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80',
    ],
  },
  {
    id: 'sage-scrunchie',
    name: 'Sage Bloom Scrunchie',
    category: 'accessories',
    price: 399,
    featured: false,
    short: 'A soft scrunchie with a tiny crochet bloom.',
    description:
      'Everyday hair, a little dressed up. The bloom can be daisy, rose, or a colour-matched petal.',
    materials: 'Cotton yarn over a gentle elastic.',
    care: 'Hand wash cold. Air dry.',
    customization: 'Base colour and flower type.',
    visual: 'bandana',
    palette: ['#C5D1C0', '#F7EFE6', '#E8B4B8'],
    image: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=800&q=80',
      'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=800&q=80',
    ],
  },
  {
    id: 'letter-garland',
    name: 'Letter Garland',
    category: 'personalized',
    price: 1899,
    featured: false,
    short: 'A name or word, strung in handmade letters.',
    description:
      'Nursery walls, wedding tables, or a cozy nook — a garland of crochet letters in a palette you choose.',
    materials: 'Cotton yarn letters, cotton cord.',
    care: 'Hang away from moisture. Dust gently.',
    customization: 'Word, colours, and spacing.',
    visual: 'gift',
    palette: ['#D9CDE8', '#F3C9B8', '#E8B4B8'],
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80',
    ],
  },
]

export const products = (typeof process !== 'undefined' && process.env.NODE_ENV === 'production')
  ? []
  : catalogSeedProducts

export function getProductById(id) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return null
  return products.find((p) => p.id === id)
}

export function getProductsByCategory(categoryId) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return []
  if (!categoryId || categoryId === 'all') return products
  return products.filter((p) => p.category === categoryId)
}

export function getFeaturedProducts() {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return []
  return products.filter((p) => p.featured)
}

export function getRelatedProducts(product, limit = 4) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return []
  if (!product) return []
  const cat = product.categoryId || (typeof product.category === 'object' ? product.category?.id || product.category?.slug : product.category)
  const prodId = product.id || product.slug
  return products
    .filter((p) => p.id !== prodId && p.category === cat)
    .concat(products.filter((p) => p.id !== prodId && p.category !== cat))
    .slice(0, limit)
}

export function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}