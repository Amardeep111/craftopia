const highlights = [
  ['Made by hand', 'Care in every stitch.'],
  ['Personal to you', 'Your colours. Your little details.'],
  ['A small family studio', 'Two sisters, one craft table.'],
  ['From Siliguri', 'Thoughtfully made in India.'],
]
export default function BrandHighlights() {
  return <section className="container-page" aria-label="Our craft"><div className="studio-highlights grid grid-cols-2 gap-6 lg:grid-cols-4">{highlights.map(([title, text]) => <div key={title}><h2 className="text-sm font-semibold text-brand">{title}</h2><p className="mt-1 text-xs leading-relaxed text-muted">{text}</p></div>)}</div></section>
}
