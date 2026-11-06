import { mock } from 'node:test'

export interface Call {
  url: string
  method: string
  body: unknown
}

/** Ganti fetch global; handler mengembalikan JSON respons (atau Response utuh untuk status non-200). */
export function stubFetch(handler: (call: Call) => unknown): Call[] {
  const calls: Call[] = []
  mock.method(globalThis, 'fetch', async (url: string | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(url),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    }
    calls.push(call)
    const out = handler(call)
    return out instanceof Response ? out : Response.json(out)
  })
  return calls
}

/** Diamkan console.log (log()) dan kembalikan baris yang tercetak. */
export function captureLog(): string[] {
  const lines: string[] = []
  mock.method(console, 'log', (...args: unknown[]) => void lines.push(args.slice(1).join(' ')))
  return lines
}
