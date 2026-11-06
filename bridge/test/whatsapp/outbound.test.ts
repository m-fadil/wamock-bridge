import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { createPump } from '../../src/whatsapp/outbound.ts'
import { captureLog, stubFetch } from '../helpers.ts'

afterEach(() => mock.restoreAll())

const text = (id: string, body: string) => ({ id, to: '62812', type: 'text', payload: { text: { body } } })

describe('createPump', () => {
  it('putaran pertama hanya menandai pesan lama, tidak mengirim', async () => {
    captureLog()
    stubFetch(() => ({ messages: [text('1', 'lama')] }))
    const sent: string[] = []
    await createPump(async (_to, t) => void sent.push(t))()
    assert.deepEqual(sent, [])
  })

  it('pesan baru dikirim sekali, tidak diulang di putaran berikutnya', async () => {
    captureLog()
    let messages = [text('1', 'lama')]
    stubFetch(() => ({ messages }))
    const sent: [string, string][] = []
    const pump = createPump(async (to, t) => void sent.push([to, t]))

    await pump()
    messages = [...messages, text('2', 'baru')]
    await pump()
    await pump()

    assert.deepEqual(sent, [['62812', 'baru']])
  })

  it('gagal kirim dicatat, tidak melempar, dan tidak dicoba ulang', async () => {
    const log = captureLog()
    let messages = [text('1', 'lama')]
    stubFetch(() => ({ messages }))
    let attempts = 0
    const pump = createPump(async () => {
      attempts++
      throw new Error('socket tertutup')
    })

    await pump()
    messages = [...messages, text('2', 'baru')]
    await pump()
    await pump()

    assert.equal(attempts, 1)
    assert.ok(log.some((l) => l.includes('OUT GAGAL -> 62812: socket tertutup')))
  })

  it('gagal poll wamock merambat ke pemanggil dan putaran pertama belum dianggap selesai', async () => {
    captureLog()
    let fail = true
    stubFetch(() => (fail ? new Response('down', { status: 503 }) : { messages: [text('1', 'lama')] }))
    const sent: string[] = []
    const pump = createPump(async (_to, t) => void sent.push(t))

    await assert.rejects(pump(), /503/)
    fail = false
    await pump()
    assert.deepEqual(sent, [])
  })
})
