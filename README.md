# Romantic Website

Romantic Website adalah aplikasi full-stack berbasis `Next.js` yang menampilkan galeri foto 3D interaktif dengan nuansa cinematic.  
Pengunjung bisa menikmati scene partikel dan orbit foto, sementara admin bisa mengelola foto + pengaturan visual lewat dashboard.

## Fitur Utama

- Landing page 3D interaktif menggunakan `react-three-fiber` + `three.js`
- Public route berbasis slug: `/<slug>` untuk memuat pasangan, foto, dan konfigurasi yang berbeda
- Efek partikel orbit, floating text, kamera sinematik, dan post-processing
- Galeri foto yang diambil dari database Supabase
- Admin panel untuk:
  - upload/hapus foto (Cloudinary)
  - update pengaturan scene (warna, teks, jumlah partikel)
- Auth admin berbasis JWT + cookie session
- API route terpisah untuk public dan admin
- Script generator QR code untuk URL website

## Tech Stack

- Frontend: `Next.js 16`, `React 19`, `Tailwind CSS 4`
- 3D: `@react-three/fiber`, `@react-three/drei`, `three`, `@react-three/postprocessing`
- Backend/API: Next.js Route Handlers
- Database: `Supabase` (PostgreSQL + RLS, ready for multi-tenant clients)
- Media storage: `Cloudinary`
- State management: `Zustand`
- Validation: `Zod`
- Testing: `Vitest` + integration tests

## Struktur Folder Inti

```txt
src/
  app/                    # App Router pages + API routes
  components/
    scene/                # Komponen 3D public scene
    admin/                # Komponen dashboard admin
    ui/                   # Reusable UI components
  lib/                    # Supabase, Cloudinary, validators, helpers
  store/                  # Zustand stores
  __tests__/              # Unit + integration tests
supabase/
  schema.sql              # DB schema + RLS policies
  seed.sql                # Initial multi-tenant seed data
scripts/
  generate-qr.mjs         # Generator QR code image
```

## Prasyarat

- Node.js 18+ (disarankan Node.js 20)
- npm
- Akun Supabase
- Akun Cloudinary

## Setup Local

1. Install dependency

```bash
npm install
```

2. Buat env file

```bash
cp .env.example .env
```

3. Isi semua variabel di `.env`

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

4. Setup database Supabase

- Jalankan isi file `supabase/schema.sql`
- Lalu jalankan `supabase/seed.sql`

5. Jalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Scripts

- `npm run dev` - jalankan development server
- `npm run build` - build production
- `npm run start` - run hasil build
- `npm run lint` - linting
- `npm run test` - jalankan test sekali
- `npm run test:watch` - test mode watch
- `npm run test:ui` - test verbose reporter
- `npm run generate:qr` - generate QR image ke `public/website-qr.png`

## API Ringkas

Public:
- `GET /api/clients`
- `GET /api/clients?slug=<slug>`
- `GET /api/public/gallery`
- `GET /api/public/gallery?slug=<slug>`

Admin Auth:
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`

Admin Content:
- `GET /api/admin/images`
- `GET /api/admin/images?slug=<slug>`
- `GET /api/admin/images?client_id=<uuid>`
- `POST /api/admin/images`
- `DELETE /api/admin/images/[id]`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `POST /api/admin/cloudinary-signature`

## Kustomisasi Visual Cepat

- Partikel & orbit: `src/components/scene/OrbitingFrames.tsx`
- Partikel pembentuk Love 3D: `src/components/scene/CenterSphere.tsx`
- Floating text: `src/components/scene/FloatingMessage.tsx`
- Scene utama: `src/components/scene/Scene3D.tsx`

## Deployment

Rekomendasi deploy di Vercel:

1. Push project ke GitHub
2. Import project ke Vercel
3. Tambahkan seluruh env vars yang sama dengan `.env`
4. Deploy
5. Verifikasi endpoint `/` dan `/admin`

Catatan public route:

- `/` akan redirect ke `/default`
- QR code multi-tenant sebaiknya diarahkan ke `/<slug>`

## Catatan

- `seed.sql` menggunakan `ON CONFLICT DO UPDATE` untuk `clients` dan `site_settings`, jadi menjalankan seed ulang akan memperbarui konfigurasi default.
- `gallery_images` sekarang terkait ke `clients` melalui `client_id`, dan public RLS membaca header `x-client-slug` dengan fallback ke slug `default` selama migrasi dynamic route belum selesai.
- Jika perubahan visual belum terlihat, lakukan hard refresh browser (`Ctrl+F5`).
