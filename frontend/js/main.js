/* ================================================================
   SALON FINDER V2 — main.js
   Scroll reveal · Hamburger · Helpers · Renderers · Splash
   ================================================================ */

/* ── Scroll Reveal ───────────────────────────────────────────── */
const rvObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("visible");
        rvObs.unobserve(en.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
);

/* ── Splash Screen ───────────────────────────────────────────── */
function initSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    splash.style.display = "none";
    document.querySelectorAll(".fade-up").forEach((el) => {
      el.style.animationPlayState = "running";
    });
    return;
  }

  /* On bloque les animations hero tant que le splash est visible
     → elles démarrent au moment exact où le fondu commence,
       donnant l'effet "le film commence" */
  document.querySelectorAll(".fade-up").forEach((el) => {
    el.style.animationPlayState = "paused";
  });

  const HOLD = 2400; /* logo visible bien plus longtemps */
  const FADE = 900; /* fondu de sortie lent et cinématique */

  setTimeout(() => {
    /* 1. Fondu de sortie du splash (+ scale-up léger via CSS .hide) */
    splash.classList.add("hide");

    /* 2. Les éléments hero s'animent en même temps que le splash disparaît
          → effet de "révélation" comme une caméra qui s'allume */
    document.querySelectorAll(".fade-up").forEach((el) => {
      el.style.animationPlayState = "running";
    });

    setTimeout(() => {
      splash.style.display = "none";
      document.body.removeAttribute("aria-hidden");
    }, FADE);
  }, HOLD);
}

/* ── Navbar — ombre au scroll ────────────────────────────────── */
function initNavbarScroll() {
  const navbar = document.getElementById
    ? document.querySelector(".navbar")
    : null;
  if (!navbar) return;
  const obs = new IntersectionObserver(
    ([entry]) => navbar.classList.toggle("scrolled", !entry.isIntersecting),
    { threshold: 0 },
  );
  /* Sentinelle invisible tout en haut de page */
  const sentinel = document.createElement("div");
  sentinel.style.cssText =
    "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;";
  document.body.prepend(sentinel);
  obs.observe(sentinel);
}

/* ── DOMContentLoaded ────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initSplash();
  initNavbarScroll();

  /* Scroll reveal initial */
  document.querySelectorAll(".rv").forEach((el) => rvObs.observe(el));

  /* Hamburger */
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      hamburger.classList.toggle("active", isOpen);
      hamburger.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    document.addEventListener("click", (e) => {
      if (
        mobileMenu.classList.contains("open") &&
        !hamburger.contains(e.target) &&
        !mobileMenu.contains(e.target)
      ) {
        mobileMenu.classList.remove("open");
        hamburger.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileMenu.classList.contains("open")) {
        mobileMenu.classList.remove("open");
        hamburger.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        hamburger.focus();
      }
    });
  }
});

/* ── Helpers ─────────────────────────────────────────────────── */
function showLoading() {
  document.getElementById("loading-overlay")?.classList.add("show");
}
function hideLoading() {
  document.getElementById("loading-overlay")?.classList.remove("show");
}

function renderStars(note, max = 5) {
  let html = "";
  for (let i = 1; i <= max; i++) {
    if (i <= Math.floor(note)) html += '<i class="ti ti-star-filled"></i>';
    else if (i - note < 1) html += '<i class="ti ti-star-half-filled"></i>';
    else html += '<i class="ti ti-star"></i>';
  }
  return `<span class="salon-stars">${html}</span>`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/* ── Salon Card ──────────────────────────────────────────────── */
function renderSalonCard(s) {
  const services = (s.services || []).slice(0, 3);
  const badge = s.isPremium
    ? '<span class="salon-card-badge badge-premium"><i class="ti ti-crown"></i> Premium</span>'
    : s.isVerifie
      ? '<span class="salon-card-badge badge-verifie"><i class="ti ti-shield-check"></i> Vérifié</span>'
      : "";
  return `
    <article class="salon-card rv" role="listitem" tabindex="0"
      onclick="window.location.href='/pages/salon-detail.html?id=${s._id}'"
      onkeydown="if(event.key==='Enter') window.location.href='/pages/salon-detail.html?id=${s._id}'"
      aria-label="${s.nom}, ${s.commune}">
      <div class="salon-card-cover">
        ${
          s.photoCouverture
            ? `<img src="${s.photoCouverture}" alt="${s.nom}" loading="lazy">`
            : `<div class="salon-card-cover-ph"><i class="ti ti-scissors"></i></div>`
        }
        ${badge}
      </div>
      <div class="salon-card-body">
        <h3 class="salon-card-name">${s.nom}</h3>
        <p class="salon-card-location"><i class="ti ti-map-pin"></i> ${s.commune}${s.quartier ? " · " + s.quartier : ""}</p>
        ${services.length ? `<div class="salon-card-services">${services.map((sv) => `<span class="service-chip">${sv.nom || sv}</span>`).join("")}</div>` : ""}
        <div class="salon-card-footer">
          <div class="salon-rating">
            ${renderStars(s.noteGlobale || 0)}
            <span class="salon-rating-num">${s.noteGlobale > 0 ? s.noteGlobale.toFixed(1) : "—"}</span>
            <span class="salon-rating-count">(${s.nbAvis || 0})</span>
          </div>
          <span class="btn btn-glass btn-sm">Voir <i class="ti ti-arrow-right"></i></span>
        </div>
      </div>
    </article>`;
}

/* ── Pagination ──────────────────────────────────────────────── */
function renderPagination(containerId, page, totalPages, onChangeFn) {
  const el = document.getElementById(containerId);
  if (!el || totalPages <= 1) {
    if (el) el.innerHTML = "";
    return;
  }

  const btn = (i, label, disabled = false, active = false) =>
    `<button class="page-btn ${active ? "active" : ""}" onclick="${onChangeFn}(${i})" ${disabled ? "disabled" : ""} aria-label="${label}" ${active ? 'aria-current="page"' : ""}>${label}</button>`;

  let html = `<button class="page-btn" onclick="${onChangeFn}(${page - 1})" ${page === 1 ? "disabled" : ""} aria-label="Précédent"><i class="ti ti-chevron-left"></i></button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      html += btn(i, i, false, i === page);
    } else if (Math.abs(i - page) === 2) {
      html += `<span class="page-btn" aria-hidden="true">…</span>`;
    }
  }

  html += `<button class="page-btn" onclick="${onChangeFn}(${page + 1})" ${page === totalPages ? "disabled" : ""} aria-label="Suivant"><i class="ti ti-chevron-right"></i></button>`;
  el.innerHTML = html;
}

/* ── Count-up ────────────────────────────────────────────────── */
function countUp(el, target, suffix = "") {
  if (!el) return;
  const dur = 1600,
    start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now() - start) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
    el.textContent = Math.floor(e * target) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  tick();
}
