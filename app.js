/* =============================================================
   app.js — Petualangan IPS Ceria (model "room + nama")
   nama pemain → room → level → fokus → main → modal hasil → papan bintang.
   Semua lokal (localStorage).

   White-label diatur di config.js (default permanen) + admin.html (per perangkat).
   Lapisan bersamanya ada di brand.js: Store, K, getConfig, applyBranding, esc, toast…
   ============================================================= */

const app = () => document.getElementById('app');

/* ---------- Level & Fokus ----------
   Level menentukan DUA hal:
   1. Pool soal yang dipakai — tiap permainan punya 10 butir per level
      (30 butir total), dengan kesulitan yang meningkat. Lihat data.js.
   2. Panjang ronde & bonus bintang di bawah ini.
   Angka ronde tidak boleh melebihi 10 (isi pool per level). */
const LEVELS = {
  Beginner:    { desc:'Soal mudah, ronde pendek',  quiz:5,  tf:6,  sort:6,  prof:5,  flag:5,  order:5, match:4, bonus:0 },
  Intermediate:{ desc:'Soal sedang, ronde sedang', quiz:7,  tf:8,  sort:8,  prof:7,  flag:7,  order:6, match:5, bonus:1 },
  Advanced:    { desc:'Soal sulit, ronde panjang', quiz:10, tf:10, sort:10, prof:10, flag:10, order:8, match:6, bonus:2 },
};
/** Ambil pool sesuai level yang berlaku, dengan cadangan bila level kosong. */
function pool(byLevel){
  const lv=effLevel();
  return (byLevel && byLevel[lv] && byLevel[lv].length) ? byLevel[lv] : (byLevel[LEVEL_KEYS[0]]||[]);
}
/** Nama tampilan level (bisa di-brand ulang lewat panel admin). */
function levelName(k){ return (getConfig().levelNames||{})[k] || k; }
/** Level yang boleh dipilih anak. Selalu sisakan minimal satu. */
function activeLevels(){
  const on=getConfig().enabledLevels||[];
  const list=Object.keys(LEVELS).filter(k=>on.indexOf(k)>-1);
  return list.length?list:Object.keys(LEVELS);
}

/* Daftar permainan: metadata dari brand.js, fungsi start() ditempel di sini. */
const STARTERS = {
  tf:startTF, sort:startSort, prof:startProf, flag:startFlag, order:startOrder,
  match1:()=>startMatch(MATCH1), match2:()=>startMatch(MATCH2),
};
function buildGames(){
  return gameCatalog().map(g=>Object.assign({}, g, {
    start: g.id.indexOf('quiz:')===0 ? (()=>startQuiz(g.id.slice(5))) : STARTERS[g.id],
  }));
}
let GAMES=[];
/** Game yang dimatikan admin tidak muncul di mana pun (grid, hitungan fokus). */
function visibleGames(){
  const hidden=getConfig().hiddenGames||[];
  return GAMES.filter(g=>hidden.indexOf(g.id)===-1);
}
function gamesFor(focus){ const v=visibleGames(); return focus==='all'?v:v.filter(g=>g.focus===focus); }
function focusCount(f){ return gamesFor(f).length; }

/* ---------- State pemain & room ---------- */
let player='', playerStars=0;
let room={ code:'', level:'Beginner' };
let currentFocus='all';
let lastGameName='';
let joinedViaLink=false;   // room dibuka dari link/kode → jangan otomatis jadi host

/* Mode main (langkah 2 dari alur):
     'solo' → main sendiri, room disembunyikan, papan bintang = per perangkat
     'room' → main bersama teman, harus buat/masuk room dulu
   '' (kosong) = belum memilih → tampilkan layar pilihan. */
let mode='';
const SOLO_CODE='SOLO';    // "room" khusus untuk pemain solo di perangkat ini
function saveMode(){ mode ? Store.set(K.mode, mode) : Store.del(K.mode); }
function roomMode(){ return mode==='room' && !!getConfig().showRoom; }

/* ---------- Indikator langkah ----------
   Langkahnya ikut keadaan: "Mode" hilang bila admin mematikan room, "Room"
   hanya ada di mode bersama. Layar nama/mode/room punya render sendiri;
   'room' (panel), 'level' dan 'main' ditangani renderMain lewat menuStep.
   Sengaja TIDAK dirender di halaman permainan. */
const STEP_LABELS = { name:'Nama', mode:'Mode', room:'Room', level:'Level', main:'Main' };
let menuStep='main';   // 'room' | 'level' | 'main'

function stepList(){
  const s=['name'];
  if(getConfig().showRoom) s.push('mode');
  if(roomMode()) s.push('room');
  s.push('level','main');
  return s;
}
function stepNum(key){
  const l=stepList(), i=l.indexOf(key);
  return i<0 ? '' : 'Langkah '+(i+1)+' dari '+l.length;
}
function stepbar(active){
  const l=stepList(), cur=l.indexOf(active);
  let h='<div class="stepbar" id="stepbar">';
  l.forEach((k,i)=>{
    if(i) h += '<div class="s-line'+(i<=cur?' done':'')+'"></div>';
    const state = i===cur ? 'active' : (i<cur ? 'done' : 'todo');
    const clickable = !!player && i!==cur;   // sebelum nama diisi, langkah lain terkunci
    h += '<div class="step '+state+(clickable?' clickable':'')+'"'+(clickable?' data-step="'+k+'"':'')+'>'+
      '<span class="s-dot">'+(i<cur?'<i class="ti ti-check"></i>':(i+1))+'</span>'+
      '<span class="s-label">'+esc(STEP_LABELS[k])+'</span></div>';
  });
  return h+'</div>';
}
function wireStepbar(){
  const bar=$('stepbar'); if(!bar) return;
  bar.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>gotoStep(el.getAttribute('data-step')));
}
function gotoStep(key){
  if(key==='name'){ Store.del(K.player); player=''; renderNameEntry(); return; }
  if(!player) return;
  if(key==='mode'){ mode=''; saveMode(); renderModePick(); return; }
  if(key==='room'){ if(!room.code){ renderRoomSetup(); return; } menuStep='room'; }
  else menuStep=key;
  renderMain();
  window.scrollTo(0,0);
}
/** Tombol Kembali / Lanjut untuk langkah menu (room/level/main). */
function stepNav(key){
  const l=stepList(), i=l.indexOf(key);
  const prev=l[i-1], next=l[i+1];
  return '<div class="stepnav">'+
    (prev?'<button class="pill" id="sBack"><i class="ti ti-arrow-left"></i> '+esc(STEP_LABELS[prev])+'</button>':'')+
    (next?'<button class="btn-accent" id="sNext">Lanjut ke '+esc(STEP_LABELS[next])+' <i class="ti ti-arrow-right"></i></button>':'')+
  '</div>';
}

function claimHost(){ const m=getMeta(); if(m && !m.host){ m.host=player; saveMeta(m); return true; } return false; }

function loadPlayerStars(){ playerStars = (Store.get(K.stars(player),{stars:0})||{}).stars||0; }
function savePlayerStars(){ Store.set(K.stars(player),{stars:playerStars}); }

function newCode(){ const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<6;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; }
function saveRoom(){ Store.set(K.room, room); }
function roomLink(){ return location.origin+location.pathname+'?room='+room.code+'&level='+effLevel(); }

/* ---------- Metadata room (nama, host, kunci level) ---------- */
function getMeta(code){ return Store.get(K.meta(code||room.code), null); }
function saveMeta(m,code){ Store.set(K.meta(code||room.code), m); }
/** Pastikan meta room ada. host=null berarti belum ada host di perangkat ini. */
function ensureRoom(code, host){
  let m=getMeta(code);
  if(!m){ m={ name:'Room '+code, host:host||null, lockLevel:false, level:room.level||'Beginner', createdAt:Date.now() }; saveMeta(m,code); }
  return m;
}
function isHost(){ const m=getMeta(); return !!(m && m.host && m.host===player); }
function hostName(){ const m=getMeta(); return (m&&m.host)||null; }
/** Level yang berlaku: kalau host mengunci, semua ikut level room.
    Selalu dijepit ke level yang masih diaktifkan admin. */
function effLevel(){
  const m=getMeta();
  const k=(m&&m.lockLevel&&m.level)?m.level:room.level;
  const on=activeLevels();
  return on.indexOf(k)>-1 ? k : on[0];
}
function setLevel(k){
  const m=getMeta();
  if(m && m.lockLevel && !isHost()){ toast('🔒 Level dikunci oleh host.'); return; }
  if(m && m.lockLevel && isHost()){ m.level=k; saveMeta(m); }
  room.level=k; saveRoom(); renderMain();
}

