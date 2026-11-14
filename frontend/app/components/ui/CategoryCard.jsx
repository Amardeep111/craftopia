import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import ProductImage from './ProductImage'
import { cn } from '@/lib/cn'
const visualByCategory = { 'crochet-toys': 'teddy', flowers: 'bouquet', personalized: 'gift', accessories: 'bandana', keychains: 'keychain', custom: 'yarn' }
export default function CategoryCard({ category, className }) {
  return <Link href={`/shop?category=${category.slug}`} className={cn('studio-category group', className)}>
    <div className="studio-category-image"><ProductImage src={category.image} alt="" visual={visualByCategory[category.id] || 'yarn'} fit="cover" className="h-full w-full" /></div>
    <div className="mt-4 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-brand">{category.name}</h3><ArrowUpRight className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" /></div>
    <p className="mt-1 text-sm leading-relaxed text-muted">{category.description}</p>
  </Link>
}
