import type { WAMessage, WASocket } from '@whiskeysockets/baileys'
import { log } from '../core/log.ts'
import { sendInbound } from '../mock/client.ts'

export function textOf(m: WAMessage): string | undefined {
  return m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? undefined
}

/** Nomor pengirim; JID @lid tidak memuat nomor, aslinya ada di remoteJidAlt. */
export function senderOf(m: WAMessage): string {
  const jid = m.key.remoteJid ?? ''
  const real = jid.endsWith('@lid') ? (m.key.remoteJidAlt ?? jid) : jid
  return real.split('@')[0]!.split(':')[0]!
}

/** Teruskan teks masuk dari WhatsApp asli ke wamock (/__mock/inbound -> webhook ke Frappe). */
export function startInbound(sock: WASocket): void {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      const text = textOf(m)
      if (m.key.fromMe || !text) continue
      const from = senderOf(m)
      log(`IN  <- ${from}: ${text}`)
      try {
        await sendInbound(from, text, m.pushName ?? undefined)
      } catch (e) {
        log(`IN gagal diteruskan: ${(e as Error).message}`)
      }
    }
  })
}