/* ---------- Keanggotaan & papan bintang (per room, lokal) ---------- */
function getLB(code){ return Store.get(K.lb(code||room.code), {}); }
function setLB(lb,code){ Store.set(K.lb(code||room.code), lb); }
function joinMember(name,code){
  if(!name) return;
  const lb=getLB(code);
  if(!lb[name]) { lb[name]={ stars:0, joinedAt:Date.now() }; setLB(lb,code); }
}
function leaveMember(name,code){ const lb=getLB(code); delete lb[name]; setLB(lb,code); }
function memberCount(){ return Object.keys(getLB()).length; }
function clearBoard(){ const lb=getLB(); Object.keys(lb).forEach(n=>{ lb[n]={stars:0, joinedAt:lb[n].joinedAt||Date.now()}; }); setLB(lb); }
function recordLB(gameName, correct, total, delta, rating){
  const lb=getLB();
  const cur=lb[player]||{stars:0, joinedAt:Date.now()};
  cur.stars=(cur.stars||0)+delta;
  cur.game=gameName; cur.level=effLevel(); cur.correct=correct; cur.total=total; cur.delta=delta; cur.rating=rating; cur.ts=Date.now();
  lb[player]=cur; setLB(lb);
}

/* ---------- Progres petualangan (lokal per pemain) ---------- */
let playerProgress=null;
const PROGRESS_POSTS = [
  { name:'Pos Peta', sub:'Kenali arah dan denah', icon:'ti-map' },
  { name:'Pasar Ceria', sub:'Kebutuhan dan keinginan', icon:'ti-shopping-bag' },
  { name:'Kampung Kerja', sub:'Profesi dan kegiatan ekonomi', icon:'ti-briefcase' },
  { name:'Jejak Sejarah', sub:'Urutan peristiwa penting', icon:'ti-timeline' },
  { name:'Nusantara', sub:'Budaya dan lingkungan sekitar', icon:'ti-flower' },
  { name:'Kota Pintar', sub:'Tantangan campuran', icon:'ti-building-community' },
];
const BADGES = [
  { id:'first', name:'Langkah Pertama', hint:'Selesaikan 1 permainan', icon:'ti-flag', ok:p=>p.games>=1 },
  { id:'five', name:'Rajin Main', hint:'Selesaikan 5 permainan', icon:'ti-run', ok:p=>p.games>=5 },
  { id:'correct25', name:'Tepat Jawab', hint:'Jawab 25 soal benar', icon:'ti-checks', ok:p=>p.correct>=25 },
  { id:'fast10', name:'Kilat', hint:'Dapat 10 bonus cepat', icon:'ti-bolt', ok:p=>p.speedy>=10 },
  { id:'star50', name:'Pemburu Bintang', hint:'Kumpulkan 50 bintang', icon:'ti-star', ok:p=>p.stars>=50 },
  { id:'perfect3', name:'Tiga Bintang', hint:'Raih rating 3 di 3 ronde', icon:'ti-trophy', ok:p=>p.perfect>=3 },
  { id:'explorer', name:'Penjelajah', hint:'Buka 4 pos petualangan', icon:'ti-route', ok:p=>postCount(p)>=4 },
  { id:'champion', name:'Juara Lokal', hint:'Selesaikan 20 permainan', icon:'ti-crown', ok:p=>p.games>=20 },
];
function progressKey(name){ return 'ips_progress_'+encodeURIComponent(String(name||'anon').trim().toLowerCase()); }
function dateKey(d){
  const m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return d.getFullYear()+'-'+m+'-'+day;
}
function todayKey(){ return dateKey(new Date()); }
function freshProgress(){
  return { games:0, correct:0, total:0, stars:0, speedy:0, perfect:0, days:[], byGame:{},
    rewards:{},
    daily:{ day:todayKey(), games:0, correct:0, speedy:0, stars:0 } };
}
function normalizeProgress(p){
  const base=freshProgress();
  p=Object.assign(base, p||{});
  p.byGame=p.byGame||{};
  p.rewards=p.rewards||{};
  p.days=Array.isArray(p.days)?p.days:[];
  if(!p.daily || p.daily.day!==todayKey()) p.daily={ day:todayKey(), games:0, correct:0, speedy:0, stars:0 };
  ['games','correct','total','stars','speedy','perfect'].forEach(k=>{ p[k]=Math.max(0, Number(p[k])||0); });
  ['games','correct','speedy','stars'].forEach(k=>{ p.daily[k]=Math.max(0, Number(p.daily[k])||0); });
  return p;
}
function loadProgress(){ playerProgress=normalizeProgress(Store.get(progressKey(player), null)); saveProgress(); }
function saveProgress(){ if(player && playerProgress) Store.set(progressKey(player), playerProgress); }
function recordProgress(gameName, correct, total, delta, rating, speedyGain){
  const p=normalizeProgress(playerProgress);
  const day=todayKey();
  p.games+=1; p.correct+=correct; p.total+=total; p.stars+=delta; p.speedy+=speedyGain;
  if(rating>=3) p.perfect+=1;
  if(p.days.indexOf(day)===-1) p.days.push(day);
  p.days=p.days.slice(-60);
  p.daily.games+=1; p.daily.correct+=correct; p.daily.speedy+=speedyGain; p.daily.stars+=delta;
  const key=lastGameName||gameName||'Permainan';
  const g=p.byGame[key]||{ plays:0, best:0, correct:0, total:0 };
  g.plays+=1; g.best=Math.max(g.best, rating); g.correct+=correct; g.total+=total;
  p.byGame[key]=g;
  playerProgress=p; saveProgress();
}
function postCount(p){ return Math.min(PROGRESS_POSTS.length, Math.floor((normalizeProgress(p).games+2)/3)); }
function pct(n,t){ return Math.max(0, Math.min(100, t?Math.round((n/t)*100):0)); }
function streakDays(p){
  const days=(normalizeProgress(p).days||[]).slice().sort();
  if(!days.length) return 0;
  let cur=new Date(); cur.setHours(0,0,0,0);
  let streak=0;
  for(let i=days.length-1;i>=0;i--){
    const want=dateKey(cur);
    if(days[i]===want){ streak++; cur.setDate(cur.getDate()-1); }
    else if(days[i]<want) break;
  }
  return streak;
}
function gameKey(g){ return g.name || (g.id&&g.id.indexOf('quiz:')===0?g.id.slice(5):g.id) || 'Permainan'; }
function gameProgress(g,p){
  p=normalizeProgress(p);
  const d=p.byGame[gameKey(g)]||{ plays:0, best:0, correct:0, total:0 };
  const acc=d.total?Math.round((d.correct/d.total)*100):0;
  const master=Math.min(100, Math.round(Math.min(d.plays,3)/3*55 + Math.min(d.best,3)/3*30 + Math.min(acc,100)/100*15));
  const label=d.plays===0?'Belum dicoba':master>=85?'Dikuasai':master>=55?'Makin kuat':'Latihan';
  return Object.assign({}, d, { acc, master, label });
}
function recommendedGames(p){
  const list=visibleGames().slice().sort((a,b)=>{
    const pa=gameProgress(a,p), pb=gameProgress(b,p);
    return (pa.master-pb.master) || (pa.plays-pb.plays) || a.name.localeCompare(b.name);
  });
  return list.slice(0,3);
}
function missionRows(p){
  p=normalizeProgress(p);
  return [
    { icon:'ti-device-gamepad-2', title:'Selesaikan 3 permainan hari ini', n:p.daily.games, t:3 },
    { icon:'ti-check', title:'Jawab 15 soal benar', n:p.daily.correct, t:15 },
    { icon:'ti-bolt', title:'Dapat 5 bonus cepat', n:p.daily.speedy, t:5 },
  ];
}

/* ============================================================
   BOOT & ROUTER
   ============================================================ */
