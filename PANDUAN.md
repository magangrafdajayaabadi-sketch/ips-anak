# Panduan Lengkap — Petualangan IPS Ceria

Panduan ini untuk **tiga peran** sekaligus. Loncat ke bagian yang Anda butuhkan:

| Saya adalah… | Baca bagian |
|---|---|
| **Guru / pengguna** yang mau memakai game | [3. Cara Bermain](#3-cara-bermain-untuk-anak) · [4. Panel Admin](#4-panel-admin-untuk-guru) |
| **Orang yang mau menerbitkan** game ini ke internet | [2. Deploy ke Vercel](#2-deploy-ke-vercel) |
| **Developer / reseller** yang mau menjual versi ber-merek | [5. White-label](#5-white-label-menjual-versi-ber-merek) · [6. Mengubah Soal](#6-menambah--mengubah-soal) |

---

## 1. Mengenal Aplikasi

**Petualangan IPS Ceria** adalah game IPS interaktif untuk anak SD. Isinya **15 permainan**
(8 kuis topik + 7 tantangan) dengan **870 butir soal/kartu**. Tujuh kuis topik utama
punya 30 soal per level (90 per topik), kuis dunia punya 30 soal total, dan tiap game
tantangan punya 10 butir per level. Semua bertingkat kesulitan.

### Yang perlu Anda pahami sejak awal

Aplikasi ini **statis sepenuhnya**: tidak ada server, tidak ada database, tidak ada login akun.
Semua data (nama pemain, bintang, room, pengaturan) disimpan di **localStorage browser
masing-masing perangkat**.

Konsekuensinya — dan ini **penting**, jangan sampai salah janji ke pembeli/sekolah:

| Hal | Kenyataannya |
|---|---|
| Biaya hosting | **Gratis** di Vercel. Tidak ada database yang perlu dibayar. |
| Instalasi | Tidak ada. Anak tinggal buka link, tulis nama, main. |
| Papan bintang | **Per perangkat.** Dua anak di dua HP berbeda dengan kode room sama **tidak** saling melihat skor. |
| Pengaturan admin | **Per perangkat.** Ubah di tablet A tidak berpengaruh di tablet B (kecuali diubah lewat `config.js`, lihat bagian 5). |
| Password admin | Penghalang ringan, **bukan pengaman data**. Lihat [bagian 8](#8-batasan--keamanan). |

Kalau butuh papan bintang **lintas perangkat** yang sesungguhnya, itu perlu **mode server**
(mis. Vercel Serverless + Vercel KV / Upstash Redis) — belum ada di versi ini.

### Struktur file

```
ips-ceria/
├── index.html   ← halaman game
├── admin.html   ← halaman Panel Admin (terpisah, pakai password)
├── config.js    ← ⭐ PENGATURAN PERMANEN — file yang paling sering Anda edit
├── brand.js     ← lapisan bersama: config, tema, penyimpanan
├── data.js      ← ⭐ SEMUA SOAL (870 butir/kartu)
├── app.js       ← logika game
├── admin.js     ← logika panel admin
├── app.css      ← desain & sistem warna
├── vercel.json  ← konfigurasi Vercel
├── README.md    ← ringkasan teknis
└── PANDUAN.md   ← file ini
```

Hanya **`config.js`** dan **`data.js`** yang perlu Anda sentuh untuk pemakaian normal.

---

## 2. Deploy ke Vercel

### 2.1 Persiapan (2 menit)

1. Punya akun **[vercel.com](https://vercel.com)** — daftar gratis, bisa pakai akun GitHub/Google.
2. **Sebelum deploy, buka `config.js` dan ganti password admin:**

   ```js
   adminPassword: "admin123"      // ❌ JANGAN dibiarkan
   adminPassword: "RahasiaGuru2026"   // ✅ ganti jadi milik Anda
   ```

   Kalau lupa, siapa pun yang menebak `admin123` bisa mengubah tampilan aplikasi Anda.

3. Sekalian isi identitasnya (opsional tapi disarankan):

   ```js
   appName: "Kelas Ceria SDN 1",
   tagline: "Belajar IPS bareng Bu Rina",
   orgName: "SD Negeri 1 Ceria",
   ```

### 2.2 Pilih salah satu cara deploy

Ketiganya menghasilkan hasil yang sama. **Opsi B paling disarankan** karena setiap perbaikan
tinggal `git push` dan Vercel otomatis menerbitkan ulang.

---

#### Opsi A — Lewat CLI (paling cepat, ±2 menit)

Butuh [Node.js](https://nodejs.org) terpasang.

```bash
cd ips-ceria          # masuk ke folder project
npx vercel            # deploy pratinjau — ikuti pertanyaannya
npx vercel --prod     # deploy ke alamat produksi
```

Saat ditanya:

| Pertanyaan | Jawab |
|---|---|
| Set up and deploy? | **Y** |
| Which scope? | pilih akun Anda |
| Link to existing project? | **N** |
| Project name? | `ips-ceria` (atau bebas) |
| In which directory is your code? | **`./`** (tekan Enter) |
| Want to modify settings? | **N** |

Selesai. Vercel menampilkan alamatnya, mis. `https://ips-ceria.vercel.app`.

---

#### Opsi B — Lewat GitHub (disarankan)

1. Buat repo baru di GitHub (boleh privat).
2. Unggah **seluruh isi folder** (bukan foldernya, tapi isinya — `index.html` harus ada di akar repo):

   ```bash
   cd ips-ceria
   git init
   git add .
   git commit -m "Petualangan IPS Ceria"
   git branch -M main
   git remote add origin https://github.com/NAMA-ANDA/ips-ceria.git
   git push -u origin main
   ```

3. Buka **[vercel.com/new](https://vercel.com/new)** → **Import** repo tadi.
4. Isi seperti ini:

   | Kolom | Isi |
   |---|---|
   | Framework Preset | **Other** |
   | Root Directory | `./` |
   | Build Command | **kosongkan** |
   | Output Directory | **kosongkan** (atau `.`) |
   | Install Command | **kosongkan** |

5. Klik **Deploy**. Tunggu ±30 detik.

Setelah ini, setiap `git push` otomatis memperbarui situs.

---

#### Opsi C — Seret & lepas (tanpa Git, tanpa terminal)

1. Buka **[vercel.com/new](https://vercel.com/new)**.
2. Cari opsi **Deploy** / drag-and-drop di bagian bawah halaman.
3. **Seret folder `ips-ceria`** ke sana.
4. Tunggu selesai.

Cara ini paling gampang, tapi untuk memperbarui Anda harus seret ulang setiap kali.

---

### 2.3 Kenapa tidak perlu Build Command?

Karena ini **HTML/CSS/JS murni** — tidak ada React, tidak ada npm install, tidak ada proses build.
Vercel cukup menyajikan berkasnya apa adanya. Kalau Vercel meminta build command, **kosongkan**.

### 2.4 Cek hasil deploy

Buka alamat yang diberikan Vercel, lalu pastikan:

- [ ] Layar **“Halo, teman kecil!”** muncul, bisa mengisi nama.
- [ ] Setelah nama → muncul pilihan **Main sendiri / Bersama teman**.
- [ ] Kartu permainan tampil (13 kartu, tertulis “30 soal”).
- [ ] Buka **`/admin`** → muncul layar password → bisa masuk dengan password `config.js` Anda.
- [ ] Buka satu kuis → **bar “Bonus kecepatan”** menyusut.

> **Catatan:** berkat `cleanUrls` di `vercel.json`, panel admin bisa dibuka di
> **`namasitus.vercel.app/admin`** (tanpa `.html`). Tautan “⚙ Panel Admin” di footer
> game juga otomatis mengarah ke sana.

### 2.5 Domain sendiri (opsional)

Dashboard Vercel → project Anda → **Settings → Domains → Add** → masukkan domain
(mis. `ips.sekolahku.sch.id`) → ikuti instruksi DNS yang ditampilkan.

### 2.6 Menjalankan di komputer sendiri (tanpa deploy)

Untuk mencoba dulu sebelum diterbitkan:

```bash
cd ips-ceria
npx serve .           # lalu buka http://localhost:3000
```

> **Boleh saja membuka `index.html` dengan klik ganda** (`file:///...`) — game tetap jalan penuh.
> Tapi **link & QR room jadi tidak berguna untuk dibagikan**: isinya akan menunjuk ke berkas di
> disk komputer Anda sendiri (`file:///C:/Users/.../index.html?room=ABC123`), yang tentu tidak
> bisa dibuka dari HP teman. Untuk menguji fitur room, pakai `npx serve .` atau langsung deploy.

---

## 3. Cara Bermain (untuk anak)

Alurnya bertahap, tidak ada login, tidak ada password:

```
1. Tulis nama  →  2. Pilih mode  →┬─ Main sendiri ──────────────→ 4. Menu → Main
                                  └─ Bersama teman → 3. Buat/masuk room → 4. Menu → Main
```

### Langkah 1 — Tulis nama
Ketik nama, tekan **Mulai main! 🚀**. Tidak perlu email atau password.

### Langkah 2 — Pilih mode

| Pilihan | Artinya |
|---|---|
| **Main sendiri** | Langsung ke menu permainan. Papan bintang berisi pemain di perangkat itu (cocok untuk 1 tablet yang dipakai bergantian). |
| **Bersama teman** | Lanjut ke langkah 3 untuk buat/masuk room. |

Pilihan ini **diingat**, jadi kunjungan berikutnya langsung ke menu. Mau ganti? Tekan
**Ganti mode** di menu utama.

### Langkah 3 — Buat atau masuk room *(hanya mode bersama)*

- **Buat room baru** → muncul kode 6 huruf besar-besar. Anak yang membuat jadi **host**.
  Bagikan kodenya ke teman.
- **Masuk room teman** → ketik kode yang diberikan teman.

### Langkah 4 — Menu utama

| Bagian | Isi |
|---|---|
| **Main bersama (Room)** | Salin kode, salin link, tampilkan **QR**, bagikan, keluar room. *(hanya mode bersama)* |
| **Level** | Beginner / Intermediate / Advanced. |
| **Fokus belajar** | Semua (13) · Kuis Topik (7) · Kuis Cepat (3) · Puzzle & Urutan (3). |
| **Papan bintang** | Peringkat pemain. |

### Langkah 5 — Main

Setiap soal punya **bar “Bonus kecepatan”** yang menyusut.

- Jawab **benar** saat sisa waktu masih **separuh atau lebih** → **+1 bintang bonus** (⚡ Cepat!).
- **Waktu habis bukan berarti salah.** Anak tetap boleh menjawab, hanya bonusnya hilang.
  Timer ini memberi **hadiah untuk kecepatan**, bukan **hukuman untuk keterlambatan**.

Selesai ronde → muncul **layar hasil**: total bintang, room/mode, game terakhir, fokus, level,
jumlah benar, bonus kecepatan, perolehan ronde, dan rating ⭐ 1–3.

### Cara menghitung bintang

```
Bintang ronde = jumlah benar + bonus level + bonus kecepatan
```

| Level | Kuis | Benar-salah | Sortir | Profesi | Urutkan | Cocokkan | Bonus level |
|---|---|---|---|---|---|---|---|
| Beginner | 5 soal | 6 | 6 | 5 | 5 peristiwa | 4 pasang | +0 |
| Intermediate | 7 soal | 8 | 8 | 7 | 6 peristiwa | 5 pasang | +1 |
| Advanced | 10 soal | 10 | 10 | 10 | 8 peristiwa | 6 pasang | +2 |

Rating ⭐: ≥85% benar → 3 · ≥50% → 2 · >0 → 1.

### Bermain bersama satu kelas

Karena papan bintang bersifat lokal per perangkat, cara paling ampuh:

- **Satu tablet/proyektor bergantian** — pilih **Main sendiri**, tiap anak tulis namanya
  lewat **Ganti pemain**. Semua nama muncul di satu papan bintang. Ini pemakaian yang paling pas.
- **Banyak HP** — room, kode, link, dan QR tetap berfungsi untuk menyeragamkan level, tetapi
  **skor tidak menyatu**. Jangan janjikan “papan bintang bersama lintas HP”.

---

## 4. Panel Admin (untuk guru)

**Cara masuk:** klik **⚙ Panel Admin** di bagian paling bawah halaman game, atau buka
`namasitus.vercel.app/admin` langsung. Masukkan password (dari `config.js`).

Sesi login bertahan selama tab dibuka. Tombol **Keluar** ada di kanan atas.

Semua perubahan **dipratinjau langsung** dan baru menetap saat ditekan **Simpan perubahan**.

### Tab 1 — Branding
Nama aplikasi, tagline, nama sekolah, logo (URL / unggah ≤ 500 KB / emoji), **6 tema siap pakai**
(Ceria, Samudra, Hutan, Senja, Nusantara, Malam), warna utama & warna tombol aksi, mode
**Ikut perangkat / Terang / Gelap**, teks layar sambutan, teks footer, tombol WhatsApp.

### Tab 2 — Pengaturan Game
- **Permainan aktif** — matikan permainan yang belum diajarkan. Yang mati hilang dari menu
  *dan* dari hitungan fokus. Minimal satu harus aktif.
- **Level** — nonaktifkan level, atau **ganti namanya** (mis. `Beginner` → `Kelas 4`).
- **Timer per soal** — nyalakan/matikan, atur 5–60 detik.
- **Bagian yang tampil** — sembunyikan **Room** (semua anak jadi main sendiri) atau
  **Papan bintang**.

### Tab 3 — Papan Bintang
Lihat semua room & skor yang tersimpan di perangkat itu. Ada tombol **Hapus semua skor**.

### Tab 4 — Keamanan
Ganti password admin (minimal 6 karakter), atau kembalikan ke nilai `config.js`.
Password disimpan sebagai *hash*, bukan teks polos.

### Tab 5 — Backup ⭐
Tab paling penting untuk penjual/pengelola.

- **Salin ke clipboard / Unduh .json** — ambil seluruh konfigurasi.
- **Muat berkas / Terapkan JSON** — pasang konfigurasi dari perangkat lain.
- **Kembalikan ke default config.js** — buang semua pengaturan panel.

Password **tidak pernah** ikut diekspor.

---

## 5. White-label: Menjual Versi Ber-merek

Ada **dua lapis** pengaturan. Memahami bedanya adalah kunci:

| Lapis | Diubah lewat | Berlaku bagi |
|---|---|---|
| **`config.js`** | Editor teks, sebelum deploy | **Semua pengunjung**, permanen |
| **Panel Admin** | Browser, kapan saja | **Perangkat itu saja** |

Panel Admin **menimpa** `config.js`. Nilai yang **tidak pernah disentuh** panel tetap mengikuti
`config.js` — jadi Anda tetap bisa memperbarui default dan perubahannya terasa di perangkat
yang belum pernah mengutak-atik pengaturan itu.

### Alur kerja yang disarankan untuk tiap klien baru

1. **Atur lewat Panel Admin** sambil melihat hasilnya langsung (warna, logo, nama).
2. Puas? Buka **Backup → Salin ke clipboard**.
3. Tempel hasilnya ke `window.APP_CONFIG` di **`config.js`**.
4. Ganti **`adminPassword`**.
5. Deploy ulang. Sekarang **semua pengunjung** mendapat tampilan itu tanpa harus menyetel apa pun.

### Isi `config.js`

```js
window.APP_CONFIG = {
  /* BRANDING */
  appName:      "Petualangan IPS Ceria",
  tagline:      "Bermain sambil belajar IPS!",
  orgName:      "",              // nama sekolah di footer; kosongkan untuk sembunyikan
  logoUrl:      "logo.png",      // berkas lokal / URL gambar; kosongkan → pakai emoji di bawah
                                 // gambar ditampilkan mengisi penuh (dipangkas di tengah)
  logoEmoji:    "🎮",            // dipakai jadi logo & favicon

  /* WARNA */
  colorPrimary: "#6C4AB6",       // header, tombol utama
  colorAccent:  "#F1786B",       // tombol aksi ("Mulai main!", "Simpan")
  themeMode:    "auto",          // "auto" | "light" | "dark"

  /* SAMBUTAN */
  welcomeTitle: "Halo, teman kecil!",
  welcomeText:  "Siapa namamu? Ayo kumpulkan bintang sebanyak-banyaknya!",

  /* FOOTER & KONTAK */
  footerText:   "© 2026 Petualangan IPS Ceria",
  contactWa:    "",              // "6281234567890" (tanpa +). Kosong → tombol WA disembunyikan
  contactLabel: "Hubungi Kami",

  /* GAME */
  enabledLevels: ["Beginner", "Intermediate", "Advanced"],
  levelNames:   { Beginner:"Beginner", Intermediate:"Intermediate", Advanced:"Advanced" },
  hiddenGames:  [],              // id game yang disembunyikan (lihat tabel di bawah)
  showLeaderboard: true,
  showRoom:        true,
  timerEnabled:    true,
  timerSeconds:    20,           // 5–60

  /* ADMIN */
  adminPassword: "admin123"      // ⚠️ WAJIB DIGANTI sebelum deploy
};
```

### Daftar id permainan (untuk `hiddenGames`)

| id | Permainan |
|---|---|
| `quiz:Diri, keluarga & sekolah` | Kuis topik 1 |
| `quiz:Peta, arah & denah` | Kuis topik 2 |
| `quiz:Alam & lingkungan` | Kuis topik 3 |
| `quiz:Budaya Indonesia` | Kuis topik 4 |
| `quiz:Ekonomi cilik` | Kuis topik 5 |
| `quiz:Sejarah Indonesia` | Kuis topik 6 |
| `quiz:Pancasila & negara` | Kuis topik 7 |
| `tf` | Kilat benar atau salah |
| `sort` | Sortir kebutuhan vs keinginan |
| `prof` | Tebak profesi |
| `order` | Urutkan sejarah |
| `match1` | Cocokkan: pahlawan & budaya |
| `match2` | Cocokkan: peta & pemerintahan |

Contoh — sembunyikan dua permainan cocokkan:

```js
hiddenGames: ["match1", "match2"],
```

---

## 6. Menambah / Mengubah Soal

Semua konten ada di **`data.js`**, dikelompokkan **per level**. Kuis topik punya
**30 butir per level**; game tantangan **10 butir per level**.

```js
// Kuis: [pertanyaan, [4 pilihan], indeksJawabanBenar, penjelasan]
QUIZ["Peta, arah & denah"].q.Advanced

// Benar/salah: [pernyataan, true/false, penjelasan]
TF.Beginner

// Sortir: [barang, "K" (kebutuhan) | "I" (keinginan)]
SORT.Advanced

// Profesi: [petunjuk, [4 pilihan], indeksJawabanBenar]
PROF.Intermediate

// Urutan: [peristiwa, nomorUrut 1..10]
ORDER.items.Beginner

// Cocokkan: [kiri, kanan]
MATCH1.pairs.Advanced
```

### Aturan yang harus dipatuhi

1. **Jawaban benar ditaruh di indeks 0.** Pilihan diacak otomatis saat dimainkan, jadi anak
   tidak akan sadar. Jangan menaruh jawaban benar di posisi lain.
2. **Kuis & profesi wajib 4 pilihan**, semuanya berbeda.
3. **`ORDER`** — nomor urut dalam satu level harus **1..10 tanpa lompat**. Ronde hanya memakai
   sebagian peristiwa, lalu menomori ulang secara kronologis.
4. **`SORT`** — jaga seimbang (5 `K` + 5 `I` per level), supaya anak tidak bisa menang dengan
   menekan satu tombol terus.
5. Ronde hanya mengambil sebagian dari pool (lihat [tabel level](#cara-menghitung-bintang)) —
   mis. kuis Advanced menampilkan 10 soal acak dari 30 yang tersedia. Menambah butir justru
   bagus: ronde makin bervariasi. Untuk game tantangan, jangan menambah panjang ronde melebihi 10.

Contoh menambah satu soal:

```js
QUIZ["Ekonomi cilik"].q.Beginner.push(
  ["Tempat menabung yang aman adalah...",
   ["Bank","Laci meja","Bawah bantal","Saku baju"], 0,
   "Uang di bank lebih aman dan bisa berbunga."]
);
```

Setelah mengubah `data.js`, **deploy ulang**. Angka “30 soal” di kartu menu dihitung otomatis
dari data, jadi ikut menyesuaikan sendiri.

---

## 7. Pemecahan Masalah

| Gejala | Sebab & solusi |
|---|---|
| Halaman putih kosong | Ada berkas yang tidak ikut ter-unggah. Pastikan **9 berkas** (`index.html`, `admin.html`, `config.js`, `brand.js`, `data.js`, `app.js`, `admin.js`, `app.css`, `vercel.json`) ada di **akar** situs, bukan di dalam subfolder. |
| Ikon kotak-kotak, bukan gambar | CDN Tabler Icons terblokir jaringan sekolah. Game tetap jalan; minta admin jaringan mengizinkan `cdn.jsdelivr.net`. |
| Tombol **QR** tidak menampilkan kode QR | CDN `qrcode-generator` gagal dimuat. Modal tetap terbuka dan menampilkan **kode + link** — aplikasi tidak error. |
| Link / QR room isinya `file:///C:/Users/...` | Anda membuka game lewat **klik ganda berkas**, bukan lewat alamat web. Link itu menunjuk ke disk Anda sendiri sehingga tidak bisa dibuka teman. Pakai `npx serve .` atau deploy ke Vercel. |
| Lupa password admin | Buka `config.js`, lihat `adminPassword`. Kalau password diganti lewat panel: DevTools (F12) → Application → Local Storage → hapus **`ips_adminpass`** → kembali ke password `config.js`. |
| Sudah ubah `config.js` tapi tampilan tidak berubah | Perangkat itu punya pengaturan panel yang **menimpa**. Panel Admin → **Backup → Kembalikan ke default config.js**. |
| Skor anak tidak muncul di HP guru | **Ini bukan bug.** Papan bintang bersifat per perangkat. Lihat [bagian 1](#1-mengenal-aplikasi). |
| Anak terus diminta pilih mode | Browser memakai mode penyamaran/privat, atau localStorage diblokir. Pakai jendela browser biasa. |

### Reset total

DevTools (**F12**) → **Application** → **Local Storage** → pilih situs → **Clear**.

Kunci yang dipakai aplikasi:

| Kunci | Isi |
|---|---|
| `ips_config` | Pengaturan Panel Admin (yang menimpa `config.js`) |
| `ips_adminpass` | Hash password admin (kalau diganti lewat panel) |
| `ips_player` | Nama pemain terakhir |
| `ips_mode` | `solo` / `room` |
| `ips_room` | Room & level yang aktif |
| `ips_stars_<nama>` | Total bintang seorang pemain |
| `ips_lb_<kode>` | Papan bintang satu room |
| `ips_roommeta_<kode>` | Nama room, host, kunci level |

---

## 8. Batasan & Keamanan

Baca ini sebelum menjanjikan apa pun ke sekolah atau pembeli.

### Password admin bukan pengaman data
Aplikasi ini berjalan **sepenuhnya di browser**. Siapa pun bisa membuka `config.js` lewat
alamat `namasitus.vercel.app/config.js` dan membacanya. Password disimpan sebagai *hash*
(tidak terbaca polos di localStorage) dan panel meminta password, tetapi ini hanya
**penghalang agar anak tidak iseng mengubah tampilan**.

**Jangan pernah menyimpan data sensitif** (nilai rapor, data pribadi siswa, nomor telepon
orang tua) di aplikasi ini. Untuk itu dibutuhkan mode server dengan autentikasi sungguhan.

### Room tidak lintas perangkat
Sudah dijelaskan di [bagian 1](#1-mengenal-aplikasi) dan ditampilkan juga sebagai catatan
di dalam aplikasi, agar tidak menyesatkan pengguna.

### Data bisa hilang
localStorage terhapus bila pengguna membersihkan data situs, memakai mode penyamaran, atau
berganti browser/perangkat. Papan bintang bukan arsip permanen — **jangan dipakai sebagai
satu-satunya catatan nilai.**

---

## 9. Ringkasan Cepat

**Menerbitkan:**
1. Ganti `adminPassword` di `config.js`
2. `npx vercel --prod` (atau import repo di vercel.com/new, Framework: **Other**, Build: **kosong**)
3. Cek `/admin` bisa dibuka dengan password baru

**Memakai:** buka link → tulis nama → pilih mode → main.

**Mengubah tampilan:** `/admin` → Branding → Simpan.
Mau permanen untuk semua orang? Backup → Salin → tempel ke `config.js` → deploy ulang.

**Mengubah soal:** edit `data.js` → deploy ulang.
