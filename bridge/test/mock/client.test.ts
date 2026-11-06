import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { config } from '../../src/core/config.ts'
import { approveTemplate, createTemplate, findTemplate, listOutbound, sendInbound } from '../../src/mock/client.ts'
import { stubFetch } from '../helpers.ts'

afterEach(() => mock.restoreAll())

describe('mock client', () => {
  it('listOutbound membuka envelope messages', async () => {
    const calls = stubFetch(() => ({ messages: [{ id: 'wamid.1', to: '62812', type: 'text', payload: {} }] }))
    const msgs = await listOutbound()
    assert.deepEqual(msgs.map((m) => m.id), ['wamid.1'])
    assert.equal(calls[0]!.url, `${config.mockUrl}/__mock/messages`)
  })

  it('findTemplate memilih bahasa yang cocok dan meng-encode nama', async () => {
    const calls = stubFetch(() => ({
      data: [
        { name: 'a b', language: 'id', components: [] },
        { name: 'a b', language: 'en_US', components: [{ type: 'BODY', text: 'hi' }] },
      ],
    }))
    const found = await findTemplate('a b', 'en_US')
    assert.equal(found?.components[0]?.text, 'hi')
    assert.match(calls[0]!.url, /message_templates\?name=a%20b$/)
    assert.equal(await findTemplate('a b', 'fr'), undefined)
  })

  it('sendInbound mengirim phone_number_id', async () => {
    const calls = stubFetch(() => ({}))
    await sendInbound('62812', 'halo', 'Budi')
    assert.equal(calls[0]!.method, 'POST')
    assert.deepEqual(calls[0]!.body, { from: '62812', text: 'halo', name: 'Budi', phone_number_id: config.phoneNumberId })
  })

  it('createTemplate POST ke message_templates WABA', async () => {
    const calls = stubFetch(() => ({}))
    const template = { name: 'n', language: 'en_US', category: 'UTILITY', components: [] }
    await createTemplate(template)
    assert.equal(calls[0]!.url, `${config.mockUrl}/${config.graphVersion}/${config.wabaId}/message_templates`)
    assert.deepEqual(calls[0]!.body, template)
  })

  it('approveTemplate transisi ke APPROVED dengan waba_id', async () => {
    const calls = stubFetch(() => ({}))
    await approveTemplate('imp_otp_code', 'en_US')
    assert.equal(calls[0]!.url, `${config.mockUrl}/__mock/templates/imp_otp_code/en_US/transition?waba_id=${config.wabaId}`)
    assert.deepEqual(calls[0]!.body, { to: 'APPROVED' })
  })

  it('status non-2xx melempar error berisi path, status, dan body', async () => {
    stubFetch(() => new Response('boom', { status: 500 }))
    await assert.rejects(listOutbound(), /\/__mock\/messages -> 500 boom/)
  })
})
