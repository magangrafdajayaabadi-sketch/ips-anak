/* =============================================================
   brand.js — Lapisan white-label bersama
   Dipakai OLEH DUA HALAMAN: index.html (game) dan admin.html (panel).
   Berisi: penyimpanan, gabungan config, penerapan tema, util kecil.

   Urutan sumber pengaturan (yang bawah menimpa yang atas):
     1. FALLBACK di file ini        (jaring pengaman bila config.js hilang)
     2. window.APP_CONFIG           (config.js — default permanen, diedit developer)
     3. localStorage 'ips_config'   (hasil Panel Admin — per perangkat)
   ============================================================= */

const $ = id => document.getElementById(id);

/* ---------- Penyimpanan ---------- */
const Store = {
  get(k,f){ try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v);}catch(e){return f;} },
  set(k,v){ localStorage.setItem(k,JSON.stringify(v)); },
  del(k){ localStorage.removeItem(k); },
};
const K = {
  config:'ips_config', player:'ips_player', room:'ips_room', pass:'ips_adminpass',
  mode:'ips_mode',                 // 'solo' | 'room' — pilihan di layar "Mau main bagaimana?"
  stars: n => 'ips_stars_'+n.toLowerCase(),
  lb:    c => 'ips_lb_'+c,
  meta:  c => 'ips_roommeta_'+c,
};

/* Jaring pengaman: nilai ini hanya terpakai bila config.js gagal dimuat. */
const FALLBACK = {
  appName:'IPS Ceria',
  tagline:'Bermain sambil belajar IPS!',
  orgName:'',
  logoUrl:'',
  logoEmoji:'🎮',
  colorPrimary:'#6C4AB6',
  colorAccent:'#F1786B',
  themeMode:'auto',
  welcomeTitle:'Halo, teman kecil!',
  welcomeText:'Siapa namamu? Ayo kumpulkan bintang sebanyak-banyaknya!',
  footerText:'© 2026 Petualangan IPS Ceria',
  contactWa:'',
  contactLabel:'Hubungi Kami',
  enabledLevels:['Beginner','Intermediate','Advanced'],
  levelNames:{ Beginner:'Beginner', Intermediate:'Intermediate', Advanced:'Advanced' },
  hiddenGames:[],
  showLeaderboard:true,
  showRoom:true,
  timerEnabled:true,
  timerSeconds:20,
  adminPassword:'admin123',
};

/** Default permanen = FALLBACK ditimpa config.js. */
const DEFAULTS   = Object.assign({}, FALLBACK, window.APP_CONFIG || {});
const CONFIG_KEYS= Object.keys(FALLBACK).filter(k=>k!=='adminPassword');   // adminPassword tak pernah masuk localStorage

const THEME_PRESETS = [
  { name:'Ceria',     colorPrimary:'#6C4AB6', colorAccent:'#F1786B' },
  { name:'Samudra',   colorPrimary:'#185FA5', colorAccent:'#F5A524' },
  { name:'Hutan',     colorPrimary:'#0F6E56', colorAccent:'#F1786B' },
  { name:'Senja',     colorPrimary:'#A32D2D', colorAccent:'#F5A524' },
  { name:'Nusantara', colorPrimary:'#854F0B', colorAccent:'#0F6E56' },
  { name:'Malam',     colorPrimary:'#3F4A63', colorAccent:'#38BDF8' },
];

/* ---------- Config ---------- */
/** Pengaturan yang berlaku sekarang: default permanen ditimpa hasil panel admin. */
function getConfig(){ return Object.assign({}, DEFAULTS, Store.get(K.config,{}) || {}); }
/** Simpan HANYA yang berbeda dari default, agar mengedit config.js tetap terasa
    di perangkat yang belum pernah menyentuh pengaturan itu. */
function saveConfig(c){
  const diff={};
  CONFIG_KEYS.forEach(k=>{
    if(c[k]===undefined) return;
    if(JSON.stringify(c[k])!==JSON.stringify(DEFAULTS[k])) diff[k]=c[k];
  });
  Store.set(K.config, diff);
  applyBranding();
}
function resetConfig(){ Store.del(K.config); applyBranding(); }

/* ---------- Password admin ---------- */
/* Hash sederhana (FNV-1a). Password panel hanya penghalang ringan untuk
   melindungi pengaturan tampilan — aplikasi ini statis dan berjalan di browser,
   jadi jangan simpan data sensitif di sini. */