function boot(){
  applyBranding();
  watchTheme();
  document.title = getConfig().appName;
  GAMES=buildGames();

  const p=new URLSearchParams(location.search);
  const savedRoom=Store.get(K.room,null);
  const lv=activeLevels();
  joinedViaLink=false;

  player=Store.get(K.player,'')||'';
  mode=Store.get(K.mode,'')||'';

  if(p.get('room')){
    // Dibuka dari link/QR teman → langsung mode bersama, lewati layar pilihan.
    room={ code:p.get('room').toUpperCase(),
           level:(p.get('level')&&LEVELS[p.get('level')]) ? p.get('level') : (savedRoom?savedRoom.level:lv[0]) };
    joinedViaLink=true;
    mode='room'; saveMode();
  }
  else if(savedRoom&&savedRoom.code){ room=savedRoom; }
  else { room={ code:'', level:lv[0] }; }        // belum ada room: dibuat saat pilih "bersama teman"

  // Level tersimpan bisa saja dimatikan admin sejak terakhir main.
  if(lv.indexOf(room.level)===-1) room.level=lv[0];

  // Admin bisa mematikan fitur room sepenuhnya → semua orang main sendiri.
  if(!getConfig().showRoom) mode='solo';
  if(mode==='solo') room.code=SOLO_CODE;

  if(room.code){
    saveRoom();
    // Room dari link belum tentu punya host di perangkat ini → host:null (bisa diklaim).
    ensureRoom(room.code, joinedViaLink ? null : (player||null));
  }
  route();
}

/** Penentu langkah: nama → pilih mode → (atur room) → menu utama. */
function route(){
  if(!player){ renderNameEntry(); return; }              // langkah 1
  if(!mode){ renderModePick(); return; }                 // langkah 2
  if(mode==='room' && !room.code){ renderRoomSetup(); return; }  // langkah 3 (hanya mode bersama)

  joinMember(player);
  if(!joinedViaLink) claimHost();   // pembuat room / pemain solo jadi host
  loadPlayerStars();
  loadProgress();
  renderMain();                                          // langkah 4
}

/* ---------- Layar nama ---------- */
function renderNameEntry(){
  const c=getConfig();
  app().innerHTML = topbar() +
    '<div class="wrap">'+ stepbar('name') +'<div class="namecard">'+
      '<div class="bigstar">⭐</div>'+
      '<h1>'+esc(c.welcomeTitle||DEFAULTS.welcomeTitle)+'</h1>'+
      '<p class="sub">'+esc(c.welcomeText||DEFAULTS.welcomeText)+'</p>'+
      '<div id="nmsg"></div>'+
      '<div class="nameRow">'+
        '<input id="pname" type="text" maxlength="20" placeholder="Tulis namamu di sini" autocomplete="off">'+
        '<button class="btn-accent" id="pgo">Mulai main! 🚀</button>'+
      '</div>'+
    '</div></div>' + footerGear();
  const go=()=>{
    const n=$('pname').value.trim();
    if(!n){ msg('nmsg','err','Tulis namamu dulu ya 😊'); return; }
    player=n; Store.set(K.player,n);
    loadPlayerStars();
    menuStep='level';            // pemain baru: lanjut bertahap, jangan langsung ke grid game
    route();                     // → pilih mode (atau langsung menu bila room dimatikan/ikut link)
  };
  $('pgo').onclick=go;
  $('pname').addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
  $('pname').focus();
  wireStepbar();
  wireGear();
}

/* ---------- Langkah 2: mau main bagaimana? ---------- */
function renderModePick(){
  app().innerHTML = topbar() +
    '<div class="wrap">'+ stepbar('mode') +'<div class="stepcard">'+
      '<div class="stepnum">'+esc(stepNum('mode'))+'</div>'+
      '<h1>Mau main bagaimana, '+esc(player)+'?</h1>'+
      '<p class="sub">Pilih salah satu ya. Kamu bisa menggantinya kapan saja.</p>'+
      '<div class="choice-grid">'+
        '<button class="choice-card" id="mSolo">'+
          '<span class="ch-icon solo"><i class="ti ti-user"></i></span>'+
          '<span class="ch-title">Main sendiri</span>'+
          '<span class="ch-sub">Langsung pilih permainan dan kumpulkan bintangmu.</span>'+
        '</button>'+
        '<button class="choice-card" id="mRoom">'+
          '<span class="ch-icon group"><i class="ti ti-users"></i></span>'+
          '<span class="ch-title">Bersama teman</span>'+
          '<span class="ch-sub">Buat room atau masuk pakai kode teman, lalu adu bintang.</span>'+
        '</button>'+
      '</div>'+
      '<button class="linkbtn back" id="mBack"><i class="ti ti-arrow-left"></i> Ganti nama</button>'+
    '</div></div>' + footerGear();

  $('mSolo').onclick=()=>{
    mode='solo'; saveMode();
    room={ code:SOLO_CODE, level:room.level||activeLevels()[0] };
    saveRoom(); ensureRoom(SOLO_CODE, player);
    joinedViaLink=false;
    menuStep='level';
    route();
  };
  $('mRoom').onclick=()=>{ mode='room'; saveMode(); room.code=''; renderRoomSetup(); };
  $('mBack').onclick=()=>gotoStep('name');
  wireStepbar();
  wireGear();
}

/* ---------- Langkah 3 (mode bersama): buat atau masuk room ---------- */
function renderRoomSetup(){
  const suggested=newCode();
  app().innerHTML = topbar() +
    '<div class="wrap">'+ stepbar('room') +'<div class="stepcard">'+
      '<div class="stepnum">'+esc(stepNum('room'))+' · Main bersama teman</div>'+
      '<h1>Buat room atau masuk room</h1>'+
      '<p class="sub">Room membuat kalian punya papan bintang bersama.</p>'+
      '<div id="rsmsg"></div>'+

      '<div class="setup-block">'+
        '<div class="sb-head"><i class="ti ti-crown"></i> Buat room baru</div>'+
        '<p class="sb-sub">Kamu jadi <b>host</b>. Bagikan kodenya ke teman-temanmu.</p>'+
        '<div class="sb-code">'+esc(suggested)+'</div>'+
        '<button class="btn-accent block" id="rsCreate">Buat room ini 🚀</button>'+
      '</div>'+

      '<div class="setup-or"><span>atau</span></div>'+

      '<div class="setup-block">'+
        '<div class="sb-head"><i class="ti ti-login-2"></i> Masuk room teman</div>'+
        '<p class="sb-sub">Ketik kode room yang diberikan temanmu.</p>'+
        '<div class="join">'+
          '<input id="rsCode" type="text" maxlength="6" placeholder="Kode room" autocomplete="off">'+
          '<button class="primary" id="rsJoin">Masuk</button>'+
        '</div>'+
      '</div>'+

      '<button class="linkbtn back" id="rsBack"><i class="ti ti-arrow-left"></i> Kembali</button>'+
    '</div></div>' + footerGear();

  $('rsCreate').onclick=()=>createRoom(suggested);
  const join=()=>{
    const v=String($('rsCode').value||'').trim().toUpperCase();
    if(v.length<4){ msg('rsmsg','err','Kode room minimal 4 karakter.'); return; }
    joinRoom(v);
  };
  $('rsJoin').onclick=join;
  $('rsCode').addEventListener('keydown',e=>{ if(e.key==='Enter') join(); });
  $('rsCode').focus();
  $('rsBack').onclick=()=>gotoStep('mode');
  wireStepbar();
  wireGear();
}

