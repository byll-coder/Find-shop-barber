/* ================================================================
   SALON FINDER V2 — auth.js
   Session JWT, navbar dynamique, protection de page
   ================================================================ */

/* ── Lecture du JWT (sans vérifier la signature : c'est le rôle du serveur) ── */
function _lireJWT(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

const Session = {
  K_TOKEN: "sf_v2_token",
  K_USER: "sf_v2_user",

  setToken: (t) => localStorage.setItem(Session.K_TOKEN, t),
  getToken: () => localStorage.getItem(Session.K_TOKEN),
  setUser: (u) => localStorage.setItem(Session.K_USER, JSON.stringify(u)),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(Session.K_USER));
    } catch {
      return null;
    }
  },
  clear: () => {
    localStorage.removeItem(Session.K_TOKEN);
    localStorage.removeItem(Session.K_USER);
  },
  // Connecté = un token présent ET non expiré (un token expiré est nettoyé tout de suite)
  estConnecte: () => {
    const t = localStorage.getItem(Session.K_TOKEN);
    if (!t) return false;
    const p = _lireJWT(t);
    if (p?.exp && p.exp * 1000 < Date.now()) {
      Session.clear();
      return false;
    }
    return true;
  },
};

/* ── Résolution dynamique des chemins ────────────────────────── */
// Détecte si on est servi depuis /frontend/ (Live Server à la racine) ou depuis la racine du site (Render)
function _chemin(rel) {
  const base = window.location.pathname.includes("/frontend/")
    ? "/frontend"
    : "";
  return base + rel;
}

/* ── Redirection après connexion ─────────────────────────────── */
function redigerApresConnexion(user) {
  if (!user || typeof user.role === "undefined") {
    Session.clear();
    return;
  }
  // Page demandée avant la connexion (ex : « Réserver » depuis la fiche d'un salon)
  const retour = sessionStorage.getItem("sf_retour");
  sessionStorage.removeItem("sf_retour");
  if (
    retour &&
    /^(reservation|salon-detail|messages)\.html(\?[\w=&%.-]*)?$/.test(retour)
  ) {
    const reservePro =
      user.role === "salon" && retour.startsWith("reservation");
    if (!reservePro) {
      window.location.href = _chemin("/pages/" + retour);
      return;
    }
  }
  window.location.href =
    user.role === "salon"
      ? _chemin("/pages/dashboard-salon.html")
      : _chemin("/pages/dashboard-client.html");
}

/* ── Protection de page ──────────────────────────────────────── */
function protegerPage(roleRequis = null) {
  if (!Session.estConnecte()) {
    window.location.replace(_chemin("/pages/auth.html"));
    return false;
  }
  if (roleRequis) {
    const user = Session.getUser();
    if (user?.role !== roleRequis) {
      window.location.replace(_chemin("/index.html"));
      return false;
    }
  }
  return true;
}

/* ── Navbar dynamique ────────────────────────────────────────── */
function majNavbar() {
  const user = Session.estConnecte() ? Session.getUser() : null;
  const authEl = document.getElementById("navbar-auth");
  const mobileAuth = document.getElementById("mobile-auth");

  if (!authEl) return;

  if (user) {
    const dash =
      user.role === "salon"
        ? _chemin("/pages/dashboard-salon.html")
        : _chemin("/pages/dashboard-client.html");
    const nom = String(user.nom || "Mon espace");
    const initiale = nom[0].toUpperCase();
    const prenom = nom.split(" ")[0].replace(/[<>&"']/g, "");

    authEl.innerHTML = `
      <a href="${_chemin("/pages/messages.html")}" class="btn btn-icon btn-glass" aria-label="Messages">
        <i class="ti ti-message-circle" aria-hidden="true"></i>
        <span class="notif-badge" id="notif-msg" style="display:none;position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:var(--gold);border-radius:50%;font-size:.6rem;font-weight:700;color:#1a1008;align-items:center;justify-content:center;"></span>
      </a>
      <a href="${dash}" class="btn btn-glass btn-sm" style="gap:8px;">
        <span style="width:22px;height:22px;border-radius:50%;background:var(--gold-pale);border:1px solid rgba(201,169,110,.3);display:flex;align-items:center;justify-content:center;font-family:var(--font-ui);font-size:.68rem;font-weight:700;color:var(--gold);flex-shrink:0;">${initiale.replace(/[<>&"']/g, "")}</span>
        ${prenom}
      </a>`;

    if (mobileAuth)
      mobileAuth.innerHTML = `
        <a href="${dash}" class="btn btn-glass btn-full"><i class="ti ti-layout-dashboard"></i> Mon espace</a>
        <button class="btn btn-outline btn-full" onclick="deconnexion()"><i class="ti ti-logout"></i> Déconnexion</button>`;

    chargerNonLus();
  } else {
    authEl.innerHTML = `
      <a href="${_chemin("/pages/auth.html")}?mode=connexion" class="btn btn-outline btn-sm">Connexion</a>
      <a href="${_chemin("/pages/auth.html")}?mode=inscription" class="btn btn-gold btn-sm">S'inscrire</a>`;

    if (mobileAuth)
      mobileAuth.innerHTML = `
        <a href="${_chemin("/pages/auth.html")}?mode=connexion" class="btn btn-outline btn-full"><i class="ti ti-login"></i> Connexion</a>
        <a href="${_chemin("/pages/auth.html")}?mode=inscription" class="btn btn-gold btn-full"><i class="ti ti-user-plus"></i> Créer un compte</a>`;
  }
}

/* ── Badge messages non lus ──────────────────────────────────── */
async function chargerNonLus() {
  try {
    // apiFetch renvoie déjà json.data : ça peut être un nombre ou {total}
    const r = await Messages.nonLus();
    const total =
      typeof r === "number"
        ? r
        : Number(r?.total ?? r?.count ?? r?.nonLus ?? 0) || 0;
    const badge = document.getElementById("notif-msg");
    if (badge) {
      badge.textContent = total > 9 ? "9+" : total;
      badge.style.display = total > 0 ? "flex" : "none";
    }
  } catch {}
}

/* ── Déconnexion ─────────────────────────────────────────────── */
function deconnexion() {
  Session.clear();
  window.location.href = _chemin("/index.html");
}

/* ── Toast global (le message est affiché comme du texte, jamais comme du HTML) ── */
function afficherToast(msg, type = "info") {
  const el = document.getElementById("global-toast");
  if (!el) return;
  const ico = {
    success: "ti-circle-check",
    error: "ti-alert-circle",
    info: "ti-info-circle",
    warning: "ti-alert-triangle",
  };
  el.innerHTML = `<i class="ti ${ico[type] || ico.info}" aria-hidden="true"></i> <span></span>`;
  el.querySelector("span").textContent = msg ?? "";
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

document.addEventListener("DOMContentLoaded", majNavbar);
