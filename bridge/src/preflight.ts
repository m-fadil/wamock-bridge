import { resolve } from 'node:path'
import { ensureImage, ImageUnavailableError } from './docker/image.ts'

const root = resolve(import.meta.dirname, '../..')

try {
  const image = await ensureImage('wamock', root)
  console.log(`image ${image} tersedia`)
} catch (e) {
  if (e instanceof ImageUnavailableError) {
    console.error(`TIDAK BISA DIGUNAKAN: repo utama wamock tidak ada atau tidak bisa diakses.\n  ${e.message}`)
  } else {
    console.error(`TIDAK BISA DIGUNAKAN: ${(e as Error).message}`)
  }
  process.exit(1)
}
