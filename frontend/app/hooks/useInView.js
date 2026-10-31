'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * High-performance IntersectionObserver hook for loading on scroll.
 * @param {Object} options
 * @param {string} options.rootMargin - Margin around root to trigger early before visible (default '350px')
 * @param {number|number[]} options.threshold - Visibility threshold (default 0)
 * @param {boolean} options.once - Whether to unobserve after first intersection (default true)
 * @param {boolean} options.initial - Initial inView state (default false)
 * @returns {[React.RefObject, boolean]} [ref, inView]
 */
export function useInView({
  rootMargin = '350px',
  threshold = 0,
  once = true,
  initial = false,
} = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(initial)

  useEffect(() => {
    if (inView && once) return

    const node = ref.current
    if (!node) return

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry && entry.isIntersecting) {
          setInView(true)
          if (once) {
            observer.disconnect()
          }
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin, threshold, once, inView])

  return [ref, inView]
}

