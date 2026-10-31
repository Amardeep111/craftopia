import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'

const steps = [
  {
    number: '01',
    title: 'Pick or dream',
    text: 'Choose from the collection or share a custom idea.',
  },
  {
    number: '02',
    title: 'We craft it slowly',
    text: 'Your piece is made by hand, one stitch at a time.',
  },
  {
    number: '03',
    title: 'It arrives with love',
    text: 'Wrapped carefully and sent with a little note.',
  },
]

export default function HowItWorks() {
  return (
    <section className="container-page mt-20 sm:mt-28">
      <SectionHeading
        eyebrow="Simple, honest, and kind"
        title="How it works"
        description="From idea to doorstep — here is how a handmade piece finds its way to you."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <ScrollReveal key={step.number} delay={i * 0.08}>
            <div className="paper-card p-6 text-center">
              <p className="font-display text-5xl text-petal">{step.number}</p>
              <h3 className="mt-3 font-display text-2xl text-plum">{step.title}</h3>
              <p className="mt-2 text-muted">{step.text}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}