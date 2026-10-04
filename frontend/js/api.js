/* ================================================================
   SALON FINDER V2 — api.js
   Client API — toutes les requêtes vers le backend
   ================================================================ */

const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "/api";

/* ── Fetch de base ───────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const token = typeof Session !== "undefined" ? Session.getToken() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(API_URL + path, { ...options, headers });
  const json = await res.json();
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        json.message || "Trop de tentatives. Réessayez dans 15 minutes.",
      );
    }
    throw new Error(`${res.status}: ${json.message || "Erreur serveur"}`);
  }
  return json.data !== undefined ? json.data : json;
}
const nettoyer = (p = {}) =>
  Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== "" && v !== false && v != null),
  );

/* ── Salons ──────────────────────────────────────────────────── */
const Salons = {
  liste: (p = {}) => apiFetch(`/salons?${new URLSearchParams(p)}`),
  detail: (id) => apiFetch(`/salons/${id}`),
  communes: () => apiFetch("/salons/communes"),
  monSalon: () => apiFetch("/salons/moi"),
  creer: (d) =>
    apiFetch("/salons", { method: "POST", body: JSON.stringify(d) }),
  modifier: (id, d) =>
    apiFetch(`/salons/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  ajouterAvis: (id, d) =>
    apiFetch(`/salons/${id}/avis`, { method: "POST", body: JSON.stringify(d) }),
};

/* ── Auth ────────────────────────────────────────────────────── */
const Auth = {
  inscription: (d) =>
    apiFetch("/auth/inscription", { method: "POST", body: JSON.stringify(d) }),
  connexion: (d) =>
    apiFetch("/auth/connexion", { method: "POST", body: JSON.stringify(d) }),
  moi: () => apiFetch("/auth/moi"),
  modifierProfil: (d) =>
    apiFetch("/auth/profil", { method: "PUT", body: JSON.stringify(d) }),
  changerPass: (d) =>
    apiFetch("/auth/password", { method: "PUT", body: JSON.stringify(d) }),
};

/* ── Services ────────────────────────────────────────────────── */
const Services = {
  liste: (salonId) => apiFetch(`/services?salonId=${salonId}`), // ✅ salonId
  creer: (d) =>
    apiFetch("/services", { method: "POST", body: JSON.stringify(d) }),
  supprimer: (id) => apiFetch(`/services/${id}`, { method: "DELETE" }),
};

/* ── Messages ────────────────────────────────────────────────── */
const Messages = {
  conversations: () => apiFetch("/messages/conversations"),
  getMessages: (id) => apiFetch(`/messages/${id}`),
  envoyer: (id, d) =>
    apiFetch(`/messages/${id}`, { method: "POST", body: JSON.stringify(d) }),
  nonLus: () => apiFetch("/messages/non-lus"),
};

/* ── Favoris ─────────────────────────────────────────────────── */
const Favoris = {
  liste: () => apiFetch("/favoris"),
  toggle: (id) => apiFetch(`/favoris/${id}`, { method: "POST" }),
  check: (id) => apiFetch(`/favoris/${id}/check`),
};

/* ── Rendez-vous ─────────────────────────────────────────────── */
const RendezVous = {
  liste: () => apiFetch("/rendez-vous"),
  creer: (d) =>
    apiFetch("/rendez-vous", { method: "POST", body: JSON.stringify(d) }),
  modifier: (id, d) =>
    apiFetch(`/rendez-vous/${id}`, { method: "PUT", body: JSON.stringify(d) }),
};

/* ── Avis ── */
const Avis = {
  liste: (salonId) => apiFetch(`/avis?salonId=${encodeURIComponent(salonId)}`),
  creer: (d) => apiFetch("/avis", { method: "POST", body: JSON.stringify(d) }),
};

/* ── Media ───────────────────────────────────────────────────── */
const Media = {
  upload: (file, type) => {
    const token = typeof Session !== "undefined" ? Session.getToken() : null;
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    return fetch(`${API_URL}/media/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message || "Erreur upload");
        return json.data !== undefined ? json.data : json;
      });
  },
  supprimer: (publicId) =>
    apiFetch(`/media/${encodeURIComponent(publicId)}`, { method: "DELETE" }),
};
