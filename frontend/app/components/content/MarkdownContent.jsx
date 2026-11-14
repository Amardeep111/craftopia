import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownContent({ children, className = '', inline = false }) {
  const source = typeof children === 'string' ? children : ''
  if (!source.trim()) return null

  if (inline) {
    return (
      <span className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          allowedElements={['a', 'strong', 'em', 'del', 'code', 'br']}
          unwrapDisallowed
        >
          {source}
        </ReactMarkdown>
      </span>
    )
  }

  return (
    <div className={`space-y-2 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h1 className="font-display text-2xl text-brand">{children}</h1>,
          h2: ({ children }) => <h2 className="font-display text-xl text-brand">{children}</h2>,
          h3: ({ children }) => <h3 className="font-semibold text-brand">{children}</h3>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-bloom pl-4 italic">{children}</blockquote>,
          a: ({ children, href }) => <a href={href} className="text-brand underline underline-offset-2" rel="nofollow">{children}</a>,
          code: ({ children }) => <code className="rounded bg-ivory px-1 py-0.5 text-[0.9em]">{children}</code>,
          pre: ({ children }) => <pre className="overflow-x-auto rounded-lg bg-ivory p-3">{children}</pre>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
