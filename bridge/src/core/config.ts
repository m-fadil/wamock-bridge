const env = process.env

export const config = {
  /** Base URL wamock (Graph API + control API). */
  mockUrl: env['WAMOCK_URL'] ?? 'http://localhost:4005',
  wabaId: env['WAMOCK_WABA'] ?? '123xxx',
  phoneNumberId: env['WAMOCK_PHONE_ID'] ?? '123xxx',
  graphVersion: env['WAMOCK_VERSION'] ?? 'v25.0',
  pollMs: Number(env['BRIDGE_POLL_MS'] ?? 1000),
  /** Folder sesi Baileys; hapus untuk scan QR ulang. */
  authDir: env['BRIDGE_AUTH_DIR'] ?? 'auth',
}
