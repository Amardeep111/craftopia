'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

const storageKey = 'jamaes:theme'
const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]
const valid = (value) => ['light', 'dark', 'system'].includes(value) ? value : 'system'
function applyTheme(preference) {
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.dataset.themePreference = preference
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}
export default function ThemeControl() {
  const [preference, setPreference] = useState('system')
  useEffect(() => {
    setPreference(valid(document.documentElement.dataset.themePreference))
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      const current = valid(document.documentElement.dataset.themePreference)
      if (current === 'system') applyTheme(current)
    }
    const onStorage = (event) => {
      if (event.key !== storageKey) return
      const value = valid(event.newValue)
      setPreference(value)
      applyTheme(value)
    }
    media.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    return () => { media.removeEventListener('change', onSystemChange); window.removeEventListener('storage', onStorage) }
  }, [])
  const choose = (value) => {
    setPreference(value)
    applyTheme(value)
    try { localStorage.setItem(storageKey, value) } catch {}
  }
  const move = (event) => {
    const index = themeOptions.findIndex((option) => option.value === preference)
    let next
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % themeOptions.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + themeOptions.length - 1) % themeOptions.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = themeOptions.length - 1
    if (next === undefined) return
    event.preventDefault()
    choose(themeOptions[next].value)
    event.currentTarget.querySelectorAll('button')[next]?.focus()
  }
  return <div className="studio-theme-control" role="radiogroup" aria-label="Color theme" onKeyDown={move}>
    {themeOptions.map(({ value, label, icon: Icon }) => <button
      key={value}
      type="button"
      role="radio"
      aria-label={`${label} theme`}
      aria-checked={preference === value}
      tabIndex={preference === value ? 0 : -1}
      title={`${label} theme`}
      onClick={() => choose(value)}
    ><Icon className="h-4 w-4" aria-hidden="true" /></button>)}
  </div>
}
