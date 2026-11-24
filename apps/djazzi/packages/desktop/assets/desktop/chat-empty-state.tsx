import { FileText, Globe, Presentation } from 'lucide-react'
import { DjazziMark } from '@/components/djazzi-mark'
import { cn } from '@/lib/utils'

const starters = [
  { icon: FileText, title: 'Summarize a document', prompt: 'Please summarize this document and highlight its key points.' },
  { icon: Presentation, title: 'Prepare a presentation', prompt: 'Please help me prepare a clear, structured presentation.' },
  { icon: Globe, title: 'Search the web', prompt: 'Please research reliable sources on the following subject: ' },
]
export function ChatEmptyState({ onPickPrompt, wide = false, variant = 'default' }: {
  onPickPrompt: (prompt: string) => void; wide?: boolean; variant?: 'default' | 'code'
}) {
  return <div className={cn('djazzi-chat-welcome', wide && 'djazzi-chat-welcome-wide')}>
    <DjazziMark size={wide ? 48 : 36} />
    <h1>{variant === 'code' ? 'What should we build together?' : 'How can I help you?'}</h1>
    <p>{variant === 'code' ? 'Describe a task or ask a question about your project.' : 'A question, an idea or a document to explore.'}</p>
    {variant !== 'code' && <div className="djazzi-chat-starters">{starters.map(({ icon: Icon, title, prompt }) =>
      <button type="button" key={title} onClick={() => onPickPrompt(prompt)}><Icon size={16} />{title}</button>)}</div>}
  </div>
}
