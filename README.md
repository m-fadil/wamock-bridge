# wamock-bridge

Meta-like WhatsApp mock (`ghcr.io/alrashidmtz/wamock:0.7.1`, host `localhost:4005`) plus a Baileys QR bridge, via `docker compose`.

Proyek ini berdiri di atas [alrashidmtz/wamock](https://github.com/alrashidmtz/wamock) (MIT). Mock WhatsApp Cloud API-nya sepenuhnya karya mereka; repo ini hanya menjalankan image resminya dan menambah bridge di sampingnya, tanpa mengubah kode wamock.

## Setup
```
cp .env.example .env   # isi WEBHOOK_VERIFY_TOKEN = webhook_verify_token WhatsApp Account "<account>"
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs seed          # "seed <name>/en_US APPROVED" dua kali
curl -s localhost:4005/__mock/state
```
`up -d` memakai image rilis `ghcr.io/m-fadil/wamock-bridge:latest`; tambahkan `--build` untuk membangun bridge dari `./bridge` dan memakai hasilnya.

## Image utama hilang / private
Tanpa fallback. `docker compose up` saja memakai image yang sudah ada di cache lokal, dan kalau tidak ada di cache, berhenti di tahap pull dengan error mentah dari docker (seed dan bridge tidak ikut jalan). Supaya hilang/private selalu terdeteksi dengan pesan jelas, jalankan preflight sebelum `up`; preflight menarik ulang image dari registry:
```
npm --prefix bridge run preflight && docker compose up -d --build
```
Exit 1 dengan `TIDAK BISA DIGUNAKAN: repo utama wamock tidak ada atau tidak bisa diakses` bila registry menjawab not found/denied. Salinan image di cache lokal tidak dipakai sebagai pengganti. Kegagalan lain (mis. offline) dilaporkan apa adanya.

## Bridge / QR
```
docker compose up -d bridge && docker compose logs -f bridge
```
Scan QR (WhatsApp > Perangkat tertaut) dengan nomor cadangan (Baileys tidak resmi, ada risiko banned). Sesi disimpan di volume `bridge-auth`, bertahan setelah `down` tapi tidak setelah `down -v`. Bridge `restart: "no"` karena exit 1 saat logout.

## Re-seed
State wamock ada di memori. Setelah `docker compose restart wamock`:
```
docker compose run --rm seed
```
Template lain: tambah entri di `bridge/src/mock/templates.ts`. Jalan lokal: `cd bridge && npm run seed`.

## Struktur bridge
```
bridge/
  src/
    index.ts        entry: bridge QR (npm start)
    seed.ts         entry: seed template (npm run seed)
    core/           config (env), log
    mock/           sisi wamock: client HTTP, types, templates, seed()
    whatsapp/       sisi Baileys: connection, inbound, outbound, render
  test/             unit test (node:test), cermin struktur src/
```
Perintah di `bridge/`: `npm run lint`, `npm run typecheck`, `npm test`.

## Jaringan Frappe
Frappe jalan di container `frappe` (network `frappe_default`, port 8001 tidak dipublish). `wamock` ikut network itu:
- wamock -> Frappe: `http://frappe:8001/...` (`serve_default_site` + `default_site`, jadi Host tidak perlu nama site).
- Frappe -> wamock: WhatsApp Account `<account>` `url` = `http://wamock:4004` (bukan `localhost:4005`, itu loopback container Frappe).
- Dari host: `localhost:4005`.

## CI dan release
- `.github/workflows/ci.yml` (push ke `main` dan PR): lint, typecheck, test bridge; `docker compose config` dan build image bridge.
- `.github/workflows/release.yml` (tag `vX.Y.Z`): jalankan check yang sama, push image `ghcr.io/<owner>/<repo>` (tag `X.Y.Z`, `X.Y`, `latest`), lalu buat GitHub Release dengan release notes otomatis.
```
git tag v0.1.0 && git push origin v0.1.0
```

## Kredit
- [alrashidmtz/wamock](https://github.com/alrashidmtz/wamock): mock WhatsApp Cloud API, dipakai sebagai image `ghcr.io/alrashidmtz/wamock`. Lisensi MIT.
- [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys): library WhatsApp Web yang dipakai bridge. Tidak resmi dari WhatsApp/Meta.
