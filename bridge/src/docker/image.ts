import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** Jalankan perintah di cwd; mengembalikan stdout, melempar Error (dengan stderr) kalau exit != 0. */
export type Run = (cmd: string, args: string[], cwd: string) => Promise<string>

export const run: Run = async (cmd, args, cwd) => (await execFileAsync(cmd, args, { cwd })).stdout

/** Image utama tidak bisa ditarik: dihapus dari registry, tag tidak ada, atau jadi private. */
export class ImageUnavailableError extends Error {
  image: string
  detail: string

  constructor(image: string, detail: string) {
    super(`image ${image} tidak ada atau tidak bisa diakses (${detail})`)
    this.name = 'ImageUnavailableError'
    this.image = image
    this.detail = detail
  }
}

const UNAVAILABLE = /not found|manifest unknown|denied|unauthorized|forbidden|requires authentication/i

const stderrOf = (e: unknown): string => {
  const { stderr, message } = e as { stderr?: string; message: string }
  return (stderr || message).trim()
}

/**
 * Tarik image service dari registry. Tidak ada fallback ke salinan lokal: kalau registry
 * menjawab tidak ada/ditolak, lempar ImageUnavailableError; kegagalan lain (mis. offline) dilempar apa adanya.
 */
export async function ensureImage(service: string, cwd: string, exec: Run = run): Promise<string> {
  const config = JSON.parse(await exec('docker', ['compose', 'config', '--format', 'json'], cwd)) as {
    services: Record<string, { image?: string }>
  }
  const image = config.services[service]?.image
  if (!image) throw new Error(`service ${service} tidak punya image di compose.yaml`)

  try {
    await exec('docker', ['compose', 'pull', '--quiet', service], cwd)
  } catch (e) {
    const output = stderrOf(e)
    const detail = output.split('\n').at(-1)!.trim()
    if (UNAVAILABLE.test(output)) throw new ImageUnavailableError(image, detail)
    throw new Error(`gagal memeriksa image ${image}: ${detail}`)
  }
  return image
}
