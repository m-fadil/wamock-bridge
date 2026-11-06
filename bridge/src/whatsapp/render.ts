import { findTemplate } from '../mock/client.ts'
import type { OutboundMessage } from '../mock/types.ts'

interface TemplateSend {
  name: string
  language: { code: string }
  components?: { type: string; parameters?: { text?: string }[] }[]
}

/**
 * Teks yang dikirim ke WhatsApp asli: body template dengan {{n}} terisi, atau teks biasa.
 * Payload mengikuti body Graph API `/messages`: `{ text: { body } }` atau `{ template: { name, language, components } }`.
 */
export async function renderText(msg: OutboundMessage): Promise<string> {
  if (msg.type === 'text') return (msg.payload['text'] as { body: string }).body
  if (msg.type !== 'template') return `[${msg.type}] ${JSON.stringify(msg.payload).slice(0, 200)}`

  const { name, language, components = [] } = msg.payload['template'] as TemplateSend
  const template = await findTemplate(name, language.code)
  const body = template?.components.find((c) => c.type === 'BODY')?.text ?? `[template ${name}]`
  const params = components.find((c) => c.type === 'body')?.parameters ?? []
  return body.replace(/\{\{(\d+)\}\}/g, (_, i: string) => params[Number(i) - 1]?.text ?? '')
}