/* ---------- Menu utama: langkah room / level / main ---------- */
function helloSub(step, roomOn){
  if(step==='room')  return 'Bagikan kode <b>'+esc(room.code)+'</b> ke temanmu, lalu lanjut pilih level.';
  if(step==='level') return 'Pilih tingkat tantangan yang kamu mau.';
  return roomOn
    ? 'Kamu main <b>bersama teman</b> di room '+esc(room.code)+'.'
    : 'Kamu main <b>sendiri</b>. Pilih permainan favoritmu:';
}
function renderMain(){
  const cfg=getConfig();
  const roomOn=roomMode();
  // Langkah room hanya ada di mode bersama; kalau tidak, jangan sampai tersangkut di sana.
  if(menuStep==='room' && !roomOn) menuStep='level';
  const step=menuStep;

  const body =
    step==='room'  ? roomSection() :
    step==='level' ? levelSection() :
    progressSection() + collectionSection() + focusSection() + (cfg.showLeaderboard ? lbSection(roomOn) : '');

  app().innerHTML = topbar() + '<div class="wrap">'+

    '<div class="hello"><div><h2 class="hi">Halo, '+esc(player)+'! 👋</h2>'+
      '<p class="hi-sub">'+helloSub(step, roomOn)+'</p></div>'+
      '<div class="hello-btns">'+
        (cfg.showRoom?'<button class="pill" id="switchM"><i class="ti ti-refresh"></i> Ganti mode</button>':'')+
        '<button class="pill" id="switchP"><i class="ti ti-user"></i> Ganti pemain</button>'+
      '</div></div>'+

    stepbar(step) + body + stepNav(step) +

  '</div>' + footerGear();

  /* handlers — tiap langkah hanya merender sebagiannya, jadi semua dijaga */
  const on=(id,fn)=>{ const el=$(id); if(el) el.onclick=fn; };

  on('switchP',()=>gotoStep('name'));
  on('switchM',()=>gotoStep('mode'));

  const l=stepList(), i=l.indexOf(step);
  on('sBack',()=>gotoStep(l[i-1]));
  on('sNext',()=>gotoStep(l[i+1]));

  if(step==='room'){
    on('rCreate',()=>createRoom());
    on('rCode',()=>copy(room.code,'Kode room disalin!'));
    on('rLink',()=>copy(roomLink(),'Link room disalin!'));
    on('rQR',showQR);
    on('rShare',async()=>{ if(navigator.share){ try{ await navigator.share({title:getConfig().appName,text:'Ayo main IPS bareng! Kode room: '+room.code, url:roomLink()});}catch(e){} } else copy(roomLink(),'Link room disalin!'); });
    on('rLeave',()=>{ leaveMember(player); toast('Kamu keluar room.'); room.code=''; saveRoom(); renderRoomSetup(); });
    on('rJoinBtn',()=>joinRoom($('rJoin').value));
    $('rJoin').addEventListener('keydown',e=>{ if(e.key==='Enter') joinRoom($('rJoin').value); });
    on('rRename',renameRoom);
    on('rClaim',()=>{ if(claimHost()){ toast('Kamu sekarang host room ini.'); renderMain(); } });
  }

  if(step==='level'){
    on('rLock',toggleLock);
    $('levelGrid').querySelectorAll('[data-opt]').forEach(el=>el.onclick=()=>setLevel(el.getAttribute('data-opt')));
  }

  if(step==='main'){
    on('missionStart',()=>{ const el=$('gameGrid'); if(el) el.scrollIntoView({behavior:'smooth', block:'start'}); });
    on('claimDailyReward',claimDailyReward);
    document.querySelectorAll('[data-game]').forEach(el=>el.onclick=()=>{
      const g=GAMES.find(x=>x.id===el.getAttribute('data-game'));
      if(g) openGame(g);
    });
    $('focusGrid').querySelectorAll('[data-opt]').forEach(el=>el.onclick=()=>{ currentFocus=el.getAttribute('data-opt'); renderMain(); });
    if(cfg.showLeaderboard){
      on('lbRefresh',renderLB);
      on('lbClear',()=>{ if(confirm('Kosongkan semua bintang di papan ini? Anggota tetap ada.')){ clearBoard(); renderMain(); toast('Papan bintang dikosongkan.'); } });
      renderLB();
    }
    renderGameGrid();
  }

  wireStepbar();
  wireGear();
}

function focusSection(){
  return '<div class="section">'+
    '<div class="sec-head"><div class="sec-label">FOKUS BELAJAR</div><div class="sec-title">'+esc(FOCUS[currentFocus].name)+'</div>'+
      '<div class="sec-sub">'+esc(FOCUS[currentFocus].sub)+'</div></div>'+
    '<div class="opt-grid" id="focusGrid">'+
      Object.keys(FOCUS).map(k=>optCard(k, FOCUS[k].name, focusCount(k)+' game', currentFocus===k, 'focus', true)).join('')+
    '</div>'+
    '<div class="game-grid" id="gameGrid"></div>'+
  '</div>';
}
/** Papan bintang — bisa dimatikan admin. Di mode solo isinya pemain di perangkat ini. */
function progressSection(){
  const p=normalizeProgress(playerProgress);
  const missions=missionRows(p);
  const done=missions.filter(m=>m.n>=m.t).length;
  const ready=done===missions.length;
  const claimed=!!p.rewards[p.daily.day];
  const posts=postCount(p);
  const acc=p.total?Math.round((p.correct/p.total)*100):0;
  return '<div class="progress-stack">'+
    '<div class="section mission-card">'+
      '<div class="sec-head lb-head"><div><div class="sec-label">MISI HARI INI</div>'+
        '<div class="sec-title">'+done+' dari '+missions.length+' misi selesai</div>'+
        '<div class="sec-sub">Mainkan ronde pendek, kumpulkan bintang, lalu buka pos baru.</div></div>'+
        '<button class="btn-accent sm" id="missionStart"><i class="ti ti-player-play"></i> Mulai misi</button></div>'+
      '<div class="mission-list">'+missions.map(m=>missionRow(m)).join('')+'</div>'+
      '<div class="reward-row">'+
        '<div><b>Hadiah harian</b><span>'+rewardText(ready, claimed)+'</span></div>'+
        '<button class="pill sm" id="claimDailyReward"'+(!ready||claimed?' disabled':'')+'><i class="ti ti-gift"></i> Ambil +5</button>'+
      '</div>'+
    '</div>'+
    '<div class="stat-grid">'+
      statCard('Permainan', p.games, 'selesai')+
      statCard('Akurasi', acc+'%', p.correct+' / '+p.total+' benar')+
      statCard('Bintang', p.stars, 'dari progres')+
      statCard('Streak', streakDays(p)+' hari', 'belajar beruntun')+
    '</div>'+
    recommendationSection(p)+
    '<div class="section map-card">'+
      '<div class="sec-head lb-head"><div><div class="sec-label">PETA PETUALANGAN</div>'+
        '<div class="sec-title">'+posts+' / '+PROGRESS_POSTS.length+' pos terbuka</div>'+
        '<div class="sec-sub">Setiap 3 permainan membuka satu pos baru.</div></div>'+
        '<span class="map-chip">'+Math.min(p.games, PROGRESS_POSTS.length*3)+' / '+(PROGRESS_POSTS.length*3)+'</span></div>'+
      '<div class="adventure-map">'+PROGRESS_POSTS.map((post,i)=>mapPost(post, i, posts)).join('')+'</div>'+
    '</div>'+
  '</div>';
}
function rewardText(ready, claimed){
  if(claimed) return 'Sudah diambil hari ini.';
  return ready ? 'Semua misi selesai, hadiah siap diambil.' : 'Selesaikan semua misi untuk membuka hadiah.';
}
function claimDailyReward(){
  const p=normalizeProgress(playerProgress);
  const ready=missionRows(p).every(m=>m.n>=m.t);
  if(!ready || p.rewards[p.daily.day]) return;
  p.rewards[p.daily.day]=true;
  p.stars+=5; p.daily.stars+=5;
  playerProgress=p; saveProgress();
  playerStars+=5; savePlayerStars();
  recordLB('Hadiah misi harian', 0, 0, 5, 0);
  toast('Hadiah harian +5 bintang!');
  renderMain();
}
function recommendationSection(p){
  const recs=recommendedGames(p);
  if(!recs.length) return '';
  return '<div class="section next-card">'+
    '<div class="sec-head"><div class="sec-label">LANJUTKAN BELAJAR</div>'+
      '<div class="sec-title">Rekomendasi berikutnya</div>'+
      '<div class="sec-sub">Dipilih dari permainan yang belum dicoba atau masih perlu latihan.</div></div>'+
    '<div class="next-grid">'+recs.map(nextCard).join('')+'</div>'+
  '</div>';
}
function nextCard(g){
  const gp=gameProgress(g,playerProgress);
  return '<button class="next-item" data-game="'+attr(g.id)+'">'+
    '<span class="next-icon" style="background:'+g.bg+';color:'+g.color+'"><i class="ti '+g.icon+'"></i></span>'+
    '<span class="next-copy"><b>'+esc(g.name)+'</b><small>'+esc(gp.label)+' - '+gp.master+'%</small></span>'+
  '</button>';
}
function missionRow(m){
  const val=Math.min(m.n,m.t), done=m.n>=m.t;
  return '<div class="mission-row'+(done?' done':'')+'">'+
    '<div class="mission-icon"><i class="ti '+m.icon+'"></i></div>'+
    '<div class="mission-main"><div class="mission-title">'+esc(m.title)+'</div>'+
      '<div class="mini-bar"><span style="width:'+pct(val,m.t)+'%"></span></div></div>'+
    '<div class="mission-count">'+val+' / '+m.t+'</div>'+
  '</div>';
}
function statCard(k,v,sub){
  return '<div class="stat-card"><div class="stat-value">'+esc(v)+'</div><div class="stat-label">'+esc(k)+'</div><div class="stat-sub">'+esc(sub)+'</div></div>';
}
function mapPost(post, i, open){
  const unlocked=i<open, current=i===open;
  return '<div class="map-post '+(unlocked?'open':current?'next':'locked')+'">'+
    '<div class="map-node"><i class="ti '+(unlocked?post.icon:current?'ti-lock-open':'ti-lock')+'"></i></div>'+
    '<div class="map-copy"><div class="map-name">'+esc(post.name)+'</div><div class="map-sub">'+esc(unlocked?post.sub:(current?'Main '+((i+1)*3)+' ronde untuk membuka':'Terkunci'))+'</div></div>'+
  '</div>';
}
function collectionSection(){
  const p=normalizeProgress(playerProgress);
  const unlocked=BADGES.filter(b=>b.ok(p)).length;
  return '<div class="section collection-card">'+
    '<div class="sec-head"><div class="sec-label">KOLEKSIKU</div>'+
      '<div class="sec-title">'+unlocked+' / '+BADGES.length+' lencana terbuka</div>'+
      '<div class="sec-sub">Lencana terbuka otomatis dari permainan yang kamu selesaikan.</div></div>'+
    '<div class="badge-grid">'+BADGES.map(b=>badgeCard(b,p)).join('')+'</div>'+
  '</div>';
}
function badgeCard(b,p){
  const open=b.ok(normalizeProgress(p));
  return '<div class="badge-card '+(open?'open':'locked')+'">'+
    '<div class="badge-icon"><i class="ti '+(open?b.icon:'ti-question-mark')+'"></i></div>'+
    '<div class="badge-name">'+esc(open?b.name:'Misteri')+'</div>'+
    '<div class="badge-hint">'+esc(b.hint)+'</div>'+
  '</div>';
}
function lbSection(roomOn){
  return '<div class="section">'+
    '<div class="sec-head lb-head"><div><div class="sec-label">🏆 PAPAN BINTANG '+
        '<span class="muted">'+(roomOn?'(Room '+esc(room.code)+' lokal)':'(di perangkat ini)')+'</span></div>'+
      '<div class="sec-sub">'+(roomOn
        ? memberCount()+' anggota · Teman bisa join dengan kode '+esc(room.code)+', link, atau QR.'
        : memberCount()+' pemain di perangkat ini · Mau adu bintang dengan teman? Pakai <b>Ganti mode</b>.')+'</div></div>'+
      '<div class="lb-tools"><button class="pill sm" id="lbRefresh">Refresh</button>'+
        (isHost()?'<button class="pill sm danger" id="lbClear"><i class="ti ti-eraser"></i> Kosongkan</button>':'')+
      '</div></div>'+
    '<div id="lbList"></div>'+
  '</div>';
}

