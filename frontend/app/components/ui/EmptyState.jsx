import { Flower2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export default function EmptyState({ title, description, action, className }) {
  return (
    <div className={cn('paper-card mx-auto max-w-lg px-8 py-14 text-center', className)}>
      <Flower2 className="mx-auto h-10 w-10 text-petal" aria-hidden="true" />
      <h2 className="mt-4 font-display text-3xl text-plum">{title}</h2>
      {description ? <p className="mt-3 text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}