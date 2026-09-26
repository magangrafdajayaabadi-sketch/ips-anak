/* =============================================================
   pwa.js — Pemasangan aplikasi, pembaruan, dan status koneksi
   Dimuat SETELAH brand.js, jadi boleh memakai getConfig()/brandLogoSrc().

   Aturan tampil popup pasang:
     - Tidak pernah muncul kalau aplikasi sudah terpasang (standalone).
     - Muncul setelah anak sempat melihat halaman (PROMPT_DELAY),
       dan hanya saat tab benar-benar terlihat.
     - "Nanti" menunda 3 hari, tombol tutup menunda 7 hari; makin sering
       ditutup, makin lama jedanya (sampai 60 hari) agar tidak mengganggu.
   ============================================================= */
(function () {
  var DISMISS_KEY = "ips_pwa_install_dismissed_until";
  var COUNT_KEY = "ips_pwa_install_dismiss_count";
  var PROMPT_DELAY = 2500;
  var SNOOZE_DAYS = [3, 7, 21, 60];   // jeda ke-1, ke-2, ke-3, seterusnya
  var FALLBACK_LOGO = "icons/icon-192.png";

  var promptEvent = null;
  var updateWorker = null;
  var refreshing = false;
  var lastFocus = null;

  /* ---------- Bantuan kecil ---------- */
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.navigator.standalone === true;
  }

  function isIos() {
    var ua = window.navigator.userAgent || "";
    // iPadOS 13+ menyamar sebagai Mac, jadi cek juga layar sentuh.
    return /iphone|ipad|ipod/i.test(ua) ||
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  }

  /** Nama & logo diambil dari Panel Admin bila brand.js tersedia. */
  function cfg() {
    try { return typeof getConfig === "function" ? getConfig() : {}; }
    catch (e) { return {}; }
  }

  function appName() {
    var c = cfg();
    return (c.appName || "IPS Ceria").slice(0, 40);
  }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  /** Ubin logo yang terisi penuh; jatuh ke ikon aplikasi bila gambar gagal dimuat. */
  function logoHtml() {
    var src = "";
    try { if (typeof brandLogoSrc === "function") src = brandLogoSrc(); } catch (e) { src = ""; }
    if (!src) src = FALLBACK_LOGO;
    return '<span class="pwa-logo"><img src="' + escHtml(src) + '" alt="" decoding="async" ' +
      'onerror="this.onerror=null;this.src=\'' + FALLBACK_LOGO + '\'"></span>';
  }

  /* ---------- Jadwal tampil / tunda ---------- */
  function dismissCount() {
    return Number(localStorage.getItem(COUNT_KEY) || 0);
  }

  function canShowInstallPopup() {
    if (isStandalone()) return false;
    var until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return !(until > Date.now());
  }

  /** Tunda popup. `hard` dipakai saat anak menutup lewat tombol X. */
  function snoozeInstallPopup(hard) {
    var n = dismissCount() + 1;
    var days = SNOOZE_DAYS[Math.min(n, SNOOZE_DAYS.length) - 1];
    if (hard) days = Math.max(days, SNOOZE_DAYS[1]);
    localStorage.setItem(COUNT_KEY, String(n));
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
    closeInstallPopup();
  }

  function clearSnooze() {
    localStorage.removeItem(DISMISS_KEY);
    localStorage.removeItem(COUNT_KEY);
  }

  /* ---------- Popup pasang ---------- */
  function closeInstallPopup() {
    var popup = document.querySelector(".pwa-pop");
    if (!popup || popup.classList.contains("closing")) return;
    popup.classList.add("closing");
    document.removeEventListener("keydown", onPopupKey);
    setTimeout(function () {
      popup.remove();
      if (lastFocus && document.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} }
      lastFocus = null;
    }, 180);
  }

  function onPopupKey(event) {
    if (event.key === "Escape") snoozeInstallPopup(false);
  }

  /** `mode`: "prompt" (Android/desktop) atau "ios" (panduan manual Safari). */
  function showInstallPopup(mode) {
    if (document.querySelector(".pwa-pop")) return;
    if (!canShowInstallPopup()) return;
    if (mode === "prompt" && !promptEvent) return;

    var name = escHtml(appName());
    var popup = document.createElement("div");
    popup.className = "pwa-pop";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-modal", "false");
    popup.setAttribute("aria-label", "Pasang " + appName());
    popup.innerHTML =
      '<div class="pwa-pop-card">' +
        '<div class="pwa-pop-body">' +
          '<button type="button" class="pwa-pop-x" aria-label="Tutup"><i class="ti ti-x" aria-hidden="true"></i></button>' +
          '<div class="pwa-pop-head">' +
            logoHtml() +
            '<div>' +
              '<span class="pwa-eyebrow"><i class="ti ti-sparkles" aria-hidden="true"></i> Pasang aplikasi</span>' +
              '<h3>' + name + '</h3>' +
              '<p>Buka langsung dari layar utama, tanpa lewat browser.</p>' +
            '</div>' +
          '</div>' +
          '<div class="pwa-benefits">' +
            '<span><i class="ti ti-wifi-off" aria-hidden="true"></i> Bisa offline</span>' +
            '<span><i class="ti ti-bolt" aria-hidden="true"></i> Buka lebih cepat</span>' +
            '<span><i class="ti ti-star" aria-hidden="true"></i> Bintang tersimpan</span>' +
          '</div>' +
          (mode === "ios" ? iosStepsHtml() : installActionHtml()) +
        '</div>' +
      '</div>';
    document.body.appendChild(popup);

    lastFocus = document.activeElement;
    popup.querySelector(".pwa-pop-x").addEventListener("click", function () { snoozeInstallPopup(true); });
    var later = popup.querySelector("[data-pwa-later]");
    if (later) later.addEventListener("click", function () { snoozeInstallPopup(false); });
    var install = popup.querySelector("[data-pwa-install]");
    if (install) install.addEventListener("click", runInstallPrompt);
    document.addEventListener("keydown", onPopupKey);

    var focusTarget = install || later;
    if (focusTarget) setTimeout(function () { try { focusTarget.focus(); } catch (e) {} }, 200);
  }

  function installActionHtml() {
    return '<div class="pwa-pop-actions">' +
      '<button type="button" class="btn-accent" data-pwa-install><i class="ti ti-download" aria-hidden="true"></i> Pasang sekarang</button>' +
      '<button type="button" class="pill" data-pwa-later>Nanti saja</button>' +
    '</div>';
  }

  function iosStepsHtml() {
    return '<ol class="pwa-steps">' +
      '<li><i class="ti ti-share-2" aria-hidden="true"></i> Ketuk tombol <b>Bagikan</b> di Safari</li>' +
      '<li><i class="ti ti-square-plus" aria-hidden="true"></i> Pilih <b>Add to Home Screen</b></li>' +
      '<li><i class="ti ti-check" aria-hidden="true"></i> Ketuk <b>Add</b> — selesai!</li>' +
    '</ol>' +
    '<div class="pwa-pop-actions"><button type="button" class="pill" data-pwa-later>Mengerti</button></div>';
  }

  function runInstallPrompt() {
    if (!promptEvent) { snoozeInstallPopup(false); return; }
    closeInstallPopup();
    var event = promptEvent;
    promptEvent = null;
    event.prompt();
    event.userChoice.then(function (choice) {
      if (choice && choice.outcome === "dismissed") snoozeInstallPopup(false);
    }).catch(function () {});
  }

  /** Tampilkan saat tab benar-benar dilihat, supaya popup tidak terlewat. */
  function scheduleInstallPopup(mode) {
    function run() {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVisible);
      showInstallPopup(mode);
    }
    function onVisible() { setTimeout(run, 600); }
    document.addEventListener("visibilitychange", onVisible);
    setTimeout(run, PROMPT_DELAY);
  }

  /* ---------- Pemberitahuan versi baru ---------- */
  function showUpdateNotice() {
    if (document.querySelector(".pwa-update-pop")) return;
    var notice = document.createElement("div");
    notice.className = "pwa-update-pop";
    notice.setAttribute("role", "dialog");
    notice.setAttribute("aria-label", "Versi baru " + appName());
    notice.innerHTML =
      '<div class="pwa-update-card">' +
        logoHtml() +
        '<span><b>Versi baru tersedia</b><small>Perbarui ' + escHtml(appName()) + ' agar materi dan fitur terbaru aktif.</small></span>' +
        '<button type="button" class="btn-accent sm"><i class="ti ti-refresh" aria-hidden="true"></i> Perbarui</button>' +
      '</div>';
    notice.querySelector("button").addEventListener("click", function () {
      if (updateWorker) updateWorker.postMessage({ type: "SKIP_WAITING" });
    });
    document.body.appendChild(notice);
  }

  /* ---------- Status koneksi ---------- */
  function showConnectionNotice(online) {
    var old = document.querySelector(".pwa-status");
    if (old) old.remove();
    var notice = document.createElement("div");
    notice.className = "pwa-status " + (online ? "online" : "offline");
    notice.setAttribute("role", "status");
    notice.textContent = online
      ? "Koneksi kembali aktif."
      : "Sedang offline. " + appName() + " tetap bisa dipakai dari cache.";
    document.body.appendChild(notice);
    setTimeout(function () {
      notice.classList.add("hide");
      setTimeout(function () { notice.remove(); }, 300);
    }, online ? 1800 : 2600);
  }

  /* ---------- Service worker ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (registration) {
        if (registration.waiting && navigator.serviceWorker.controller) {
          updateWorker = registration.waiting;
          showUpdateNotice();
        }

        registration.addEventListener("updatefound", function () {
          var worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", function () {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              updateWorker = worker;
              showUpdateNotice();
            }
          });
        });

        setInterval(function () { registration.update(); }, 60 * 60 * 1000);
      }).catch(function () {});

      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  }

  // Safari tak pernah mengirim beforeinstallprompt — pakai panduan manual.
  window.addEventListener("load", function () {
    if (isIos() && !isStandalone()) scheduleInstallPopup("ios");
  });

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    promptEvent = event;
    scheduleInstallPopup("prompt");
  });

  window.addEventListener("appinstalled", function () {
    promptEvent = null;
    closeInstallPopup();
    clearSnooze();
    if (typeof toast === "function") toast("Aplikasi berhasil dipasang! 🎉");
  });

  window.addEventListener("offline", function () { showConnectionNotice(false); });
  window.addEventListener("online", function () { showConnectionNotice(true); });

  /* Dipakai bila nanti ingin menambah tombol "Pasang aplikasi" di dalam UI:
       if (IPSInstall.available()) … IPSInstall.show();  */
  window.IPSInstall = {
    available: function () { return !isStandalone() && (!!promptEvent || isIos()); },
    installed: isStandalone,
    show: function () {
      clearSnooze();                                   // permintaan langsung → abaikan jeda
      showInstallPopup(promptEvent ? "prompt" : "ios");
    },
    dismiss: closeInstallPopup
  };
})();
