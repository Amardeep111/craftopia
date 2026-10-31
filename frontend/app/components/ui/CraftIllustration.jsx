import { memo } from 'react'

/**
 * Brand illustrations used until real product photos are added.
 * To use a photo, set `product.image` or pass `src` to ProductImage.
 *
 * Each visual supports 3 view variants (1 = front, 2 = side/detail, 3 = close-up).
 * These are used by ProductImageGallery to provide a meaningful 3-image experience
 * even when real photographs are not yet available.
 */
function Teddy({ colors, view = 1 }) {
  const [body, blush, ink] = colors
  if (view === 2) {
    // Side view
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="62" cy="68" r="28" fill={body} />
        <circle cx="138" cy="68" r="28" fill={body} />
        <circle cx="62" cy="68" r="14" fill={blush} />
        <circle cx="138" cy="68" r="14" fill={blush} />
        <ellipse cx="100" cy="118" rx="58" ry="52" fill={body} />
        <ellipse cx="100" cy="108" rx="42" ry="38" fill="#fff8f2" />
        <circle cx="82" cy="100" r="6" fill={ink} />
        <circle cx="118" cy="100" r="6" fill={ink} />
        <ellipse cx="100" cy="116" rx="8" ry="6" fill={blush} />
        <path d="M90 128c6 8 14 8 20 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  if (view === 3) {
    // Close-up face
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <ellipse cx="100" cy="115" rx="62" ry="58" fill={body} />
        <ellipse cx="100" cy="105" rx="46" ry="40" fill="#fff8f2" />
        <circle cx="76" cy="96" r="8" fill={ink} />
        <circle cx="124" cy="96" r="8" fill={ink} />
        <circle cx="78" cy="93" r="3" fill="white" />
        <circle cx="126" cy="93" r="3" fill="white" />
        <ellipse cx="100" cy="116" rx="9" ry="6" fill={blush} />
        <path d="M86 132c8 10 20 10 28 0" fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="68" cy="118" r="10" fill={blush} opacity="0.6" />
        <circle cx="132" cy="118" r="10" fill={blush} opacity="0.6" />
      </svg>
    )
  }
  // View 1 — front
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <circle cx="62" cy="68" r="28" fill={body} />
      <circle cx="138" cy="68" r="28" fill={body} />
      <circle cx="62" cy="68" r="14" fill={blush} />
      <circle cx="138" cy="68" r="14" fill={blush} />
      <ellipse cx="100" cy="118" rx="58" ry="52" fill={body} />
      <ellipse cx="100" cy="108" rx="42" ry="38" fill="#fff8f2" />
      <circle cx="82" cy="100" r="6" fill={ink} />
      <circle cx="118" cy="100" r="6" fill={ink} />
      <ellipse cx="100" cy="116" rx="8" ry="6" fill={blush} />
      <path d="M90 128c6 8 14 8 20 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Bunny({ colors, view = 1 }) {
  const [body, blush, ink] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <ellipse cx="100" cy="120" rx="52" ry="50" fill={body} />
        <ellipse cx="100" cy="112" rx="36" ry="32" fill="#fff8f2" />
        <circle cx="82" cy="106" r="5" fill={ink} />
        <circle cx="118" cy="106" r="5" fill={ink} />
        <ellipse cx="100" cy="120" rx="7" ry="5" fill={blush} />
        <path d="M88 134c8 10 16 10 24 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <circle cx="68" cy="122" r="12" fill={blush} opacity="0.5" />
        <circle cx="132" cy="122" r="12" fill={blush} opacity="0.5" />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <ellipse cx="72" cy="52" rx="16" ry="40" fill={body} />
        <ellipse cx="128" cy="52" rx="16" ry="40" fill={body} />
        <ellipse cx="72" cy="56" rx="8" ry="26" fill={blush} />
        <ellipse cx="128" cy="56" rx="8" ry="26" fill={blush} />
        <ellipse cx="100" cy="120" rx="52" ry="50" fill={body} />
        <circle cx="82" cy="112" r="5" fill={ink} />
        <circle cx="118" cy="112" r="5" fill={ink} />
        <ellipse cx="100" cy="126" rx="7" ry="5" fill={blush} />
        <path d="M88 140c8 10 16 10 24 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <ellipse cx="72" cy="52" rx="16" ry="40" fill={body} />
      <ellipse cx="128" cy="52" rx="16" ry="40" fill={body} />
      <ellipse cx="72" cy="56" rx="8" ry="26" fill={blush} />
      <ellipse cx="128" cy="56" rx="8" ry="26" fill={blush} />
      <ellipse cx="100" cy="120" rx="52" ry="50" fill={body} />
      <circle cx="82" cy="112" r="5" fill={ink} />
      <circle cx="118" cy="112" r="5" fill={ink} />
      <ellipse cx="100" cy="126" rx="7" ry="5" fill={blush} />
      <path d="M88 140c8 10 16 10 24 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Flower({ colors, view = 1 }) {
  const [petal, center] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cx="100" cy="62" rx="22" ry="34" fill={petal} transform={`rotate(${deg} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="22" fill={center || '#F7EFE6'} />
        <circle cx="100" cy="100" r="10" fill={petal} opacity="0.5" />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => (
          <ellipse key={deg} cx="100" cy="68" rx="16" ry="28" fill={petal} transform={`rotate(${deg} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="24" fill={center || '#F7EFE6'} />
        <circle cx="100" cy="100" r="10" fill={petal} />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <circle key={deg} cx={100 + 16 * Math.cos((deg * Math.PI) / 180)} cy={100 + 16 * Math.sin((deg * Math.PI) / 180)} r="3" fill={center || '#F7EFE6'} />
        ))}
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse key={deg} cx="100" cy="62" rx="22" ry="34" fill={petal} transform={`rotate(${deg} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="22" fill={center || '#F7EFE6'} />
    </svg>
  )
}

function Bouquet({ colors, view = 1 }) {
  const [a, b, c] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <path d="M100 178c-8-36-28-70-8-110" fill="none" stroke="#7D9278" strokeWidth="6" />
        <path d="M100 178c8-40 24-68 4-108" fill="none" stroke="#7D9278" strokeWidth="6" />
        <circle cx="86" cy="70" r="22" fill={b} />
        <circle cx="116" cy="62" r="20" fill={a} />
        <circle cx="104" cy="88" r="18" fill={c} />
        <circle cx="86" cy="70" r="8" fill="#F7EFE6" />
        <circle cx="116" cy="62" r="7" fill="#F7EFE6" />
        <circle cx="104" cy="88" r="6" fill="#F7EFE6" />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <path d="M100 178c0-44-20-72-8-108" fill="none" stroke="#7D9278" strokeWidth="5" />
        <circle cx="96" cy="72" r="18" fill={a} />
        <circle cx="114" cy="80" r="16" fill={b} />
        <circle cx="100" cy="96" r="14" fill={c} />
        <circle cx="84" cy="86" r="12" fill={a} />
        <circle cx="96" cy="72" r="6" fill="#F7EFE6" />
        <circle cx="114" cy="80" r="5" fill="#F7EFE6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <path d="M100 178c-8-36-28-70-8-110" fill="none" stroke="#7D9278" strokeWidth="6" />
      <path d="M100 178c8-40 24-68 4-108" fill="none" stroke="#7D9278" strokeWidth="6" />
      <circle cx="86" cy="70" r="22" fill={a} />
      <circle cx="116" cy="62" r="20" fill={b} />
      <circle cx="104" cy="88" r="18" fill={c} />
      <circle cx="86" cy="70" r="8" fill="#F7EFE6" />
      <circle cx="116" cy="62" r="7" fill="#F7EFE6" />
    </svg>
  )
}

function Keychain({ colors, view = 1 }) {
  const [a, b] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="100" cy="48" r="16" fill="none" stroke="#8a7268" strokeWidth="6" />
        <rect x="96" y="62" width="8" height="18" rx="3" fill="#8a7268" />
        <circle cx="100" cy="120" r="36" fill={a} opacity="0.7" />
        <circle cx="100" cy="120" r="26" fill={a} />
        <text x="100" y="134" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="40" fill={b || '#5A3D4A'}>J</text>
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="100" cy="48" r="16" fill="none" stroke="#8a7268" strokeWidth="6" />
        <rect x="96" y="62" width="8" height="18" rx="3" fill="#8a7268" />
        <circle cx="100" cy="120" r="42" fill={a} />
        <text x="100" y="134" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="48" fill={b || '#5A3D4A'}>J</text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <circle cx="100" cy="48" r="16" fill="none" stroke="#8a7268" strokeWidth="6" />
      <rect x="96" y="62" width="8" height="18" rx="3" fill="#8a7268" />
      <circle cx="100" cy="120" r="42" fill={a} />
      <text x="100" y="134" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="48" fill={b || '#5A3D4A'}>J</text>
    </svg>
  )
}

function Bandana({ colors, view = 1 }) {
  const [a, b] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <path d="M30 90c40-28 100-28 140 0-22 28-48 52-70 70-22-18-48-42-70-70Z" fill={b} />
        <circle cx="70" cy="88" r="12" fill={a} />
        <circle cx="100" cy="78" r="12" fill="#F7EFE6" />
        <circle cx="130" cy="88" r="12" fill={a} />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <path d="M30 90c40-28 100-28 140 0-22 28-48 52-70 70-22-18-48-42-70-70Z" fill={a} />
        <circle cx="55" cy="85" r="10" fill={b} />
        <circle cx="80" cy="80" r="10" fill="#F7EFE6" />
        <circle cx="105" cy="76" r="10" fill={b} />
        <circle cx="130" cy="80" r="10" fill="#F7EFE6" />
        <circle cx="150" cy="88" r="10" fill={b} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <path d="M30 90c40-28 100-28 140 0-22 28-48 52-70 70-22-18-48-42-70-70Z" fill={a} />
      <circle cx="70" cy="88" r="12" fill={b} />
      <circle cx="100" cy="78" r="12" fill="#F7EFE6" />
      <circle cx="130" cy="88" r="12" fill={b} />
    </svg>
  )
}

function Gift({ colors, view = 1 }) {
  const [a, b] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <rect x="48" y="86" width="104" height="78" rx="12" fill={b} />
        <rect x="92" y="86" width="16" height="78" fill={a} />
        <rect x="48" y="112" width="104" height="16" fill={a} />
        <ellipse cx="84" cy="78" rx="22" ry="16" fill={a} />
        <ellipse cx="116" cy="78" rx="22" ry="16" fill={a} />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <rect x="48" y="86" width="104" height="78" rx="12" fill={a} />
        <rect x="92" y="86" width="16" height="78" fill={b} />
        <rect x="48" y="112" width="104" height="16" fill={b} />
        <ellipse cx="84" cy="78" rx="22" ry="16" fill={b} />
        <ellipse cx="116" cy="78" rx="22" ry="16" fill={b} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <rect x="48" y="86" width="104" height="78" rx="12" fill={a} />
      <rect x="92" y="86" width="16" height="78" fill={b} />
      <rect x="48" y="112" width="104" height="16" fill={b} />
      <ellipse cx="84" cy="78" rx="22" ry="16" fill={b} />
      <ellipse cx="116" cy="78" rx="22" ry="16" fill={b} />
    </svg>
  )
}

function Heart({ colors, view = 1 }) {
  const [a] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <path d="M100 162s-52-32-52-72c0-22 18-36 36-36 12 0 16 8 16 8s4-8 16-8c18 0 36 14 36 36 0 40-52 72-52 72Z" fill={a} />
        <ellipse cx="78" cy="96" rx="12" ry="10" fill="white" opacity="0.25" />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <path d="M100 162s-52-32-52-72c0-22 18-36 36-36 12 0 16 8 16 8s4-8 16-8c18 0 36 14 36 36 0 40-52 72-52 72Z" fill={a} />
        <ellipse cx="82" cy="100" rx="10" ry="8" fill="white" opacity="0.2" />
        <ellipse cx="70" cy="112" rx="6" ry="5" fill="white" opacity="0.15" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <path d="M100 162s-52-32-52-72c0-22 18-36 36-36 12 0 16 8 16 8s4-8 16-8c18 0 36 14 36 36 0 40-52 72-52 72Z" fill={a} />
    </svg>
  )
}

function Pins({ colors, view = 1 }) {
  const [a, b, c] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="70" cy="88" r="22" fill={b} />
        <circle cx="100" cy="70" r="22" fill={a} />
        <circle cx="130" cy="90" r="22" fill={c} />
        <circle cx="70" cy="88" r="8" fill="#F7EFE6" />
        <circle cx="100" cy="70" r="8" fill="#F7EFE6" />
        <circle cx="130" cy="90" r="8" fill="#F7EFE6" />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="70" cy="88" r="22" fill={c} />
        <circle cx="100" cy="70" r="22" fill={b} />
        <circle cx="130" cy="90" r="22" fill={a} />
        <circle cx="70" cy="88" r="8" fill="#F7EFE6" />
        <circle cx="100" cy="70" r="8" fill="#F7EFE6" />
        <circle cx="130" cy="90" r="8" fill="#F7EFE6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <circle cx="70" cy="88" r="22" fill={a} />
      <circle cx="100" cy="70" r="22" fill={b} />
      <circle cx="130" cy="90" r="22" fill={c} />
      <circle cx="70" cy="88" r="8" fill="#F7EFE6" />
      <circle cx="100" cy="70" r="8" fill="#F7EFE6" />
      <circle cx="130" cy="90" r="8" fill="#F7EFE6" />
    </svg>
  )
}

function Yarn({ colors, view = 1 }) {
  const [a, b] = colors
  if (view === 2) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="100" cy="108" r="52" fill={a} />
        <path d="M60 90c30 10 50 10 80 0M58 112c32 12 52 12 84 0" fill="none" stroke={b || '#5A3D4A'} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        <path d="M148 80c18-22 28-38 22-58" fill="none" stroke={a} strokeWidth="6" strokeLinecap="round" />
      </svg>
    )
  }
  if (view === 3) {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="100" cy="108" r="52" fill={a} />
        <path d="M58 90c32 12 52 12 84 0M60 112c30 10 50 10 80 0" fill="none" stroke={b || '#5A3D4A'} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        <path d="M152 82c20-24 30-40 22-62" fill="none" stroke={a} strokeWidth="6" strokeLinecap="round" />
        <circle cx="78" cy="98" r="12" fill={b || '#5A3D4A'} opacity="0.2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <circle cx="100" cy="108" r="52" fill={a} />
      <path d="M60 90c30 10 50 10 80 0M58 112c32 12 52 12 84 0M70 134c24 8 36 8 60 0" fill="none" stroke={b || '#5A3D4A'} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
      <path d="M148 80c18-22 28-38 22-58" fill="none" stroke={a} strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

const visuals = {
  teddy: memo(Teddy),
  bunny: memo(Bunny),
  flower: memo(Flower),
  bouquet: memo(Bouquet),
  keychain: memo(Keychain),
  bandana: memo(Bandana),
  gift: memo(Gift),
  heart: memo(Heart),
  pins: memo(Pins),
  yarn: memo(Yarn),
}

const bgMap = {
  teddy: 'from-peach/70 to-blush/80',
  bunny: 'from-ivory to-lavender/70',
  flower: 'from-lavender/80 to-blush/70',
  bouquet: 'from-peach/80 to-ivory',
  keychain: 'from-sage/60 to-blush/70',
  bandana: 'from-sage/50 to-ivory',
  gift: 'from-lavender/70 to-peach/60',
  heart: 'from-petal/80 to-blush',
  pins: 'from-peach/70 to-lavender/60',
  yarn: 'from-lavender/70 to-sage/50',
}

export default function CraftIllustration({ visual = 'yarn', palette, view = 1, className = '' }) {
  const Graphic = visuals[visual] || Yarn
  const colors = Array.isArray(palette) && palette.length > 0
    ? palette
    : (typeof palette === 'string'
        ? (() => {
            try {
              const p = JSON.parse(palette)
              return Array.isArray(p) && p.length > 0 ? p : ['#E8B4B8', '#D9CDE8', '#5A3D4A']
            } catch {
              return ['#E8B4B8', '#D9CDE8', '#5A3D4A']
            }
          })()
        : ['#E8B4B8', '#D9CDE8', '#5A3D4A'])
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${bgMap[visual] || bgMap.yarn} ${className}`}>
      <div className="h-[78%] w-[78%]">
        <Graphic colors={colors} view={view} />
      </div>
    </div>
  )
}
