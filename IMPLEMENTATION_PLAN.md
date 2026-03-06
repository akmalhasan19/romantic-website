# Multi-Tenant QR Code Implementation Plan

Tujuan: Membuat struktur website dan database agar dapat melayani pasangan yang berbeda (dengan foto, lagu, dan konfigurasi yang berbeda) berdasarkan URL spesifik yang dihasilkan dari QR Code, menggunakan 1 codebase dan 1 Admin Panel yang sama.

## 1. Persiapan Database (Supabase)
- [x] Buat tabel baru `clients` (id, slug, name, created_at) di `supabase/seed.sql` dan dashboard Supabase.
- [x] Modifikasi tabel `images`
  - Tambahkan kolom `client_id` sebagai Foreign Key ke tabel `clients`.
  - Update RLS (Row Level Security) agar gambar hanya bisa diakses berdasarkan `client_id` terkait.
- [x] Modifikasi tabel `settings` (jika ada) atau pindahkan konfigurasi (warna Love 3D, particle density, lagu) ke tabel `clients` agar bisa dikustomisasi per pasangan.

## 2. Persiapan Backend API (Next.js App Router)
- [x] Buat API Endpoint baru `/api/clients` untuk Fetch data klien (Slug, Tema, dsb).
- [x] Update API `/api/images/[slug]` atau `/api/images` agar memfilter data gambar berdasarkan `slug` (yang dikirimkan lewat Request url/body).
- [x] Pastikan upload endpoint (Admin) dapat menerima parameter `client_id` sehingga Foto tersimpan untuk pasangan yang sesuai.

## 3. Dynamic Routing & Frontend Website
- [x] Refactor struktur halaman utama.
  - Pindahkan isi `src/app/page.tsx` ke dalam Dynamic Route `src/app/[slug]/page.tsx`.
- [x] Update state management (`zustand`/`context`).
  - Modify `GalleryStore` untuk menerima parameter `slug` saat `fetchPublicData(slug)`.
- [x] Tampilkan UI Loading atau Error Not Found ("Halaman Tidak Ditemukan / QR Tidak Valid") jika `slug` tidak terdaftar di database.

## 4. Pengembangan Admin Panel
- [ ] Tambahkan Halaman/Menu "Manajemen Klien" di Admin Panel.
  - Form untuk membuat Klien/Pasangan Baru (Input Nama & Slug otomatis).
- [ ] Update Form Upload Foto di Admin.
  - Tambahkan Dropdown (Select Box) untuk memilih klien yang ingin ditambahkan fotonya.
- [ ] Tambahkan fitur "Generate QR Code" di Admin Panel.
  - Admin dapat mendownload gambar QR Code yang mengarah otomatis ke `domain.com/[slug]`.

## 5. Testing & Penyelarasan Animasi
- [ ] Uji coba akses `domain.com/pasangan_a` vs `domain.com/pasangan_b` (Pastikan foto yang mengorbit berbeda).
- [ ] Uji coba efek transisi audio dan mata tertutup (`page.tsx`) agar tetap berfungsi sempurna di *Dynamic Route*.
- [ ] Selesai! Deploy struktur terbaru.
