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
  footerText:   "© 2026 Petualangan IPS Ceria · by produkvip",
  contactWa:    "",              // contoh: "6281234567890" (tanpa +). Kosongkan untuk sembunyikan.
  contactLabel: "Hubungi Kami",

  /* ---------- PENGATURAN GAME ---------- */
  enabledLevels: ["Beginner", "Intermediate", "Advanced"],

  levelNames: {
    Beginner:     "Beginner",
    Intermediate: "Intermediate",
    Advanced:     "Advanced"
  },

  hiddenGames: [],

  showLeaderboard: true,     // papan bintang on/off
  showRoom: true,            // fitur "Main bersama (Room)" on/off

  /* ---------- TIMER PER SOAL (bonus kecepatan) ---------- */
  timerEnabled: true,
  timerSeconds: 20,          // 5–60 detik per soal

  /* ---------- ADMIN ---------- */
  adminPassword: "admin123"
};
