'use client'

import { useEffect, useState, useTransition } from 'react'

// Only this public storefront view is retained, in this tab's memory. Auth,
// cart, account, and management views remain outside this component.
let completedHomeView = null
export function getCompletedHomeView() { return completedHomeView }

export default function CompletedHomeView({ children }) {
  const [pending, startViewTransition] = useTransition()
  const [view, setView] = useState(() => completedHomeView || children)
  useEffect(() => {
    startViewTransition(() => setView(children))
  }, [children])
  useEffect(() => {
    // Effects run after a view commits, so unresolved replacements cannot
    // overwrite the completed view used by the next Home navigation.
    if (!pending) completedHomeView = view
  }, [view, pending])
  return view
}