function optCard(key, title, sub, active, kind, accent, locked){
  return '<div class="opt-card'+(active?(accent?' active-accent':' active'):'')+(locked?' locked':'')+'" data-opt="'+attr(key)+'">'+
    '<div class="oc-title">'+esc(title)+(locked&&active?' 🔒':'')+'</div><div class="oc-sub">'+esc(sub)+'</div></div>';
}

/* ---------- Panel room ---------- */
function roomSection(){
  const m=getMeta()||{}, host=hostName(), me=isHost();
  return '<div class="section">'+
    '<div class="sec-head lb-head">'+
      '<div><div class="sec-label">MAIN BERSAMA</div>'+
        '<div class="sec-title">'+esc(m.name||('Room '+room.code))+
          (me?' <button class="iconbtn" id="rRename" title="Ganti nama room"><i class="ti ti-pencil"></i></button>':'')+'</div>'+
        '<div class="sec-sub">'+memberCount()+' anggota · Host: '+(host?esc(host)+(me?' (kamu)':''):'<i>belum ada</i>')+'</div>'+
      '</div>'+
      (!host?'<button class="pill sm" id="rClaim"><i class="ti ti-crown"></i> Jadi host</button>':'')+
    '</div>'+
    '<div class="room-grid">'+
      '<div class="room-info">'+
        '<div class="roombox"><span class="rb-k">Kode room</span> <b>'+esc(room.code)+'</b> '+
          '<span class="rb-k">Level</span> <b>'+esc(effLevel())+'</b>'+
          (m.lockLevel?' <span class="lockchip">🔒 dikunci</span>':'')+'</div>'+
        '<p class="room-note">Mode lokal: kode, link & QR bisa dibuka, tapi papan bintang lintas perangkat perlu mode server.</p>'+
      '</div>'+
      '<div class="room-actions">'+
        '<button class="primary" id="rCreate">Buat room</button>'+
        '<button id="rCode">Salin kode</button>'+
        '<button id="rLink">Salin link</button>'+
        '<button id="rQR"><i class="ti ti-qrcode"></i> QR</button>'+
        '<button id="rShare">Bagikan</button>'+
        '<button id="rLeave">Keluar room</button>'+
        '<div class="join"><input id="rJoin" type="text" maxlength="6" placeholder="Kode room" value="'+attr(room.code)+'"><button id="rJoinBtn">Masuk</button></div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function levelSection(){
  const m=getMeta()||{}, me=isHost(), locked=!!m.lockLevel, eff=effLevel();
  const roomOn=roomMode();
  const sub = (locked && roomOn)
    ? '🔒 Level dikunci host di <b>'+esc(levelName(m.level))+'</b>'+(me?' — kamu bisa mengubahnya.':' — hanya host yang bisa mengubah.')
    : 'Setiap pemain bebas memilih levelnya sendiri.';
  return '<div class="section">'+
    '<div class="sec-head lb-head">'+
      '<div><div class="sec-label">LEVEL</div><div class="sec-title">Pilih tingkat tantangan</div>'+
        '<div class="sec-sub">'+sub+'</div></div>'+
      (me&&roomOn?'<button class="pill sm" id="rLock">'+(locked?'<i class="ti ti-lock-open"></i> Buka kunci':'<i class="ti ti-lock"></i> Kunci level')+'</button>':'')+
    '</div>'+
    '<div class="opt-grid" id="levelGrid">'+
      activeLevels().map(k=>optCard(k, levelName(k), LEVELS[k].desc, eff===k, 'level', false, locked&&!me)).join('')+
    '</div>'+
  '</div>';
}

/* ---------- Aksi room ----------
   Dipakai dari layar setup (langkah 3) maupun dari panel room di menu utama.
   Keduanya memastikan mode='room' supaya router tidak balik ke layar pilihan. */
function createRoom(preset){
  const code=preset||newCode();
  const lvl=(room.level && activeLevels().indexOf(room.level)>-1) ? room.level : activeLevels()[0];
  mode='room'; saveMode();
  room={ code, level:lvl };
  saveRoom();
  joinedViaLink=false;
  const m=ensureRoom(code, player||null);
  m.host=player||null; m.name='Room '+code; m.lockLevel=false; m.level=lvl; saveMeta(m,code);
  joinMember(player,code);
  loadPlayerStars();
  toast('Room '+code+' dibuat. Kamu host-nya!');
  menuStep='room';        // tunjukkan kode & QR dulu, baru lanjut ke level
  renderMain();
}
function joinRoom(codeRaw){
  const v=String(codeRaw||'').trim().toUpperCase();
  if(v.length<4){ toast('Kode room minimal 4 karakter.'); return; }
  if(v===SOLO_CODE){ toast('Kode itu tidak bisa dipakai.'); return; }
  if(mode==='room' && v===room.code){ toast('Kamu sudah di room '+v+'.'); return; }
  mode='room'; saveMode();
  room={ code:v, level:room.level };
  saveRoom();
  joinedViaLink=true;                 // bergabung ke room orang lain → jangan auto-host
  const m=ensureRoom(v, null);
  if(m.lockLevel && m.level){ room.level=m.level; saveRoom(); }
  joinMember(player,v);
  loadPlayerStars();
  toast('Masuk ke room '+v+'.');
  menuStep='room';
  renderMain();
}
function renameRoom(){
  if(!isHost()){ toast('Hanya host yang bisa mengganti nama room.'); return; }
  const m=getMeta();
  overlay('<div class="modal"><button class="modal-x" id="nrX"><i class="ti ti-x"></i></button>'+
    '<h3><i class="ti ti-pencil"></i> Ganti nama room</h3>'+
    '<label class="field"><span>Nama room</span><input id="nrName" type="text" maxlength="30" value="'+attr(m.name||'')+'" placeholder="mis. Kelas 4B"></label>'+
    '<div class="modal-actions"><button class="btn-accent" id="nrSave">Simpan</button></div></div>');
  $('nrX').onclick=closeOverlay;
  const save=()=>{ const v=$('nrName').value.trim(); if(!v){ toast('Nama room tidak boleh kosong.'); return; }
    m.name=v; saveMeta(m); closeOverlay(); renderMain(); toast('Nama room diperbarui.'); };
  $('nrSave').onclick=save;
  $('nrName').addEventListener('keydown',e=>{ if(e.key==='Enter') save(); });
  $('nrName').focus();
}
function toggleLock(){
  if(!isHost()){ toast('Hanya host yang bisa mengunci level.'); return; }
  const m=getMeta();
  m.lockLevel=!m.lockLevel;
  if(m.lockLevel) m.level=room.level;      // kunci pada level host saat ini
  saveMeta(m); renderMain();
  toast(m.lockLevel?('🔒 Level dikunci di '+m.level+'.'):'🔓 Level dibuka, pemain bebas memilih.');
}

