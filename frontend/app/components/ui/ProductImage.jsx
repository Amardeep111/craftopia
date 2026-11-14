'use client'

import { useState } from 'react'
import CraftIllustration from './CraftIllustration'
import { cn } from '@/lib/cn'
import Image from './StorefrontImage'

export default function ProductImage({
  src,
  alt,
  visual = 'yarn',
  palette,
  view = 1,
  className,
  imgClassName,
  width,
  height,
  priority = false,
  fit = 'contain',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (src && !error) {
    return (
      <div className={cn('overflow-hidden relative bg-sand/30', className)}>
        {!loaded && (
          <div className="absolute inset-0 bg-ivory animate-pulse" />
        )}
        <Image
          src={src}
          alt={alt || ''}
          fill={!width && !height}
          width={width}
          height={height}
          priority={priority}
          fetchPriority={priority ? 'high' : 'auto'}
          sizes={sizes}
          className={cn(
            fit === 'contain' ? 'object-contain' : 'object-cover',
            'transition-opacity duration-300',
            'opacity-100',
            imgClassName
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </div>
    )
  }

  return (
    <CraftIllustration
      visual={visual}
      palette={palette}
      view={view}
      className={cn('h-full w-full', className)}
    />
  )
}
