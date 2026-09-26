/* =============================================================
   admin.js — Panel Admin (admin.html)
   Login → dashboard bertab: Branding, Game, Papan Bintang, Keamanan, Backup.

   Model kerja: semua perubahan masuk ke `draft` dan dipratinjau langsung di
   halaman ini. Baru menetap ke localStorage saat ditekan "Simpan perubahan";
   meninggalkan halaman tanpa menyimpan otomatis membatalkan pratinjau.
   ============================================================= */

const SESSION_KEY='ips_admin_ok';       // sesi login, hilang saat tab ditutup
let draft = getConfig();
let GAMES = [];

/* ---------- Boot (dipanggil di akhir berkas: openDashboard() memakai
   const seperti TEXT_FIELDS yang belum terinisialisasi bila dijalankan di sini) ---------- */
function boot(){
  applyBranding();
  watchTheme();
  GAMES = gameCatalog();
  paintHeader();

  $('btnLogin').onclick = login;
  $('loginPass').addEventListener('keydown', e=>{ if(e.key==='Enter') login(); });
  $('btnLogout').onclick = ()=>{ sessionStorage.removeItem(SESSION_KEY); location.reload(); };

  if(sessionStorage.getItem(SESSION_KEY)==='1') openDashboard();
  else $('loginPass').focus();
}

function paintHeader(){
  const c=getConfig();
  $('brandLogo').innerHTML = brandLogo(c);
  $('brandTagline').textContent = c.appName;
  $('footerText').textContent = c.footerText || 'Panel Admin';
}

function login(){
  const v=$('loginPass').value;
  if(!checkPass(v)){ amsg('loginMsg','err','Password salah. Coba lagi.'); $('loginPass').select(); return; }
  sessionStorage.setItem(SESSION_KEY,'1');
  openDashboard();
}

function openDashboard(){
  $('screenLogin').style.display='none';
  $('screenAdmin').style.display='';
  $('btnLogout').style.display='';
  draft = getConfig();
  fillBranding();
  fillGame();
  fillBoard();
  fillBackup();
  wireTabs();
  wireSave();
}

/* ---------- Tab ---------- */
function wireTabs(){
  $('adminTabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
    $('adminTabs').querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('on', x===b));
    const t=b.getAttribute('data-tab');
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('on', p.id==='tab-'+t));
    if(t==='backup') fillBackup();
    if(t==='board')  fillBoard();
  });
}

/* ---------- Tab: Branding ---------- */
const TEXT_FIELDS=['appName','tagline','orgName','logoUrl','logoEmoji','welcomeTitle','welcomeText','footerText','contactWa','contactLabel'];

const isDataUrl = v => /^data:/i.test(String(v||''));

/** Logo hasil unggahan berupa data URL yang sangat panjang — jangan tumpahkan
    ke kotak teks. Tampilkan kotak kosong + keterangan di placeholder. */
function paintLogoUrl(){
  const el=$('f-logoUrl'), up=isDataUrl(draft.logoUrl);
  el.value = up ? '' : (draft.logoUrl||'');
  el.placeholder = up ? 'Logo terunggah aktif — isi berkas/URL untuk menggantinya'
                      : 'logo.png  atau  https://contoh.com/logo.png';
}

