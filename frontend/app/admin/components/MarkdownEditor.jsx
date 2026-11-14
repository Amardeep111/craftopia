'use client'

import { useRef } from 'react'
import MarkdownContent from '@/components/content/MarkdownContent'

const toolbar = [
  { label: 'Bold', before: '**', after: '**', sample: 'bold text' },
  { label: 'Italic', before: '*', after: '*', sample: 'italic text' },
  { label: 'Heading', before: '## ', line: true, sample: 'Heading' },
  { label: 'Bulleted list', before: '- ', line: true, sample: 'List item' },
  { label: 'Numbered list', before: '1. ', line: true, sample: 'List item' },
  { label: 'Link', before: '[', after: '](https://)', sample: 'link text' },
]

export default function MarkdownEditor({
  id,
  label,
  value = '',
  onChange,
  readOnly = false,
  required = false,
  inline = false,
  rows = 4,
  className = '',
}) {
  const inputRef = useRef(null)

  function insertMarkdown(format) {
    const input = inputRef.current
    if (!input || readOnly) return

    const start = input.selectionStart
    const end = input.selectionEnd
    const selected = value.slice(start, end)
    const text = selected || format.sample
    const replacement = format.line
      ? text.split('\n').map((line) => `${format.before}${line}`).join('\n')
      : `${format.before}${text}${format.after}`
    const next = `${value.slice(0, start)}${replacement}${value.slice(end)}`
    onChange(next)

    requestAnimationFrame(() => {
      input.focus()
      const cursor = start + replacement.length
      input.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div className="min-w-0">
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brand">{label}</label>}
      {!readOnly && (
        <div className="mb-1.5 flex flex-wrap gap-1" role="toolbar" aria-label={`${label || 'Text'} formatting`}>
          {toolbar.filter((format) => !inline || !format.line).map((format) => (
            <button
              key={format.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertMarkdown(format)}
              className="min-h-8 rounded-md border border-sand bg-surface px-2 text-xs font-medium text-brand hover:bg-ivory focus:outline-none focus:ring-2 focus:ring-bloom/40"
            >
              {format.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={inputRef}
        id={id}
        aria-label={label}
        rows={rows}
        value={value}
        readOnly={readOnly}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border border-sand bg-surface px-3 py-2 text-sm leading-relaxed text-brand outline-none focus:border-bloom focus:ring-2 focus:ring-bloom/20 read-only:bg-ivory ${className}`}
      />
      {!readOnly && <p className="mt-1 text-xs text-muted">Paste Markdown directly or use the formatting buttons. HTML is not rendered.</p>}
      <div className="mt-2 rounded-xl border border-sand/70 bg-surface/70 p-3">
        <p className="mb-1 text-[10px] font-semibold tracking-normal text-muted">Preview</p>
        <MarkdownContent inline={inline} className="prose prose-sm max-w-none text-muted [&_a]:text-brand [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-bloom [&_blockquote]:pl-3 [&_h1]:font-display [&_h2]:font-display [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
          {value}
        </MarkdownContent>
      </div>
    </div>
  )
}