/* ---------- QR join ---------- */
function qrSvg(text){
  if(typeof qrcode==='undefined') return null;      // CDN gagal dimuat
  try{ const q=qrcode(0,'M'); q.addData(text); q.make(); return q.createSvgTag({cellSize:6, margin:2}); }
  catch(e){ return null; }
}
function showQR(){
  const link=roomLink(), svg=qrSvg(link);
  overlay('<div class="modal qr-modal"><button class="modal-x" id="qrX"><i class="ti ti-x"></i></button>'+
    '<h3><i class="ti ti-qrcode"></i> Scan untuk gabung</h3>'+
    '<div class="qr-box">'+(svg||'<p class="muted">QR tidak bisa dibuat (library gagal dimuat). Pakai kode atau link di bawah.</p>')+'</div>'+
    '<div class="qr-code">'+esc(room.code)+'</div>'+
    '<p class="muted qr-link">'+esc(link)+'</p>'+
    '<div class="modal-actions"><button class="btn-accent" id="qrCopy">Salin link</button></div></div>');
  $('qrX').onclick=closeOverlay;
  $('qrCopy').onclick=()=>copy(link,'Link room disalin!');
}

function renderGameGrid(){
  const box=$('gameGrid'); box.innerHTML='';
  const list=gamesFor(currentFocus);
  if(list.length===0){
    box.innerHTML='<p class="muted empty-games">Belum ada permainan di fokus ini. '+
      'Guru dapat menampilkannya lagi lewat <b>Panel Admin → Pengaturan Game</b>.</p>';
    return;
  }
  list.forEach(g=>{
    const gp=gameProgress(g,playerProgress);
    const d=document.createElement('div'); d.className='game-card';
    d.innerHTML='<div class="gc-icon" style="background:'+g.bg+';color:'+g.color+'"><i class="ti '+g.icon+'"></i></div>'+
      '<div class="gc-name">'+esc(g.name)+'</div><div class="gc-sub">'+esc(g.count)+'</div>'+
      '<div class="gc-progress"><div class="mini-bar"><span style="width:'+gp.master+'%"></span></div>'+
        '<div class="gc-meta"><span>'+esc(gp.label)+'</span><b>'+gp.master+'%</b></div>'+
        '<div class="gc-foot">'+(gp.plays?gp.plays+'x main - '+gp.acc+'% benar':'Mulai untuk membuka progres')+'</div></div>';
    d.onclick=()=>openGame(g);
    box.appendChild(d);
  });
}

function renderLB(){
  const lb=getLB(), host=hostName(), me=isHost();
  const rows=Object.keys(lb).map(n=>Object.assign({name:n},lb[n]))
    .sort((a,b)=>(b.stars||0)-(a.stars||0) || (a.joinedAt||0)-(b.joinedAt||0));
  const box=$('lbList');
  if(rows.length===0){ box.innerHTML='<p class="muted" style="padding:10px 0">Belum ada anggota di room ini. Bagikan kode atau QR! ⭐</p>'; return; }
  box.innerHTML=rows.map((r,i)=>{
    const played=r.game!=null;
    const medal = !played ? '👤' : i===0?'🥇':i===1?'🥈':i===2?'🥉':'⭐';
    const sub = played
      ? [r.game,(r.level?levelName(r.level):null),(r.correct!=null?r.correct+'/'+r.total+' benar':null),(r.delta!=null?'+'+r.delta+' bintang':null)].filter(Boolean).join(' · ')
      : 'Baru bergabung, belum main';
    return '<div class="lb-row'+(played?'':' pending')+'"><div class="lb-l"><span class="lb-medal">'+medal+'</span>'+
      '<div><div class="lb-name">'+esc(r.name)+
        (r.name===host?' <span class="hostbadge">host</span>':'')+
        (r.name===player?' <span class="you">kamu</span>':'')+'</div>'+
      '<div class="lb-sub">'+esc(sub)+'</div></div></div>'+
      '<div class="lb-r"><div class="lb-stars"><i class="ti ti-star"></i> '+(r.stars||0)+'</div>'+
      (me?'<button class="iconbtn danger" data-rm="'+attr(r.name)+'" title="Keluarkan dari room"><i class="ti ti-trash"></i></button>':'')+
      '</div></div>';
  }).join('');
  if(me) box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
    const n=b.getAttribute('data-rm');
    if(confirm('Keluarkan "'+n+'" dari papan bintang room ini?')){
      leaveMember(n);
      if(n===player) joinMember(player);   // jangan sampai host menghapus dirinya dari room
      renderMain();
    }
  });
}

/* ---------- Header & footer ---------- */
function topbar(){
  const c=getConfig();
  return '<div class="topbar"><div class="tb-brand"><div class="tb-logo">'+brandLogo()+'</div>'+
    '<div><div class="tb-title">'+esc(c.appName)+'</div><div class="tb-sub">'+esc(c.tagline)+'</div></div></div>'+
    '<div class="tb-stars"><i class="ti ti-star"></i> <span>'+playerStars+'</span></div></div>';
}
/** Footer: nama lembaga, kontak opsional, dan pintu ke panel admin terpisah. */
function footerGear(){
  const c=getConfig();
  return '<div class="footgear">'+
    (c.orgName?'<div class="foot-org">'+esc(c.orgName)+'</div>':'')+
    (c.footerText?'<div class="foot-text">'+esc(c.footerText)+'</div>':'')+
    '<div class="foot-links">'+
      (c.contactWa
        ? '<a class="linkbtn" href="https://wa.me/'+encodeURIComponent(c.contactWa)+'" target="_blank" rel="noopener">'+
          '<i class="ti ti-brand-whatsapp"></i> '+esc(c.contactLabel||'Hubungi Kami')+'</a>'
        : '')+
      '<a class="linkbtn" href="admin.html"><i class="ti ti-settings"></i> Panel Admin</a>'+
    '</div>'+
  '</div>';
}
function wireGear(){ /* panel admin kini halaman tersendiri (admin.html) */ }

/* ============================================================
   PERMAINAN
   ============================================================ */
function openGame(g){
  lastGameName=g.name;
  resetSpeedy();                 // bonus kecepatan dihitung per ronde
  // Halaman permainan: tanpa stepbar & footer, biar anak fokus ke soal.
  app().innerHTML = topbar()+'<div class="wrap"><div id="game" class="gamewrap"></div></div>';
  g.start();
}
window._home = ()=>{ stopTimer(); loadPlayerStars(); loadProgress(); menuStep='main'; renderMain(); };
function backBtn(){ return '<button class="pill" onclick="window._home()" style="margin-bottom:12px"><i class="ti ti-arrow-left"></i> Kembali ke menu</button>'; }
function L(){ return LEVELS[effLevel()]||LEVELS.Beginner; }
function ratingOf(ratio){ return ratio>=0.85?3: ratio>=0.5?2: ratio>0?1:0; }

