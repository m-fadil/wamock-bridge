/** Pesan keluar yang dicatat wamock (GET /__mock/messages). */
export interface OutboundMessage {
  id: string
  /** Penerima dalam bentuk wa_id: digit saja. */
  to: string
  type: string
  payload: Record<string, unknown>
}

/** Template seperti dikembalikan Graph API. */
export interface Template {
  name: string
  language: string
  components: { type: string; text?: string }[]
}

/** Template yang didaftarkan lewat POST /message_templates. */
export interface NewTemplate {
  name: string
  language: string
  category: string
  components: Record<string, unknown>[]
}
