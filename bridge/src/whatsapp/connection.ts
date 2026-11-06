import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { config } from '../core/config.ts'
import { log } from '../core/log.ts'
import { startInbound } from './inbound.ts'
import { startOutbound } from './outbound.ts'

/** Login QR, lalu pasang jalur keluar dan masuk; menyambung ulang kalau putus. */
export async function connect(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir)
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) })
  let stopOutbound = (): void => {}

  sock.ev.on('creds.update', saveCreds)
  startInbound(sock)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      log('Scan QR: WhatsApp > Perangkat tertaut > Tautkan perangkat')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') {
      log(`terhubung sebagai ${sock.user?.id}`)
      stopOutbound = startOutbound(sock)
    }
    if (connection === 'close') {
      stopOutbound()
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        log(`logout; hapus folder ${config.authDir}/ lalu jalankan ulang untuk scan QR baru`)
        process.exit(1)
      }
      log(`koneksi putus (${code}), menyambung ulang`)
      void connect()
    }
  })
}