function hashPass(s){
  let h=0x811c9dc5, t=String(s);
  for(let i=0;i<t.length;i++){ h^=t.charCodeAt(i); h=Math.imul(h,0x01000193); }
  return ('00000000'+(h>>>0).toString(16)).slice(-8);
}
/** Password aktif: yang diganti lewat panel, kalau tidak ada pakai config.js. */
function passHash(){ return Store.get(K.pass,null) || hashPass(DEFAULTS.adminPassword); }
function checkPass(v){ return hashPass(v)===passHash(); }
function setPass(v){ Store.set(K.pass, hashPass(v)); }

/* ---------- Penerapan tema ---------- */
const isHex    = v => /^#[0-9a-f]{6}$/i.test(String(v||''));
/** Sumber gambar yang boleh dipakai sebagai logo:
      - data URL gambar          → data:image/png;base64,…
      - alamat http/https        → https://contoh.com/logo.png
      - berkas di folder aplikasi → "logo.png", "./logo.png", "/logo.png", "icons/icon-192.png"
    Skema lain (javascript:, vbscript:, dsb.) selalu ditolak. */
const isImgSrc = v => {
  const s = String(v||'').trim();
  if(!s) return false;
  if(/^data:image\//i.test(s))  return true;
  if(/^https?:\/\//i.test(s))   return true;
  if(/^[a-z][a-z0-9+.-]*:/i.test(s)) return false;      // skema asing → tolak
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?[^\s]*)?$/i.test(s);
};
/** Durasi timer dijepit 5–60 detik: di bawah itu anak tak sempat membaca soal. */
const clampTimer = n => Math.min(60, Math.max(5, Math.round(Number(n)||20)));

function resolveTheme(mode){
  if(mode==='light'||mode==='dark') return mode;
  return (window.matchMedia && matchMedia('(prefers-color-scheme:dark)').matches) ? 'dark' : 'light';
}
/** Terapkan config ke halaman. Beri argumen `cfg` untuk pratinjau tanpa menyimpan. */
function applyBranding(cfg){
  const c = cfg || getConfig(), r = document.documentElement;
  r.style.setProperty('--brand',  isHex(c.colorPrimary)? c.colorPrimary : DEFAULTS.colorPrimary);
  r.style.setProperty('--accent', isHex(c.colorAccent) ? c.colorAccent  : DEFAULTS.colorAccent);
  r.dataset.theme = resolveTheme(c.themeMode);
  const tc=document.querySelector('meta[name="theme-color"]');
  if(tc) tc.setAttribute('content', isHex(c.colorPrimary)? c.colorPrimary : DEFAULTS.colorPrimary);
  const icon=document.querySelector('link[rel="icon"]');
  if(icon) icon.href = (c.logoUrl && isImgSrc(c.logoUrl)) ? c.logoUrl
    : "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>"+
      encodeURIComponent(c.logoEmoji||DEFAULTS.logoEmoji)+"</text></svg>";
}
/** Ikuti tema OS secara langsung saat mode "auto". */
function watchTheme(){
  if(!window.matchMedia) return;
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{
    if(getConfig().themeMode==='auto') applyBranding();
  });
}
/** Alamat gambar logo yang siap dipakai, atau '' bila brand memakai emoji. */
function brandLogoSrc(c){
  c = c || getConfig();
  return (c.logoUrl && isImgSrc(c.logoUrl)) ? c.logoUrl : '';
}
function brandLogo(c){
  c = c || getConfig();
  const src = brandLogoSrc(c);
  return src
    ? '<img src="'+attr(src)+'" alt="" loading="lazy" decoding="async">'
    : '<span class="tb-emoji">'+esc(c.logoEmoji||DEFAULTS.logoEmoji)+'</span>';
}