function fillBranding(){
  TEXT_FIELDS.forEach(k=>{
    const el=$('f-'+k); if(!el) return;
    if(k!=='logoUrl') el.value = draft[k]==null?'':draft[k];
    el.oninput = ()=>{
      draft[k]=el.value;
      if(k==='logoUrl'||k==='logoEmoji'){ $('logoPrev').innerHTML=brandLogo(draft); preview(); }
    };
  });
  paintLogoUrl();

  $('f-colorPrimary').value = draft.colorPrimary;
  $('f-colorAccent').value  = draft.colorAccent;
  ['colorPrimary','colorAccent'].forEach(k=>{
    $('f-'+k).oninput = ()=>{ draft[k]=$('f-'+k).value; markPresets(); preview(); };
  });

  $('presetRow').innerHTML = THEME_PRESETS.map((p,i)=>
    '<button class="preset" data-preset="'+i+'">'+
      '<span class="pr-dots"><i style="background:'+p.colorPrimary+'"></i><i style="background:'+p.colorAccent+'"></i></span>'+
      esc(p.name)+'</button>').join('');
  $('presetRow').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
    const p=THEME_PRESETS[+b.getAttribute('data-preset')];
    draft.colorPrimary=p.colorPrimary; draft.colorAccent=p.colorAccent;
    $('f-colorPrimary').value=p.colorPrimary;
    $('f-colorAccent').value =p.colorAccent;
    markPresets(); preview();
  });

  $('segTheme').querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
    draft.themeMode=b.getAttribute('data-mode');
    markTheme(); preview();
  });

  $('f-logoFile').onchange = e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>500*1024){ amsg('adminMsg','err','Logo maksimal 500 KB.'); e.target.value=''; return; }
    const r=new FileReader();
    r.onload=()=>{
      draft.logoUrl=r.result;
      paintLogoUrl();
      $('logoPrev').innerHTML=brandLogo(draft);
      preview();
      amsg('adminMsg','ok','Logo dimuat — tekan Simpan untuk menerapkan.');
    };
    r.readAsDataURL(f);
    e.target.value='';
  };

  $('btnLogoClear').onclick = ()=>{
    draft.logoUrl='';
    paintLogoUrl();
    $('logoPrev').innerHTML=brandLogo(draft);
    preview();
  };

  $('logoPrev').innerHTML = brandLogo(draft);
  markPresets(); markTheme();
}
function markPresets(){
  $('presetRow').querySelectorAll('[data-preset]').forEach(b=>{
    const p=THEME_PRESETS[+b.getAttribute('data-preset')];
    b.classList.toggle('on', p.colorPrimary===draft.colorPrimary && p.colorAccent===draft.colorAccent);
  });
}
function markTheme(){
  $('segTheme').querySelectorAll('[data-mode]').forEach(b=>
    b.classList.toggle('on', b.getAttribute('data-mode')===draft.themeMode));
}
function preview(){ applyBranding(draft); paintHeaderDraft(); }
function paintHeaderDraft(){
  $('brandLogo').innerHTML = brandLogo(draft);
  $('brandTagline').textContent = draft.appName || '';
  $('footerText').textContent = draft.footerText || 'Panel Admin';
}

/* ---------- Tab: Pengaturan Game ---------- */
function fillGame(){
  $('gTotal').textContent = GAMES.length;
  $('gameToggles').innerHTML = GAMES.map(g=>{
    const on=(draft.hiddenGames||[]).indexOf(g.id)===-1;
    return '<label class="gtoggle'+(on?' on':'')+'">'+
      '<input type="checkbox" data-game="'+attr(g.id)+'"'+(on?' checked':'')+'>'+
      '<span class="gt-icon" style="background:'+g.bg+';color:'+g.color+'"><i class="ti '+g.icon+'"></i></span>'+
      '<span class="gt-txt"><span class="gt-name">'+esc(g.name)+'</span>'+
        '<span class="gt-sub">'+esc(FOCUS[g.focus].name)+' · '+esc(g.count)+'</span></span>'+
      '<span class="gt-state">'+(on?'Aktif':'Mati')+'</span></label>';
  }).join('');
  $('gameToggles').querySelectorAll('[data-game]').forEach(cb=>cb.onchange=()=>{
    const id=cb.getAttribute('data-game');
    const set=new Set(draft.hiddenGames||[]);
    cb.checked ? set.delete(id) : set.add(id);
    draft.hiddenGames=Array.from(set);
    const row=cb.closest('.gtoggle');
    row.classList.toggle('on', cb.checked);
    row.querySelector('.gt-state').textContent = cb.checked?'Aktif':'Mati';
    countGames();
  });
  countGames();

  const keys=Object.keys(DEFAULTS.levelNames);
  $('levelRows').innerHTML = keys.map(k=>{
    const on=(draft.enabledLevels||[]).indexOf(k)>-1;
    return '<div class="lv-row">'+
      '<label class="check-row"><input type="checkbox" data-level="'+attr(k)+'"'+(on?' checked':'')+'> '+esc(k)+'</label>'+
      '<input type="text" maxlength="30" data-lvname="'+attr(k)+'" value="'+attr((draft.levelNames||{})[k]||k)+'" placeholder="Nama tampilan level">'+
    '</div>';
  }).join('');
  $('levelRows').querySelectorAll('[data-level]').forEach(cb=>cb.onchange=()=>{
    const k=cb.getAttribute('data-level');
    const set=new Set(draft.enabledLevels||[]);
    cb.checked ? set.add(k) : set.delete(k);
    draft.enabledLevels = keys.filter(x=>set.has(x));      // pertahankan urutan asli
  });
  $('levelRows').querySelectorAll('[data-lvname]').forEach(el=>el.oninput=()=>{
    const k=el.getAttribute('data-lvname');
    draft.levelNames = Object.assign({}, draft.levelNames);
    draft.levelNames[k] = el.value;
  });

  $('f-showRoom').checked        = !!draft.showRoom;
  $('f-showLeaderboard').checked = !!draft.showLeaderboard;
  $('f-showRoom').onchange        = ()=>{ draft.showRoom        = $('f-showRoom').checked; };
  $('f-showLeaderboard').onchange = ()=>{ draft.showLeaderboard = $('f-showLeaderboard').checked; };

  $('f-timerEnabled').checked = !!draft.timerEnabled;
  $('f-timerSeconds').value   = draft.timerSeconds;
  $('f-timerEnabled').onchange = ()=>{
    draft.timerEnabled = $('f-timerEnabled').checked;
    $('f-timerSeconds').disabled = !draft.timerEnabled;
  };
  $('f-timerSeconds').disabled = !draft.timerEnabled;
  // Dijepit saat Simpan, bukan saat mengetik — agar angka bisa dihapus dulu.
  $('f-timerSeconds').oninput = ()=>{ draft.timerSeconds = $('f-timerSeconds').value; };
}
function countGames(){
  $('gCount').textContent = GAMES.length - (draft.hiddenGames||[]).length;
}

