import { log } from '../core/log.ts'
import { approveTemplate, createTemplate, findTemplate } from './client.ts'
import { templates } from './templates.ts'
import type { NewTemplate } from './types.ts'

/** Daftarkan template ke wamock lalu setujui. State wamock di memori: jalankan ulang setelah restart. */
export async function seed(list: NewTemplate[] = templates): Promise<void> {
  for (const t of list) {
    if (!(await findTemplate(t.name, t.language))) await createTemplate(t)
    await approveTemplate(t.name, t.language)
    log(`seed ${t.name}/${t.language} APPROVED`)
  }
}
