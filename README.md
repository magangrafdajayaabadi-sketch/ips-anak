# Petualangan IPS Ceria — Edisi Web (Vercel)

Game IPS interaktif untuk anak SD: **15 permainan** (8 kuis topik + 7 tantangan)
dengan **870 butir soal/kartu**, alur bertahap **nama → mode → room → level → main → papan bintang**,
timer bonus kecepatan, dan **Panel Admin white-label** terpisah.

Tanpa login/password bagi anak. Cukup tulis nama, lalu main.

> 📖 **Baru pertama kali?** Baca **[PANDUAN.md](PANDUAN.md)** — panduan lengkap berbahasa
> Indonesia: cara deploy ke Vercel langkah demi langkah, cara bermain, cara memakai Panel Admin,
> cara mengganti merek (white-label), cara menambah soal, dan pemecahan masalah.
> README ini hanya ringkasan teknis.

---

## Alur aplikasi (bertahap)

```
1. Nama  →  2. Pilih mode  →┬─ Main sendiri ─────────────→ 4. Menu utama → Main
                            │
                            └─ Bersama teman → 3. Buat/masuk room → 4. Menu utama → Main
```

1. **Layar nama** — "Halo, teman kecil!" → tulis nama → *Mulai main!*
2. **Pilih mode** — **Main sendiri** atau **Bersama teman**. Pilihan disimpan, jadi
   kunjungan berikutnya langsung ke menu. Bisa diubah lewat **Ganti mode** di menu.
3. **Atur room** *(hanya mode bersama)* — **Buat room baru** (kamu jadi host, kode
   ditampilkan besar untuk dibagikan) **atau** **Masuk room teman** dengan kode.
4. **Menu utama** — Level · Fokus belajar · Papan bintang. Panel **Main bersama (Room)**
   hanya muncul di mode bersama.
5. **Main** → **modal hasil** (Total bintang, Room/Mode, Game terakhir, Fokus, Level, Benar,
   Perolehan ronde, Rating ⭐/3).

**Jalan pintas:** membuka link/QR `?room=KODE` **melewati** layar pilih mode dan langsung
menaruh anak di room itu (tetap diminta namanya dulu). Bila admin mematikan
**Tampilkan Main bersama (Room)**, layar pilih mode juga dilewati — semua anak main sendiri.

**Mode sendiri** memakai papan bintang khusus perangkat (bukan room), sehingga beberapa anak
yang bergantian memakai satu tablet tetap punya peringkat bersama.

---

## Sistem room

| Fitur | Keterangan |
|---|---|
| **Buat room** | Membuat kode 6 karakter. Pembuatnya otomatis menjadi **host**. |
| **Nama room** | Host bisa mengganti nama (mis. `Kelas 4B`) lewat ikon pensil. |
| **Masuk / Salin kode / Salin link** | Bergabung lewat kode, atau bagikan tautan `?room=KODE&level=LEVEL`. |
| **QR code** | Tombol **QR** menampilkan kode QR tautan room — teman tinggal scan. |
| **Bagikan** | Memakai *Web Share* di HP; jatuh ke "salin link" bila tak didukung. |
| **Host** | Bergabung ke room orang lain **tidak** membuatmu host. Bila room belum punya host di perangkat ini, tersedia tombol **Jadi host**. |
| **Kunci level** | Host bisa mengunci level agar semua anggota main di tingkat sama. Anggota lain melihat kartu level ter-nonaktif (🔒) dan otomatis mengikuti level itu. |
| **Anggota** | Siapa pun yang masuk room langsung terdaftar di papan bintang (status *"Baru bergabung"* sampai ia main). |
| **Kelola papan** | Host bisa **Kosongkan** papan (bintang → 0, anggota tetap) atau mengeluarkan satu anggota. Host tak bisa mengeluarkan dirinya sendiri. |
| **Keluar room** | Menghapusmu dari papan room lama, lalu membuat room baru (kamu jadi host di sana). |

QR dibuat oleh `qrcode-generator` dari CDN. Bila CDN gagal dimuat, modal QR tetap terbuka
dan menampilkan kode + link (aplikasi tidak error).

## Bank soal — 870 butir/kartu, 3 level

**7 kuis topik utama** masing-masing punya **30 soal PER LEVEL** (90 per topik),
ditambah **1 kuis dunia** (30 soal total).
**7 permainan tantangan** punya **10 butir per level** (30 per game).
Totalnya **870 butir/kartu**.

| Permainan | Beginner | Intermediate | Advanced | Total |
|---|---|---|---|---|
| 7 kuis topik utama (@90) | 30 | 30 | 30 | **630** |
| Kuis dunia, benua & negara | 10 | 10 | 10 | 30 |
| Kilat benar/salah | 10 | 10 | 10 | 30 |
| Sortir kebutuhan (5 K + 5 I tiap level) | 10 | 10 | 10 | 30 |
| Tebak profesi | 10 | 10 | 10 | 30 |
| Tebak bendera negara | 10 | 10 | 10 | 30 |
| Urutkan sejarah | 10 | 10 | 10 | 30 |
| Cocokkan × 2 (@30 pasang) | 10 | 10 | 10 | **60** |
| | | | | **870** |