/* ---------- Tab: Papan Bintang ---------- */
function fillBoard(){
  const rooms=Object.keys(localStorage).filter(k=>k.indexOf('ips_lb_')===0);
  const box=$('boardList');
  if(rooms.length===0){
    box.innerHTML='<p class="muted">Belum ada room di perangkat ini.</p>';
    return;
  }
  box.innerHTML = rooms.map(key=>{
    const code=key.slice(7);
    const lb=Store.get(key,{})||{};
    const meta=Store.get(K.meta(code),{})||{};
    const rows=Object.keys(lb).map(n=>Object.assign({name:n},lb[n]))
      .sort((a,b)=>(b.stars||0)-(a.stars||0));
    return '<div class="board-room">'+
      '<div class="br-head"><b>'+esc(meta.name||('Room '+code))+'</b> '+
        '<span class="muted">· kode '+esc(code)+' · '+rows.length+' anggota'+
        (meta.host?' · host: '+esc(meta.host):'')+'</span></div>'+
      (rows.length? rows.map(r=>
        '<div class="lb-row"><div class="lb-l"><span class="lb-medal">⭐</span>'+
          '<div><div class="lb-name">'+esc(r.name)+'</div>'+
          '<div class="lb-sub">'+esc(r.game? (r.game+' · '+(r.level||'')) : 'Belum main')+'</div></div></div>'+
          '<div class="lb-r"><div class="lb-stars"><i class="ti ti-star"></i> '+(r.stars||0)+'</div></div></div>').join('')
        : '<p class="muted">Belum ada anggota.</p>')+
    '</div>';
  }).join('');
}
$('btnResetBoard').onclick = ()=>{
  if(!confirm('Hapus semua skor di semua room pada perangkat ini? Anggota ikut terhapus.')) return;
  Object.keys(localStorage)
    .filter(k=>k.indexOf('ips_lb_')===0 || k.indexOf('ips_stars_')===0)
    .forEach(k=>localStorage.removeItem(k));
  fillBoard();
  toast('Semua skor dihapus.');
};

/* ---------- Tab: Keamanan ---------- */
$('btnChangePass').onclick = ()=>{
  const a=$('f-newPass').value, b=$('f-newPass2').value;
  if(a.length<6){ amsg('adminMsg','err','Password minimal 6 karakter.'); return; }
  if(a!==b){ amsg('adminMsg','err','Ulangan password tidak sama.'); return; }
  setPass(a);
  $('f-newPass').value=''; $('f-newPass2').value='';
  amsg('adminMsg','ok','Password admin diganti.');
  toast('Password diganti.');
};
$('btnResetPass').onclick = ()=>{
  if(!confirm('Kembalikan password ke nilai adminPassword di config.js?')) return;
  Store.del(K.pass);
  amsg('adminMsg','ok','Password kembali ke default config.js.');
};

