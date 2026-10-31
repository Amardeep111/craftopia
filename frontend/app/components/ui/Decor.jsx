export function FlowerBurst({ className = '' }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" aria-hidden="true">
      <circle cx="40" cy="18" r="10" fill="currentColor" />
      <circle cx="62" cy="40" r="10" fill="currentColor" />
      <circle cx="40" cy="62" r="10" fill="currentColor" />
      <circle cx="18" cy="40" r="10" fill="currentColor" />
      <circle cx="40" cy="40" r="8" fill="#F7EFE6" />
    </svg>
  )
}

export function Blob({ className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M44.7,-67.2C57.2,-59.3,66,-44.4,73.4,-28.6C80.8,-12.7,86.8,4.1,83.6,19.5C80.3,34.9,67.7,48.9,52.8,59.2C37.9,69.5,20,76.1,2.2,73.1C-15.6,70.1,-33.2,57.5,-47.7,43.8C-62.2,30.1,-73.6,15,-76.4,-1.6C-79.2,-18.3,-73.4,-36.6,-61.3,-47.8C-49.2,-59,-30.8,-63.1,-13.7,-64.5C3.4,-65.9,32.2,-75.1,44.7,-67.2Z"
        transform="translate(100 100)"
      />
    </svg>
  )
}