import Link from 'next/link'
import { Heart, Leaf, Sparkles } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import ProductImage from '@/components/ui/ProductImage'
import ScrollReveal from '@/components/ui/ScrollReveal'
import SectionHeading from '@/components/ui/SectionHeading'
import { getAboutContent } from '@/lib/about'

export const dynamic = 'force-dynamic'

const VALUE_ICONS = [Heart, Sparkles, Leaf]

export default async function About() {
  const content = await getAboutContent()
  const { header, story, makersHeading, makers, values, crafting } = content

  return (
    <>
      <PageHeader
        eyebrow={header?.eyebrow || 'The people behind the yarn'}
        title={header?.title || 'A home-grown craft table in Siliguri.'}
        description={header?.description || "Jamae's Craftopia is a handmade crochet and craft practice run by two sisters — creating soft things meant to be gifted, kept, and smiled at."}
      />

      <section className="container-page grid items-center gap-12 pb-8 lg:grid-cols-2">
        <ScrollReveal>
          <div className="paper-card overflow-hidden p-4">
            <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-sand">
              <ProductImage
                src={story?.image}
                alt={story?.title || 'Our craft table'}
                visual={story?.visual || 'yarn'}
                palette={story?.palette || ['#D9CDE8', '#5A3D4A']}
                fit="cover"
                className="h-full w-full"
                imgClassName="object-cover"
              />
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <SectionHeading
            align="left"
            title={story?.title || 'Our story'}
            description={story?.description || 'Two sisters, one practice. A home-grown craft table in Siliguri, where handmade pieces carry stories, names, and care.'}
          />
          <div className="mt-6 space-y-4 leading-relaxed text-muted">
            <p>
              {story?.paragraph1 || "Jamae's Craftopia began as a home-grown handmade business in Siliguri, India. Two sisters, a shared craft table, and a love of turning yarn into something someone can hold."}
            </p>
            <p>
              {story?.paragraph2 || "The work is slow on purpose: amigurumi friends, flowers that do not wilt, initial keychains, hair pieces, and gifts that carry a name. Nothing here is meant to feel factory-made."}
            </p>
            {story?.quote && (
              <p className="rounded-2xl bg-ivory px-4 py-3 text-sm italic text-plum">
                {story.quote}
              </p>
            )}
          </div>
        </ScrollReveal>
      </section>

      <section className="container-page mt-16">
        <SectionHeading
          title={makersHeading?.title || 'Meet the makers'}
          description={makersHeading?.description || 'Two sisters, one shared craft table. Handcrafting every piece with patience, warmth, and personal care.'}
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {(makers || []).map((person, i) => (
            <ScrollReveal key={person.id || person.name || i} delay={i * 0.08}>
              <article className="paper-card overflow-hidden">
                <div className="aspect-[5/4] bg-sand overflow-hidden">
                  <ProductImage
                    src={person.image}
                    alt={person.name}
                    visual={person.visual || 'flower'}
                    palette={person.palette || ['#E8B4B8', '#F7EFE6']}
                    fit="cover"
                    className="h-full w-full"
                    imgClassName="object-cover"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bloom">
                    {person.role || 'Maker'}
                  </p>
                  <h3 className="mt-1 font-display text-3xl text-plum">{person.name}</h3>
                  <p className="mt-2 text-muted leading-relaxed">{person.bio}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeading title="What we hold close" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {(values || []).map((v, i) => {
            const IconComponent = VALUE_ICONS[i % VALUE_ICONS.length] || Heart
            return (
              <ScrollReveal key={v.title || i} delay={i * 0.06}>
                <article className="paper-card h-full p-6">
                  <IconComponent className="h-6 w-6 text-bloom" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-2xl text-plum">{v.title}</h3>
                  <p className="mt-2 text-muted">{v.text}</p>
                </article>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section className="container-page mt-20 pb-20">
        <div className="grid items-center gap-10 rounded-[2rem] bg-ivory/80 p-8 ring-1 ring-sand lg:grid-cols-2 lg:p-12">
          <div>
            <h2 className="heading-display text-3xl sm:text-4xl">
              {crafting?.title || 'How a piece is made'}
            </h2>
            <ol className="mt-6 space-y-4 text-muted">
              <li>
                <strong className="text-plum">{crafting?.step1Title || '1. Yarn and a quiet idea.'}</strong>{' '}
                {crafting?.step1Text || 'Colours are chosen to match a mood, a dress, or a memory.'}
              </li>
              <li>
                <strong className="text-plum">{crafting?.step2Title || '2. Stitch by stitch.'}</strong>{' '}
                {crafting?.step2Text || 'Toys, petals, and letters take shape on the hook — never rushed.'}
              </li>
              <li>
                <strong className="text-plum">{crafting?.step3Title || '3. The small finishing.'}</strong>{' '}
                {crafting?.step3Text || 'Embroidered faces, ribbons, wrapping, and a last look before it leaves the table.'}
              </li>
            </ol>
            <Button as={Link} href="/custom-orders" className="mt-8">
              Commission a piece
            </Button>
          </div>
          <div className="aspect-square overflow-hidden rounded-[1.75rem] bg-sand">
            <ProductImage
              src={crafting?.image}
              alt={crafting?.title || 'Crafting process'}
              visual={crafting?.visual || 'bouquet'}
              palette={crafting?.palette || ['#F3C9B8', '#E8B4B8', '#C5D1C0']}
              fit="cover"
              className="h-full w-full"
              imgClassName="object-cover"
            />
          </div>
        </div>
      </section>
    </>
  )
}
