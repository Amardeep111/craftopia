import { cn } from '@/lib/cn'

export default function Badge({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-blush/80 px-3 py-1 text-xs font-semibold tracking-wide text-plum',
        className,
      )}
    >
      {children}
    </span>
  )
}