function endRound(gameName, correct, total, extra){
  extra=extra||{};
  stopTimer();
  const lv=L();
  const spd    = extra.speedy!=null ? extra.speedy : speedy;   // permainan puzzle tak memakai timer → 0
  const rating = extra.rating!=null ? extra.rating : ratingOf(total?correct/total:0);
  const delta  = extra.delta!=null  ? extra.delta  : (correct>0 ? correct+lv.bonus+spd : 0);
  playerStars+=delta; savePlayerStars();
  recordLB(gameName, correct, total, delta, rating);
  recordProgress(gameName, correct, total, delta, rating, spd);
  showResult({gameName, correct, total, delta, rating, speedy:spd});
}

function showResult(r){
  const c=getConfig();
  const topStars = '⭐'.repeat(Math.max(0,r.rating)) + '☆'.repeat(Math.max(0,3-r.rating));
  overlay(
    '<div class="modal result-modal">'+
      '<button class="modal-x" id="rxClose"><i class="ti ti-x"></i></button>'+
      '<div class="res-stars">'+topStars+'</div>'+
      '<h3 class="res-name">'+esc(player)+'</h3>'+
      '<div class="res-grid">'+
        resCell('Total bintang', playerStars)+
        resCell(roomMode()?'Room':'Mode', roomMode()?room.code:'Main sendiri')+
        resCell('Game terakhir', r.gameName)+
        resCell('Fokus', FOCUS[currentFocus].name)+
        resCell('Level', levelName(effLevel()))+
        resCell('Benar', r.correct+' / '+r.total)+
        (r.speedy>0 ? resCell('Bonus kecepatan ⚡', '+'+r.speedy+' bintang') : '')+
        resCell('Perolehan ronde', '+'+r.delta+' bintang')+
        resCell('Rating', r.rating+' / 3')+
      '</div>'+
      '<div class="modal-actions"><button class="btn-accent" id="rClose">Tutup</button></div>'+
    '</div>'
  );
  const done=()=>{ closeOverlay(); window._home(); };
  $('rxClose').onclick=done; $('rClose').onclick=done;
}
function resCell(k,v){ return '<div class="res-cell"><div class="rc-k">'+esc(k)+'</div><div class="rc-v">'+esc(v)+'</div></div>'; }

/* ============================================================
   TIMER PER SOAL — "bonus kecepatan"
   Bar menyusut selama tiap soal. Menjawab BENAR saat sisa waktu masih
   ≥ separuh memberi +1 bintang bonus. Waktu habis TIDAK menyalahkan
   jawaban — anak tetap boleh menjawab, hanya bonusnya hilang.
   Dipakai di permainan bersoal (kuis, benar/salah, sortir, profesi).
   ============================================================ */
let qStartAt=0, speedy=0, lowTimer=null;

function timerSec(){ return clampTimer(getConfig().timerSeconds); }
function timerMs(){ return timerSec()*1000; }
function timerOn(){ return !!getConfig().timerEnabled; }
function resetSpeedy(){ speedy=0; }

/** Markup bar waktu. Kosong bila timer dimatikan admin. */
function timerBar(){
  if(!timerOn()) return '';
  return '<div class="tbar-wrap">'+
    '<div class="tbar-label"><i class="ti ti-bolt"></i> Bonus kecepatan</div>'+
    '<div class="tbar"><div class="tbar-fill" id="tfill"></div></div>'+
  '</div>';
}
/** Mulai/ulang hitungan untuk satu soal. Panggil setelah soal digambar. */
function startTimer(){
  clearTimeout(lowTimer);
  if(!timerOn()) return;
  qStartAt=Date.now();
  const el=$('tfill'); if(!el) return;
  el.classList.remove('low');
  el.style.transition='none';
  el.style.width='100%';
  void el.offsetWidth;                       // paksa reflow agar animasi mulai dari 100%
  el.style.transition='width '+timerMs()+'ms linear';
  el.style.width='0%';
  lowTimer=setTimeout(()=>{ const e=$('tfill'); if(e) e.classList.add('low'); }, timerMs()/2);
}
/** Bekukan bar di posisi saat ini (soal sudah dijawab). */
function stopTimer(){
  clearTimeout(lowTimer);
  const el=$('tfill'); if(!el) return;
  const w=getComputedStyle(el).width;
  el.style.transition='none';
  el.style.width=w;
}
/** Dijawab saat sisa waktu masih separuh atau lebih? */
function answeredFast(){
  return timerOn() && (Date.now()-qStartAt) <= timerMs()/2;
}
/** Catat jawaban: hentikan bar, beri bonus bila benar & cepat. */
function scoreTimed(ok){
  stopTimer();
  if(ok && answeredFast()){ speedy++; return true; }
  return false;
}

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fb(ok,text){return '<div class="fbbox '+(ok?'ok':'warn')+'"><i class="ti '+(ok?"ti-check":"ti-bulb")+'"></i> <b>'+(ok?PRAISE[Math.floor(Math.random()*PRAISE.length)]:OOPS[Math.floor(Math.random()*OOPS.length)])+'</b> '+text+'</div>'}
function progBar(idx,tot,color){ return '<div class="pbar"><div style="width:'+Math.round(idx/tot*100)+'%;background:'+color+'"></div></div>'; }
function head(icon,label,right){ return '<div class="grow"><span class="g-topic"><i class="ti '+icon+'"></i> '+label+'</span><span class="g-count">'+right+'</span></div>'; }

