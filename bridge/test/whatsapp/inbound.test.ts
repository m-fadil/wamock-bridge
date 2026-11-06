import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import type { WAMessage, WASocket } from '@whiskeysockets/baileys'
import { config } from '../../src/core/config.ts'
import { senderOf, startInbound, textOf } from '../../src/whatsapp/inbound.ts'
import { captureLog, stubFetch } from '../helpers.ts'

afterEach(() => mock.restoreAll())

const wa = (m: Record<string, unknown>): WAMessage => m as unknown as WAMessage

describe('senderOf', () => {
  it('JID biasa: nomor sebelum @', () => {
    assert.equal(senderOf(wa({ key: { remoteJid: '628123@s.whatsapp.net' } })), '628123')
  })

  it('JID dengan sufiks device dibuang', () => {
    assert.equal(senderOf(wa({ key: { remoteJid: '628123:12@s.whatsapp.net' } })), '628123')
  })

  it('JID @lid memakai remoteJidAlt', () => {
    assert.equal(senderOf(wa({ key: { remoteJid: '999@lid', remoteJidAlt: '628123@s.whatsapp.net' } })), '628123')
  })

  it('JID @lid tanpa remoteJidAlt jatuh ke id lid', () => {
    assert.equal(senderOf(wa({ key: { remoteJid: '999@lid' } })), '999')
  })
})

describe('textOf', () => {
  it('conversation dan extendedTextMessage', () => {
    assert.equal(textOf(wa({ message: { conversation: 'a' } })), 'a')
    assert.equal(textOf(wa({ message: { extendedTextMessage: { text: 'b' } } })), 'b')
  })

  it('bukan teks -> undefined', () => {
    assert.equal(textOf(wa({ message: { imageMessage: {} } })), undefined)
    assert.equal(textOf(wa({})), undefined)
  })
})

describe('startInbound', () => {
  type Upsert = (e: { messages: WAMessage[]; type: string }) => Promise<void>

  function attach(): Upsert {
    let handler: Upsert | undefined
    const sock = { ev: { on: (_event: string, fn: Upsert) => void (handler = fn) } } as unknown as WASocket
    startInbound(sock)
    assert.ok(handler)
    return handler
  }

  const incoming = (extra: Record<string, unknown> = {}): WAMessage =>
    wa({ key: { remoteJid: '628123@s.whatsapp.net', fromMe: false }, message: { conversation: 'halo' }, pushName: 'Budi', ...extra })

  it('meneruskan teks masuk ke wamock dengan nama pengirim', async () => {
    captureLog()
    const calls = stubFetch(() => ({}))
    await attach()({ messages: [incoming()], type: 'notify' })
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0]!.body, { from: '628123', text: 'halo', name: 'Budi', phone_number_id: config.phoneNumberId })
  })

  it('mengabaikan fromMe, pesan tanpa teks, dan event selain notify', async () => {
    captureLog()
    const calls = stubFetch(() => ({}))
    const handler = attach()
    await handler({ messages: [incoming({ key: { remoteJid: '628123@s.whatsapp.net', fromMe: true } })], type: 'notify' })
    await handler({ messages: [incoming({ message: { imageMessage: {} } })], type: 'notify' })
    await handler({ messages: [incoming()], type: 'append' })
    assert.equal(calls.length, 0)
  })

  it('gagal meneruskan dicatat dan pesan berikutnya tetap diproses', async () => {
    const log = captureLog()
    let n = 0
    const calls = stubFetch(() => (n++ === 0 ? new Response('down', { status: 502 }) : {}))
    await attach()({ messages: [incoming(), incoming({ message: { conversation: 'lagi' } })], type: 'notify' })
    assert.equal(calls.length, 2)
    assert.ok(log.some((l) => l.includes('IN gagal diteruskan')))
  })
})

