/* ============================================================
   PETUALANGAN IPS CERIA — KONFIGURASI WHITE-LABEL
   ============================================================
   File ini adalah pengaturan DEFAULT (permanen) aplikasi.
   Edit nilai di bawah, simpan, lalu deploy ulang — selesai.

   Catatan:
   - Pengaturan dari Panel Admin (admin.html) disimpan di
     localStorage browser dan MENIMPA nilai default di sini.
   - Untuk perubahan permanen bagi SEMUA pengunjung, edit file
     ini, bukan hanya lewat panel admin. Tab "Backup" di panel
     admin menyalinkan JSON-nya untuk ditempel ke sini.
   ============================================================ */

window.APP_CONFIG = {
  /* ---------- BRANDING ---------- */
  appName: "IPS Ceria",
  tagline: "Bermain sambil belajar IPS!",
  orgName: "",               // nama sekolah/lembaga, tampil di footer. Kosongkan untuk sembunyikan.

  // Logo: nama berkas di folder aplikasi ("logo.png", "icons/icon-192.png"),
  // URL gambar (https://…), ATAU kosongkan ("") agar memakai emoji di bawah.
  // Gambar selalu ditampilkan mengisi penuh kotak logo (dipangkas di tengah),
  // jadi pakai gambar persegi tanpa bingkai kosong agar hasilnya rapi.
  // Tip: "icons/icon-192.png" (62 KB) jauh lebih ringan daripada logo.png (1,4 MB).
  logoUrl: "logo.png",
  logoEmoji: "🎮",           // dipakai sebagai logo & favicon bila logoUrl kosong

  /* ---------- WARNA TEMA ---------- */
  colorPrimary: "#6C4AB6",   // warna utama (header, tombol utama, kartu aktif)
  colorAccent:  "#F1786B",   // warna aksi (tombol "Mulai main!", "Simpan")
  themeMode:    "auto",      // "auto" (ikut perangkat) | "light" | "dark"

  /* ---------- LAYAR SAMBUTAN ANAK ---------- */
  welcomeTitle: "Halo, teman kecil!",
  welcomeText:  "Siapa namamu? Ayo kumpulkan bintang sebanyak-banyaknya!",

  /* ---------- FOOTER & KONTAK ---------- */
  footerText:   "© 2026 Petualangan IPS Ceria",
  contactWa:    "",              // contoh: "6281234567890" (tanpa +). Kosongkan untuk sembunyikan.
  contactLabel: "Hubungi Kami",

  /* ---------- PENGATURAN GAME ---------- */
  // Level yang boleh dipilih anak. Hapus salah satu untuk menyembunyikannya.
  enabledLevels: ["Beginner", "Intermediate", "Advanced"],

  // Nama level bisa disesuaikan dengan brand (kunci di kiri jangan diubah).
  levelNames: {
    Beginner:     "Beginner",
    Intermediate: "Intermediate",
    Advanced:     "Advanced"
  },

  // Permainan yang DISEMBUNYIKAN dari menu. Kosongkan agar semua 13 game tampil.
  // id: "quiz:<nama topik>", "tf", "sort", "prof", "order", "match1", "match2"
  hiddenGames: [],

  showLeaderboard: true,     // papan bintang on/off
  showRoom: true,            // fitur "Main bersama (Room)" on/off

  /* ---------- TIMER PER SOAL (bonus kecepatan) ---------- */
  // Bar waktu yang menyusut di tiap soal. Menjawab benar saat sisa waktu
  // masih separuh atau lebih memberi +1 bintang bonus.
  // Waktu habis TIDAK membuat jawaban salah — anak tetap boleh menjawab,
  // hanya bonus kecepatannya hilang. (Sama seperti Math Fun Quest.)
  timerEnabled: true,
  timerSeconds: 20,          // 5–60 detik per soal

  /* ---------- ADMIN ---------- */
  // Password default panel admin (admin.html). GANTI sebelum dijual/deploy!
  // Bisa juga diganti dari dalam panel admin (tab Keamanan).
  adminPassword: "admin123"
};