### Pengaruh Level
Level menentukan **dua** hal sekaligus — bukan cuma panjang ronde:

1. **Tingkat kesulitan soal.** Tiap level punya pool sendiri yang benar-benar berbeda
   (tidak ada soal yang dipakai ulang antarlevel). Contoh pada kuis *Peta*:
   *Beginner* "Matahari terbit di sebelah…" → *Advanced* "Pada peta 1 : 100.000, 1 cm sama dengan…".
2. **Panjang ronde & bonus bintang:**

| Level | Kuis | Benar-salah | Sortir | Profesi | Bendera | Urutkan | Cocokkan | Bonus bintang |
|---|---|---|---|---|---|---|---|---|
| Beginner | 5 soal | 6 | 6 | 5 | 5 | 5 peristiwa | 4 pasang | +0 |
| Intermediate | 7 soal | 8 | 8 | 7 | 7 | 6 peristiwa | 5 pasang | +1 |
| Advanced | 10 soal | 10 | 10 | 10 | 10 | 8 peristiwa | 6 pasang | +2 |

Soal diambil **acak** dari pool level itu, jadi ronde berikutnya jarang sama.
Kuis punya 30 soal/level tetapi ronde hanya mengambil 5–10, sehingga variasinya sangat kaya.
Untuk game tantangan (10 butir/level), panjang ronde tidak boleh melebihi 10.

### Timer per soal (bonus kecepatan)
Setiap soal punya **bar waktu yang menyusut** (bawaan 20 detik, bisa diatur admin 5–60 detik).

- Menjawab **benar** saat sisa waktu masih **separuh atau lebih** → **+1 bintang bonus**,
  dengan lencana “⚡ Cepat!”.
- **Waktu habis TIDAK membuat jawaban salah.** Anak tetap boleh menjawab; yang hilang hanya
  bonus kecepatannya. Bar berubah merah setelah lewat separuh sebagai penanda.
- Berlaku di **4 permainan bersoal**: kuis topik, benar/salah, sortir, tebak profesi.
  *Urutkan sejarah* dan *Cocokkan* tidak memakainya — keduanya puzzle, bukan soal per butir,
  dan sudah punya penilaian sendiri dari jumlah percobaan.
- Bisa dimatikan lewat **Panel Admin → Pengaturan Game → Timer per soal**.

Pendekatan ini sengaja meniru *Math Fun Quest*: timer memberi **hadiah** untuk kecepatan,
bukan **hukuman** untuk keterlambatan — anak yang membaca lebih pelan tidak dirugikan.

Perolehan bintang per ronde = **jumlah benar + bonus level + bonus kecepatan**.
Rating ⭐ 1–3 dihitung dari rasio benar (≥85% → 3, ≥50% → 2, >0 → 1).

### Menambah / mengubah soal
Semua konten ada di `data.js`, dikelompokkan per level:

```js
QUIZ["Peta, arah & denah"].q.Advanced → [ [pertanyaan, [4 pilihan], indeksBenar, penjelasan], … ]
TF.Beginner       → [ [pernyataan, true/false, penjelasan], … ]
SORT.Advanced     → [ [barang, "K" | "I"], … ]         // K = kebutuhan, I = keinginan
PROF.Intermediate → [ [petunjuk, [4 pilihan], indeksBenar], … ]
ORDER.items.Beginner → [ [peristiwa, urutan 1..10], … ]
MATCH1.pairs.Advanced → [ [kiri, kanan], … ]
```

Jawaban benar ditaruh di **indeks 0**; pilihan diacak saat dimainkan.
Boleh menambah butir melebihi 10 per level — ronde tetap mengambil sebanyak
angka pada tabel di atas.

---

## White-label: `config.js` + Panel Admin

Aplikasi ini bisa di-*rebrand* penuh tanpa menyentuh kode game. Ada **dua lapis**:

| Lapis | Untuk siapa | Berlaku bagi |
|---|---|---|
| **`config.js`** | developer / penjual, diedit sebelum deploy | **semua pengunjung**, permanen |
| **Panel Admin** (`admin.html`) | guru / pengelola, lewat browser | **perangkat itu saja** (localStorage) |

Panel Admin **menimpa** `config.js`. Nilai yang tidak pernah disentuh panel tetap
mengikuti `config.js`, sehingga mengedit `config.js` lalu deploy ulang tetap terasa.

### 1. `config.js` — default permanen
Edit nilainya, simpan, deploy ulang — selesai. Isinya: nama aplikasi, tagline, nama
lembaga, logo, warna, mode tema, teks sambutan, footer, kontak WhatsApp, level & nama
level yang aktif, permainan yang disembunyikan, dan **`adminPassword`**.

