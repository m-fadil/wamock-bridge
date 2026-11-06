import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ensureImage, ImageUnavailableError, type Run } from '../../src/docker/image.ts'

const IMAGE = 'ghcr.io/alrashidmtz/wamock:0.7.1'
const compose = JSON.stringify({ services: { wamock: { image: IMAGE }, bridge: {} } })

/** Run palsu: `config` mengembalikan compose, `pull` memakai pullResult. */
function fakeRun(pullResult: () => void): { run: Run; calls: string[][] } {
  const calls: string[][] = []
  const run: Run = async (_cmd, args) => {
    calls.push(args)
    if (args.includes('config')) return compose
    pullResult()
    return ''
  }
  return { run, calls }
}

const failWith = (stderr: string) => () => {
  throw Object.assign(new Error('Command failed'), { stderr })
}

describe('ensureImage', () => {
  it('pull sukses mengembalikan nama image dan menarik service yang diminta', async () => {
    const { run, calls } = fakeRun(() => {})
    assert.equal(await ensureImage('wamock', '/root', run), IMAGE)
    assert.deepEqual(calls[1], ['compose', 'pull', '--quiet', 'wamock'])
  })

  for (const stderr of [
    'Error response from daemon: failed to resolve reference: not found',
    'Error response from daemon: error from registry: denied',
    'manifest unknown',
    'unauthorized: authentication required',
  ]) {
    it(`"${stderr}" -> ImageUnavailableError dengan nama image`, async () => {
      const { run } = fakeRun(failWith(stderr))
      await assert.rejects(ensureImage('wamock', '/root', run), (e) => {
        assert.ok(e instanceof ImageUnavailableError)
        assert.equal(e.image, IMAGE)
        assert.equal(e.detail, stderr)
        return true
      })
    })
  }

  it('kegagalan lain (offline) bukan ImageUnavailableError', async () => {
    const { run } = fakeRun(failWith('dial tcp: lookup ghcr.io: no such host'))
    await assert.rejects(ensureImage('wamock', '/root', run), (e) => {
      assert.ok(!(e instanceof ImageUnavailableError))
      assert.match((e as Error).message, /gagal memeriksa image .*no such host/)
      return true
    })
  })

  it('service tanpa image ditolak tanpa mencoba pull', async () => {
    const { run, calls } = fakeRun(() => {})
    await assert.rejects(ensureImage('bridge', '/root', run), /service bridge tidak punya image/)
    assert.equal(calls.length, 1)
  })
})
