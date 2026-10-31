import { HeartHandshake, MapPin, Sparkles, WandSparkles } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'

const highlights = [
  {
    icon: HeartHandshake,
    title: 'Handmade with Love',
    text: 'Every stitch is placed by hand — slowly, carefully, and with a little extra warmth.',
  },
  {
    icon: WandSparkles,
    title: 'Made Just for You',
    text: 'Colours, names, and tiny details can be tailored so the piece feels like yours.',
  },
  {
    icon: Sparkles,
    title: 'Custom Creations',
    text: 'Bring a sketch, a memory, or a wild little idea. We will help it take shape.',
  },
  {
    icon: MapPin,
    title: 'Crafted in Siliguri',
    text: "A home-grown studio in the hills' doorway — two sisters, one craft table.",
  },
]

export default function BrandHighlights() {
  return (
    <section className="container-page">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item, i) => (
          <ScrollReveal key={item.title} delay={i * 0.06}>
            <div className="paper-card h-full p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blush/70 text-plum">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-display text-xl text-plum">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}