> **Ganti `adminPassword` sebelum dijual/deploy.** Default-nya `admin123`.

### 2. Panel Admin — `admin.html`
Dibuka lewat tautan **⚙ Panel Admin** di footer game, atau langsung ke `/admin`.
Login dengan password, lalu 5 tab:

| Tab | Isi |
|---|---|
| **Branding** | Nama aplikasi, tagline, nama sekolah, logo (URL / unggah ≤ 500 KB / emoji), 6 tema siap pakai, warna utama & aksi, mode **Ikut perangkat / Terang / Gelap**, teks layar sambutan, teks footer, tombol WhatsApp. |
| **Pengaturan Game** | Nyalakan/matikan tiap permainan (hilang dari menu *dan* hitungan fokus), aktif/nonaktif & **ganti nama level**, **timer per soal** (on/off + 5–60 detik), tampilkan/sembunyikan **Room** dan **Papan bintang**. |
| **Papan Bintang** | Lihat semua room & skor yang tersimpan di perangkat ini; hapus semua skor. |
| **Keamanan** | Ganti password admin, atau kembalikan ke nilai `config.js`. |
| **Backup** | Salin/unduh konfigurasi sebagai JSON untuk ditempel ke `config.js`, muat berkas JSON, atau buang semua pengaturan panel. |

Perubahan warna **dipratinjau langsung** di panel dan baru menetap setelah
**Simpan perubahan**. Meninggalkan halaman tanpa menyimpan otomatis membatalkan pratinjau.
Warna, judul, favicon, dan warna bilah browser (`theme-color`) semuanya ikut branding.

### Memakai branding yang sama di banyak perangkat / kelas
Ada dua cara:
- **Permanen (disarankan):** tab **Backup → Salin ke clipboard**, tempel ke
  `window.APP_CONFIG` di `config.js`, deploy ulang. Semua pengunjung langsung mendapatkannya.
- **Cepat, per perangkat:** **Backup → Unduh .json**, lalu **Muat berkas** di perangkat lain.

Password admin **tidak pernah ikut** diekspor.

### Catatan keamanan (penting)
Aplikasi ini **statis dan berjalan sepenuhnya di browser**. Password admin disimpan sebagai
*hash* (bukan teks polos), tetapi siapa pun bisa membaca `config.js`. Jadi login ini hanya
**penghalang ringan untuk melindungi pengaturan tampilan** — **bukan** pengaman data.
Jangan menyimpan data sensitif di aplikasi ini. Untuk admin yang benar-benar aman
dibutuhkan **mode server** (lihat catatan mode lokal di bawah).

---

## Struktur file

```
ips-ceria/
├── index.html     ← halaman game
├── admin.html     ← halaman Panel Admin (terpisah, dilindungi password)
├── config.js      ← DEFAULT PERMANEN white-label — edit di sini sebelum deploy
├── brand.js       ← lapisan bersama: config, tema, penyimpanan (dipakai kedua halaman)
├── app.css        ← desain + sistem warna (--brand/--accent, tema gelap via data-theme)
├── data.js        ← seluruh konten soal & permainan
├── admin.js       ← login + 5 tab panel admin
├── app.js         ← nama pemain, room, level, fokus, permainan, papan bintang
├── vercel.json    ← konfigurasi Vercel
└── README.md
```

---

## Deploy ke Vercel

### Opsi A — CLI (paling cepat)
```bash
cd ips-ceria
npx vercel          # preview
npx vercel --prod   # produksi
```

### Opsi B — GitHub (rekomendasi)
1. Unggah isi folder `ips-ceria/` ke repo GitHub baru.
2. Buka [vercel.com/new](https://vercel.com/new) → pilih repo.
3. Framework Preset: **Other** · Build Command: *(kosongkan)* · Output Directory: `.`
4. **Deploy**.

### Opsi C — Drag & drop
Dashboard Vercel → **Add New → Project → Deploy** → seret folder `ips-ceria/`.

---

## Catatan penting (mode lokal)

Aplikasi ini **statis tanpa server**. Semua data disimpan di `localStorage` browser:

- **Link, kode & QR room berfungsi** — membuka `?room=ABC123&level=Beginner` langsung
  menaruh pemain di room & level itu.
- **Papan bintang, host, dan kunci level bersifat lokal per perangkat.** Dua anak di dua HP
  berbeda yang memakai kode room sama **tidak** akan saling melihat skor, dan "kunci level"
  hanya berlaku di perangkat itu. Semua fitur room di atas berjalan penuh dalam satu
  perangkat/browser (mis. 1 tablet kelas yang dipakai bergantian, atau 1 proyektor).
  Untuk room lintas perangkat yang sesungguhnya dibutuhkan **mode server**
  (mis. Vercel Serverless + Vercel KV/Upstash Redis).
  Peringatan ini juga ditampilkan di dalam aplikasi agar tidak menyesatkan.
- **Reset total:** hapus data situs di browser (DevTools → Application → Local Storage).
