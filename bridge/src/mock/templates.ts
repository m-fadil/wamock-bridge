import type { NewTemplate } from './types.ts'

/** Template yang dipakai Frappe. language = WhatsApp Templates.language_code (en_US, bukan en: 132001). */
export const templates: NewTemplate[] = [
  {
    name: 'hello_world',
    language: 'en_US',
    category: 'UTILITY',
    components: [{ type: 'BODY', text: 'Welcome and congratulations!!' }],
  },
  {
    name: 'imp_otp_code',
    language: 'en_US',
    category: 'UTILITY',
    components: [{ type: 'BODY', text: 'Kode OTP Anda {{1}}', example: { body_text: [['123456']] } }],
  },
]