/* ---------- Tab: Backup ---------- */
function exportObj(){
  const c=getConfig(), out={};
  CONFIG_KEYS.forEach(k=>{ out[k]=c[k]; });
  return out;
}
function fillBackup(){ $('f-export').value = JSON.stringify(exportObj(), null, 2); }

$('btnCopy').onclick = async ()=>{
  try{ await navigator.clipboard.writeText($('f-export').value); toast('JSON disalin.'); }
  catch(e){ $('f-export').select(); amsg('adminMsg','err','Tidak bisa menyalin otomatis — salin manual dari kotak.'); }
};
$('btnDownload').onclick = ()=>{
  const c=exportObj();
  const name='branding-'+(String(c.appName||'aplikasi').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'aplikasi')+'.json';
  const url=URL.createObjectURL(new Blob([JSON.stringify(c,null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Berkas diunduh.');
};
$('btnImportFile').onchange = e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ $('f-export').value=r.result; applyJson(); };
  r.readAsText(f);
  e.target.value='';
};
$('btnApplyJson').onclick = applyJson;
function applyJson(){
  let parsed;
  try{ parsed=JSON.parse($('f-export').value); }
  catch(e){ amsg('adminMsg','err','JSON tidak sah — periksa tanda kurung dan koma.'); return; }
  const clean=sanitizeConfig(parsed);
  if(Object.keys(clean).length===0){ amsg('adminMsg','err','Tidak ada pengaturan yang dikenali di JSON ini.'); return; }
  draft=Object.assign({}, DEFAULTS, clean);
  preview();
  fillBranding(); fillGame();
  amsg('adminMsg','ok','JSON dimuat sebagai pratinjau — tekan Simpan di tab Branding/Game untuk menerapkan.');
}
$('btnResetConfig').onclick = ()=>{
  if(!confirm('Buang semua pengaturan panel dan kembali ke nilai default di config.js?')) return;
  resetConfig();
  draft=getConfig();
  fillBranding(); fillGame(); fillBackup(); paintHeader();
  toast('Kembali ke default config.js.');
};

/* ---------- Simpan ---------- */
function wireSave(){
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=save);
}
function save(){
  if((draft.hiddenGames||[]).length===GAMES.length){
    amsg('adminMsg','err','Sisakan minimal satu permainan aktif.'); return;
  }
  if((draft.enabledLevels||[]).length===0){
    amsg('adminMsg','err','Sisakan minimal satu level aktif.'); return;
  }
  const c=Object.assign({}, draft);
  c.appName      = (c.appName||'').trim()      || DEFAULTS.appName;
  c.welcomeTitle = (c.welcomeTitle||'').trim() || DEFAULTS.welcomeTitle;
  c.welcomeText  = (c.welcomeText||'').trim()  || DEFAULTS.welcomeText;
  c.logoEmoji    = (c.logoEmoji||'').trim()    || DEFAULTS.logoEmoji;
  c.contactWa    = (c.contactWa||'').replace(/[^0-9]/g,'');
  c.timerEnabled = !!c.timerEnabled;
  c.timerSeconds = clampTimer(c.timerSeconds);
  if(!isHex(c.colorPrimary)) c.colorPrimary = DEFAULTS.colorPrimary;
  if(!isHex(c.colorAccent))  c.colorAccent  = DEFAULTS.colorAccent;
  if(c.logoUrl && !isImgSrc(c.logoUrl)) c.logoUrl='';   // "(gambar terunggah)" & URL aneh dibuang
  Object.keys(c.levelNames||{}).forEach(k=>{
    if(!String(c.levelNames[k]||'').trim()) c.levelNames[k]=k;
  });

  saveConfig(c);
  draft=getConfig();
  fillBranding(); fillBackup(); paintHeader();
  amsg('adminMsg','ok','Pengaturan disimpan dan langsung berlaku di game.');
  toast('Tersimpan.');
}

/* ---------- Pesan ---------- */
function amsg(id,type,text){
  const el=$(id); if(!el) return;
  el.innerHTML='<div class="msg '+(type==='ok'?'ok':'err')+'">'+esc(text)+'</div>';
  el.scrollIntoView({block:'nearest'});
  if(type==='ok') setTimeout(()=>{ if(el) el.innerHTML=''; },3000);
}

boot();
