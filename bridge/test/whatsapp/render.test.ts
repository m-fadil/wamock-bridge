import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import type { OutboundMessage } from '../../src/mock/types.ts'
import { renderText } from '../../src/whatsapp/render.ts'
import { stubFetch } from '../helpers.ts'

afterEach(() => mock.restoreAll())

const msg = (type: string, payload: Record<string, unknown>): OutboundMessage => ({ id: 'wamid.1', to: '62812', type, payload })

const template = (components: unknown[]): OutboundMessage =>
  msg('template', { template: { name: 'imp_otp_code', language: { code: 'en_US' }, components } })

describe('renderText', () => {
  it('teks biasa dikembalikan apa adanya', async () => {
    assert.equal(await renderText(msg('text', { text: { body: 'halo' } })), 'halo')
  })

  it('payload template asli dari wamock 0.7.1 (OTP) dirender', async () => {
    stubFetch(() => ({ data: [{ name: 'imp_otp_code', language: 'en_US', components: [{ type: 'BODY', text: 'Kode OTP Anda {{1}}' }] }] }))
    const captured = { template: { name: 'imp_otp_code', language: { code: 'en_US' }, components: [{ type: 'body', parameters: [{ type: 'text', text: '660622' }] }] } }
    assert.equal(await renderText(msg('template', captured)), 'Kode OTP Anda 660622')
  })

  it('tipe lain diringkas dan dipotong 200 karakter payload', async () => {
    const out = await renderText(msg('image', { link: 'x'.repeat(500) }))
    assert.ok(out.startsWith('[image] {"link":"xxx'))
    assert.equal(out.length, '[image] '.length + 200)
  })

  it('template: {{n}} diisi dari parameter body', async () => {
    stubFetch(() => ({
      data: [{ name: 'imp_otp_code', language: 'en_US', components: [{ type: 'BODY', text: 'Kode {{1}} untuk {{2}}' }] }],
    }))
    const out = await renderText(template([{ type: 'body', parameters: [{ text: '123456' }, { text: 'Budi' }] }]))
    assert.equal(out, 'Kode 123456 untuk Budi')
  })

  it('template: parameter yang hilang menjadi string kosong', async () => {
    stubFetch(() => ({ data: [{ name: 'imp_otp_code', language: 'en_US', components: [{ type: 'BODY', text: 'Kode {{1}}' }] }] }))
    assert.equal(await renderText(template([])), 'Kode ')
  })

  it('template tak terdaftar jatuh ke placeholder bernama', async () => {
    stubFetch(() => ({ data: [] }))
    assert.equal(await renderText(template([])), '[template imp_otp_code]')
  })
})
