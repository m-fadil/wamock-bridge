import type { WASocket } from '@whiskeysockets/baileys'
import { config } from '../core/config.ts'
import { log } from '../core/log.ts'
import { listOutbound } from '../mock/client.ts'
import { renderText } from './render.ts'

export type Send = (to: string, text: string) => Promise<unknown>

/**
 * Satu putaran poll: kirim pesan wamock yang belum pernah terlihat.
 * Putaran pertama hanya menandai pesan lama, jadi yang dikirim sebelum bridge hidup tidak dikirim ulang.
 */
export function createPump(send: Send): () => Promise<void> {
  const seen = new Set<string>()
  let primed = false

  return async () => {
    for (const msg of await listOutbound()) {
      if (seen.has(msg.id)) continue
      seen.add(msg.id)
      if (!primed) continue
      try {
        const text = await renderText(msg)
        await send(msg.to, text)
        log(`OUT -> ${msg.to}: ${text}`)
      } catch (e) {
        log(`OUT GAGAL -> ${msg.to}: ${(e as Error).message}`)
      }
    }
    primed = true
  }
}

/** Poll pesan keluar wamock dan kirim ke WhatsApp asli. Mengembalikan fungsi stop. */
export function startOutbound(sock: WASocket): () => void {
  const pump = createPump((to, text) => sock.sendMessage(`${to}@s.whatsapp.net`, { text }))
  const timer = setInterval(() => pump().catch((e) => log('poll gagal:', e.message)), config.pollMs)
  return () => clearInterval(timer)
}
