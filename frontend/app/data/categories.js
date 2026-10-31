export const categories = [
  {
    id: 'all',
    name: 'All',
    slug: 'all',
    description: 'Every little handmade treasure',
  },
  {
    id: 'crochet-toys',
    name: 'Crochet Toys',
    slug: 'crochet-toys',
    description: 'Soft amigurumi friends, made to be hugged',
    accent: 'blush',
  },
  {
    id: 'flowers',
    name: 'Flowers & Bouquets',
    slug: 'flowers',
    description: 'Blooms that never wilt',
    accent: 'peach',
  },
  {
    id: 'personalized',
    name: 'Personalized Gifts',
    slug: 'personalized',
    description: 'Pieces with names, initials, and meaning',
    accent: 'lavender',
  },
  {
    id: 'accessories',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Flower bandanas, judo pins, and hair pieces',
    accent: 'sage',
  },
  {
    id: 'keychains',
    name: 'Keychains',
    slug: 'keychains',
    description: 'Tiny keepsakes for bags, keys, and pockets',
    accent: 'petal',
  },
  {
    id: 'clothes',
    name: 'Clothes',
    slug: 'clothes',
    description: 'Handmade crochet clothing, made to your size and style',
    accent: 'bloom',
  },
]

export const shopCategories = categories.filter((c) => c.id !== 'all')