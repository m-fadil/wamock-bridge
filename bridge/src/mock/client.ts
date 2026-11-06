import { config } from '../core/config.ts'
import type { NewTemplate, OutboundMessage, Template } from './types.ts'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(config.mockUrl + path, init)
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const templatesPath = (): string => `/${config.graphVersion}/${config.wabaId}/message_templates`

export const listOutbound = async (): Promise<OutboundMessage[]> =>
  (await call<{ messages: OutboundMessage[] }>('/__mock/messages')).messages

export async function findTemplate(name: string, language: string): Promise<Template | undefined> {
  const { data } = await call<{ data: Template[] }>(`${templatesPath()}?name=${encodeURIComponent(name)}`)
  return data.find((t) => t.language === language)
}

export const sendInbound = (from: string, text: string, name?: string): Promise<unknown> =>
  post('/__mock/inbound', { from, text, name, phone_number_id: config.phoneNumberId })

export const createTemplate = (template: NewTemplate): Promise<unknown> => post(templatesPath(), template)

export const approveTemplate = (name: string, language: string): Promise<unknown> =>
  post(`/__mock/templates/${encodeURIComponent(name)}/${encodeURIComponent(language)}/transition?waba_id=${config.wabaId}`, {
    to: 'APPROVED',
  })
