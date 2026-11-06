import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { seed } from '../../src/mock/seed.ts'
import { captureLog, stubFetch } from '../helpers.ts'

afterEach(() => mock.restoreAll())

const tpl = { name: 'otp', language: 'en_US', category: 'UTILITY', components: [] }

describe('seed', () => {
  it('membuat template yang belum ada lalu menyetujuinya', async () => {
    const log = captureLog()
    const calls = stubFetch((c) => (c.method === 'GET' ? { data: [] } : {}))
    await seed([tpl])
    assert.deepEqual(
      calls.map((c) => `${c.method} ${c.url.includes('transition') ? 'transition' : 'templates'}`),
      ['GET templates', 'POST templates', 'POST transition'],
    )
    assert.match(log[0]!, /seed otp\/en_US APPROVED/)
  })

  it('tidak membuat ulang template yang sudah ada, tetap menyetujui', async () => {
    captureLog()
    const calls = stubFetch((c) => (c.method === 'GET' ? { data: [{ ...tpl, components: [] }] } : {}))
    await seed([tpl])
    assert.deepEqual(calls.map((c) => c.method), ['GET', 'POST'])
    assert.match(calls[1]!.url, /transition/)
  })

  it('error dari wamock menghentikan seed', async () => {
    captureLog()
    stubFetch(() => new Response('nope', { status: 400 }))
    await assert.rejects(seed([tpl]), /400 nope/)
  })
})
