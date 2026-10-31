import Link from 'next/link'
import ProductImage from './ProductImage'
import { cn } from '@/lib/cn'

const visualByCategory = {
  'crochet-toys': 'teddy',
  flowers: 'bouquet',
  personalized: 'gift',
  accessories: 'bandana',
  keychains: 'keychain',
  custom: 'yarn',
}

export default function CategoryCard({ category, className }) {
  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-3xl shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift',
        className,
      )}
    >
      <div className="aspect-[4/5] sm:aspect-[5/6]">
        <ProductImage
          src={category.image}
          alt=""
          visual={visualByCategory[category.id] || 'yarn'}
          fit="cover"
          className="h-full w-full"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-plum/70 via-plum/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="font-display text-2xl text-cream">{category.name}</h3>
        <p className="mt-1 text-sm text-cream/85">{category.description}</p>
      </div>
    </Link>
  )
}