/** Saring config dari luar (impor/tempel JSON): hanya kunci dikenal, tipe & format benar. */
function sanitizeConfig(obj){
  const out={};
  if(!obj || typeof obj!=='object') return out;
  CONFIG_KEYS.forEach(k=>{
    if(obj[k]===undefined) return;
    const v=obj[k], d=FALLBACK[k];
    if(k==='colorPrimary'||k==='colorAccent'){ if(isHex(v)) out[k]=v; return; }
    if(k==='themeMode'){ if(['auto','light','dark'].indexOf(v)>-1) out[k]=v; return; }
    if(k==='logoUrl'){ if(v==='' || isImgSrc(v)) out[k]=v; return; }
    if(k==='levelNames'){
      if(v && typeof v==='object' && !Array.isArray(v)){
        const n={};
        Object.keys(FALLBACK.levelNames).forEach(lk=>{ if(typeof v[lk]==='string' && v[lk].trim()) n[lk]=v[lk].slice(0,30); });
        if(Object.keys(n).length) out[k]=Object.assign({}, FALLBACK.levelNames, n);
      }
      return;
    }
    if(k==='timerSeconds'){ const n=parseInt(v,10); if(isFinite(n)) out[k]=clampTimer(n); return; }
    if(Array.isArray(d)){ if(Array.isArray(v)) out[k]=v.filter(x=>typeof x==='string').slice(0,60); return; }
    if(typeof d==='boolean'){ if(typeof v==='boolean') out[k]=v; return; }
    if(typeof d==='number'){ const n=Number(v); if(isFinite(n)) out[k]=n; return; }
    if(typeof v==='string') out[k]=v.slice(0,300);
  });
  return out;
}

/* ---------- Katalog permainan (dipakai game & panel admin) ----------
   Hanya metadata. app.js yang menempelkan fungsi start() tiap permainan.
   Memerlukan data.js sudah dimuat sebelum fungsi ini dipanggil. */
const FOCUS = {
  all:    { name:'Semua',           sub:'Semua permainan' },
  quiz:   { name:'Kuis Topik',      sub:'Kuis per topik IPS' },
  quick:  { name:'Kuis Cepat',      sub:'Benar-salah, sortir, profesi, bendera' },
  puzzle: { name:'Puzzle & Urutan', sub:'Urutkan & cocokkan' },
};
/** Jumlah butir sebuah pool berlevel ({Beginner:[…],Intermediate:[…],Advanced:[…]}). */
function poolTotal(byLevel){
  return LEVEL_KEYS.reduce((n,k)=>n+((byLevel&&byLevel[k])?byLevel[k].length:0),0);
}
function gameCatalog(){
  const g=[];
  Object.keys(QUIZ).forEach(k=>{ const q=QUIZ[k];
    g.push({ id:'quiz:'+k, name:k, icon:q.icon, color:q.color, bg:q.bg, focus:'quiz', count:poolTotal(q.q)+' soal' }); });
  g.push({ id:'tf',     name:'Kilat benar atau salah',        icon:'ti-bolt',           color:'#993556', bg:'#FBEAF0', focus:'quick',  count:poolTotal(TF)+' soal' });
  g.push({ id:'sort',   name:'Sortir kebutuhan vs keinginan', icon:'ti-arrows-split-2', color:'#185FA5', bg:'#E6F1FB', focus:'quick',  count:poolTotal(SORT)+' kartu' });
  g.push({ id:'prof',   name:'Tebak profesi',                 icon:'ti-briefcase',      color:'#0F6E56', bg:'#E1F5EE', focus:'quick',  count:poolTotal(PROF)+' teka-teki' });
  g.push({ id:'flag',   name:'Tebak bendera negara',          icon:'ti-flag',           color:'#185FA5', bg:'#E6F1FB', focus:'quick',  count:poolTotal(FLAGS)+' bendera' });
  g.push({ id:'order',  name:'Urutkan sejarah',               icon:'ti-timeline',       color:'#A32D2D', bg:'#FCEBEB', focus:'puzzle', count:poolTotal(ORDER.items)+' peristiwa' });
  g.push({ id:'match1', name:MATCH1.name,                     icon:'ti-puzzle',         color:'#534AB7', bg:'#EEEDFE', focus:'puzzle', count:poolTotal(MATCH1.pairs)+' pasang' });
  g.push({ id:'match2', name:MATCH2.name,                     icon:'ti-puzzle-2',       color:'#854F0B', bg:'#FAEEDA', focus:'puzzle', count:poolTotal(MATCH2.pairs)+' pasang' });
  return g;
}

/* ---------- Util kecil ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function attr(s){ return esc(s); }
function toast(text){
  const t=document.createElement('div'); t.className='toast'; t.textContent=text;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),300); },1800);
}
