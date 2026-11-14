'use client'

import Image, { getImageProps } from 'next/image'
import { preload } from 'react-dom'

// Encode at the existing CDN, with AVIF for capable browsers and WebP fallback.
function imageLoader(format) {
  return ({ src, width, quality }) => {
    const [base, path] = src.split('/image/upload/')
    const original = path.replace(/^(?:[^/]*,[^/]*|f_[^/]*|q_[^/]*|w_[^/]*|c_[^/]*)\//, '')
    return `${base}/image/upload/f_${format},q_${quality || 80},w_${width},c_limit/${original}`
  }
}
const avifLoader = imageLoader('avif')
const webpLoader = imageLoader('webp')

export default function StorefrontImage(props) {
  const isCloudinary = typeof props.src === 'string' && props.src.includes('res.cloudinary.com/') && props.src.includes('/image/upload/')
  if (!isCloudinary) return <Image {...props} />

  const { props: avif } = getImageProps({
    src: props.src, alt: props.alt || '', width: props.width,
    height: props.height, fill: props.fill, sizes: props.sizes,
    quality: props.quality, loader: avifLoader,
  })
  if (props.priority) {
    // A typed preload is ignored by browsers without AVIF support. Avoid
    // also preloading WebP: <picture> should download only its chosen format.
    preload(avif.src, { as: 'image', type: 'image/avif', imageSrcSet: avif.srcSet, imageSizes: avif.sizes, fetchPriority: 'high' })
  }
  return (
    <picture>
      <source type="image/avif" srcSet={avif.srcSet} sizes={avif.sizes} />
      <Image {...props} loader={webpLoader} priority={false} loading={props.priority ? 'eager' : props.loading} fetchPriority={props.priority ? 'high' : props.fetchPriority} />
    </picture>
  )
}