function startQuiz(cat){
 const g=QUIZ[cat],src=pool(g.q),qs=shuffle(src).slice(0,Math.min(L().quiz,src.length));let idx=0,score=0;
 function render(){
  const q=qs[idx],opts=shuffle(q[1].map((t,i)=>[t,i]));
  $("game").innerHTML=backBtn()+head(g.icon,cat,'Soal '+(idx+1)+' / '+qs.length+' · Benar: '+score)+progBar(idx,qs.length,g.color)+timerBar()+
   '<div class="qcard"><p class="qtext">'+q[0]+'</p><div id="opts" class="opts"></div><div id="fbx"></div></div>';
  const box=$("opts");
  opts.forEach(o=>{const b=document.createElement("button");b.className='opt';b.textContent=o[0];
   b.onclick=()=>{const ok=o[1]===q[2];const fast=scoreTimed(ok);if(ok)score++;
    Array.from(box.children).forEach(x=>x.disabled=true);
    b.classList.add(ok?'ok':'bad');
    $("fbx").innerHTML=fb(ok,q[3])+bolt(fast)+'<button class="btn-accent nextbtn" onclick="window._next()">'+(idx<qs.length-1?'Soal berikutnya <i class="ti ti-arrow-right"></i>':'Lihat hasil <i class="ti ti-trophy"></i>')+'</button>';
   };box.appendChild(b)});
  startTimer();
 }
 window._next=()=>{idx++;if(idx<qs.length)render();else endRound(cat,score,qs.length)};
 render();
}
/** Lencana kecil "+1 bintang" saat menjawab benar dengan cepat. */
function bolt(fast){ return fast ? '<div class="speedy"><i class="ti ti-bolt"></i> Cepat! +1 bintang bonus</div>' : ''; }
function startTF(){
 const src=pool(TF),qs=shuffle(src).slice(0,Math.min(L().tf,src.length));let idx=0,score=0,streak=0,best=0;
 function render(){const q=qs[idx];
  $("game").innerHTML=backBtn()+head('ti-bolt','Kilat benar atau salah',(idx+1)+' / '+qs.length+' · Beruntun: '+streak)+timerBar()+
   '<div class="qcard center"><p class="qtext big">'+q[0]+'</p>'+
   '<div class="tfrow"><button class="opt" onclick="window._tf(true)"><i class="ti ti-check" style="color:var(--text-success)"></i> Benar</button>'+
   '<button class="opt" onclick="window._tf(false)"><i class="ti ti-x" style="color:var(--text-danger)"></i> Salah</button></div>'+
   '<div id="fbx" style="margin-top:14px"></div></div>';
  startTimer();
 }
 window._tf=a=>{const q=qs[idx],ok=a===q[1];const fast=scoreTimed(ok);
  if(ok){score++;streak++;best=Math.max(best,streak)}else streak=0;
  $("fbx").innerHTML=fb(ok,q[2])+bolt(fast);
  setTimeout(()=>{idx++;if(idx<qs.length)render();else endRound('Kilat benar/salah',score,qs.length)},1200)};
 render();
}
function startSort(){
 const src=pool(SORT),items=shuffle(src).slice(0,Math.min(L().sort,src.length));let idx=0,score=0;
 function render(){const it=items[idx];
  $("game").innerHTML=backBtn()+head('ti-arrows-split-2','Kebutuhan atau keinginan?','Kartu '+(idx+1)+' / '+items.length+' · Benar: '+score)+timerBar()+
   '<div class="qcard center"><p class="muted">Menurutmu, ini termasuk apa?</p><p class="qtext big">'+it[0]+'</p>'+
   '<div class="tfrow"><button class="opt" onclick="window._ans(\'K\')"><i class="ti ti-heart" style="color:var(--text-danger)"></i> Kebutuhan</button>'+
   '<button class="opt" onclick="window._ans(\'I\')"><i class="ti ti-gift" style="color:#993556"></i> Keinginan</button></div>'+
   '<div id="fbx" style="margin-top:14px"></div></div>';
  startTimer();
 }
 window._ans=a=>{const it=items[idx],ok=a===it[1];const fast=scoreTimed(ok);if(ok)score++;
  $("fbx").innerHTML=fb(ok,'"'+it[0]+'" termasuk '+(it[1]==="K"?"kebutuhan — tanpa ini hidup kita terganggu.":"keinginan — boleh dibeli jika kebutuhan sudah terpenuhi."))+bolt(fast);
  setTimeout(()=>{idx++;if(idx<items.length)render();else endRound('Sortir kebutuhan',score,items.length)},1300)};
 render();
}
function startProf(){
 const src=pool(PROF),qs=shuffle(src).slice(0,Math.min(L().prof,src.length));let idx=0,score=0;
 function render(){const q=qs[idx],opts=shuffle(q[1].map((t,i)=>[t,i]));
  $("game").innerHTML=backBtn()+head('ti-briefcase','Tebak profesi',(idx+1)+' / '+qs.length+' · Benar: '+score)+timerBar()+
   '<div class="qcard"><div class="clue"><i class="ti ti-message-circle" style="color:var(--text-accent)"></i> "'+q[0]+'" Siapakah aku?</div>'+
   '<div id="opts" class="opts grid2"></div><div id="fbx"></div></div>';
  const box=$("opts");
  opts.forEach(o=>{const b=document.createElement("button");b.className='opt';b.textContent=o[0];
   b.onclick=()=>{const ok=o[1]===q[2];const fast=scoreTimed(ok);if(ok)score++;Array.from(box.children).forEach(x=>x.disabled=true);
    b.classList.add(ok?'ok':'bad');$("fbx").innerHTML=fb(ok,"Jawabannya: "+q[1][q[2]]+".")+bolt(fast);
    setTimeout(()=>{idx++;if(idx<qs.length)render();else endRound('Tebak profesi',score,qs.length)},1300)};
   box.appendChild(b)});
  startTimer();
 }
 render();
}
function startFlag(){
 const src=pool(FLAGS),qs=shuffle(src).slice(0,Math.min(L().flag,src.length));let idx=0,score=0;
 function render(){const q=qs[idx];
  const opts=shuffle([q[1]].concat(shuffle(src.filter(x=>x[1]!==q[1])).slice(0,3).map(x=>x[1])));
  $("game").innerHTML=backBtn()+head('ti-flag','Tebak bendera negara',(idx+1)+' / '+qs.length+' Â· Benar: '+score)+progBar(idx,qs.length,'#185FA5')+timerBar()+
   '<div class="qcard center flag-card"><div class="flag-big">'+esc(q[0])+'</div>'+
   '<p class="muted flag-hint"><i class="ti ti-bulb"></i> '+esc(q[2])+'</p>'+
   '<p class="qtext">Bendera negara apakah ini?</p><div id="opts" class="opts grid2"></div><div id="fbx"></div></div>';
  const box=$("opts");
  opts.forEach(name=>{const b=document.createElement("button");b.className='opt';b.textContent=name;
   b.onclick=()=>{const ok=name===q[1];const fast=scoreTimed(ok);if(ok)score++;
    Array.from(box.children).forEach(x=>x.disabled=true);
    b.classList.add(ok?'ok':'bad');
    $("fbx").innerHTML=fb(ok,"Jawabannya: "+q[1]+". "+q[2])+bolt(fast);
    setTimeout(()=>{idx++;if(idx<qs.length)render();else endRound('Tebak bendera negara',score,qs.length)},1500)};
   box.appendChild(b)});
  startTimer();
 }
 render();
}
function startOrder(){
 /* Ronde hanya memakai sebagian peristiwa dari pool level ini, jadi nomor
    urutnya dihitung ulang 1..N setelah diurutkan secara kronologis. */
 const src=pool(ORDER.items);
 const picked=shuffle(src).slice(0,Math.min(L().order,src.length))
   .sort((a,b)=>a[1]-b[1]).map((p,i)=>[p[0], i+1]);
 let bank=shuffle(picked),placed=[],wrong=0;const TOT=picked.length;
 function render(){
  $("game").innerHTML=backBtn()+head('ti-timeline','Urutkan sejarah','Tersusun: '+placed.length+' / '+TOT)+
   '<p class="muted" style="margin:0 0 8px">'+esc(ORDER.title)+'. Ketuk yang terjadi paling awal dulu!</p>'+
   '<div id="line" class="ordline"></div><div id="pool" class="opts"></div><div id="fbx"></div>';
  const line=$("line");placed.forEach((p,i)=>{const d=document.createElement("div");d.className='ord-done';d.innerHTML='<b>'+(i+1)+'.</b> '+esc(p[0]);line.appendChild(d)});
  const pl=$("pool");
  bank.forEach(p=>{const b=document.createElement("button");b.className='opt';b.textContent=p[0];
   b.onclick=()=>{if(p[1]===placed.length+1){placed.push(p);bank=bank.filter(x=>x!==p);
     if(bank.length===0){const correct=Math.max(0,TOT-wrong);endRound('Urutkan sejarah',correct,TOT);}else render();
    }else{wrong++;b.classList.add('bad');$("fbx").innerHTML=fb(false,"Ada peristiwa lain yang terjadi lebih dulu. Coba lagi!");setTimeout(()=>b.classList.remove('bad'),600)}
   };pl.appendChild(b)});
 }
 render();
}
function startMatch(M){
 const src=pool(M.pairs);
 const pairs=shuffle(src).slice(0,Math.min(L().match,src.length));
 let cards=[];pairs.forEach((p,i)=>{cards.push({t:p[0],id:i});cards.push({t:p[1],id:i})});
 cards=shuffle(cards);let sel=null,found=0,tries=0,lock=false;
 $("game").innerHTML=backBtn()+head('ti-puzzle',M.name+' — ketuk dua kartu berpasangan','<span id="mstat">Pasangan: 0 / '+pairs.length+'</span>')+
  '<div id="board" class="board"></div>';
 const board=$("board");
 cards.forEach(c=>{const b=document.createElement("button");b.className='opt match';b.textContent=c.t;b.dataset.id=c.id;
  b.onclick=()=>{if(lock||b.disabled||b===sel)return;b.classList.add('sel');
   if(!sel){sel=b;return}tries++;
   if(sel.dataset.id===b.dataset.id){[sel,b].forEach(x=>{x.disabled=true;x.classList.remove('sel');x.classList.add('ok')});
    found++;$("mstat").textContent="Pasangan: "+found+" / "+pairs.length;sel=null;
    if(found===pairs.length){const rating=tries<=pairs.length+2?3:tries<=pairs.length+4?2:1;
      setTimeout(()=>endRound(M.name,found,pairs.length,{rating,delta:found+L().bonus}),650);}
   }else{lock=true;const a=sel;sel=null;setTimeout(()=>{[a,b].forEach(x=>x.classList.remove('sel'));lock=false},700)}
  };board.appendChild(b)});
}

/* ---------- overlay / util (esc, attr, toast ada di brand.js) ---------- */
function overlay(html){ let o=$('overlay'); if(!o){o=document.createElement('div');o.id='overlay';o.className='overlay';document.body.appendChild(o);} o.innerHTML=html; o.classList.add('show'); }
function closeOverlay(){ const o=$('overlay'); if(o){o.classList.remove('show');o.innerHTML='';} }
async function copy(text,okmsg){ try{ await navigator.clipboard.writeText(text); toast(okmsg);}catch(e){ prompt('Salin manual:',text);} }
function msg(id,type,text){ const el=$(id); if(!el) return; el.innerHTML='<div class="msg '+(type==='ok'?'ok':'err')+'">'+esc(text)+'</div>'; if(type==='ok') setTimeout(()=>{if(el)el.innerHTML='';},2500); }

boot();
