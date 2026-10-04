/* ================================================================
   SALON FINDER V2 — socket.js
   Client Socket.IO encapsulé — connexion, messages, typing
   ================================================================ */

const Socket = {
  io: null,
  _convActuelle: null,
  _typingTimer: null,
  _handlers: {},

  /* ── Connexion ───────────────────────────────────────────── */
  connect() {
    const token = typeof Session !== "undefined" ? Session.getToken() : null;
    if (!token) return null;
    if (this.io?.connected) return this.io;

    const url =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "/";

    this.io = window.io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.io.on("connect", () => {
      console.log("🔌 Socket connecté");
      this.io.emit("user:join");
    });

    this.io.on("disconnect", (reason) => {
      console.warn("🔌 Socket déconnecté :", reason);
    });

    this.io.on("connect_error", (err) => {
      console.error("🔌 Erreur connexion :", err.message);
    });

    /* Retransmettre les événements aux handlers enregistrés */
    [
      "message:receive",
      "typing:start",
      "typing:stop",
      "user:online",
      "user:offline",
      "notification:message",
      "notification:new",
    ].forEach((event) => {
      this.io.on(event, (data) => {
        (this._handlers[event] || []).forEach((fn) => fn(data));
      });
    });

    return this.io;
  },

  /* ── Déconnexion ─────────────────────────────────────────── */
  disconnect() {
    if (this.io) {
      this.io.disconnect();
      this.io = null;
      this._handlers = {};
    }
  },

  /* ── S'abonner à un événement ────────────────────────────── */
  on(event, callback) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(callback);
  },

  /* ── Se désabonner ───────────────────────────────────────── */
  off(event, callback) {
    if (!this._handlers[event]) return;
    this._handlers[event] = this._handlers[event].filter(
      (fn) => fn !== callback,
    );
  },

  /* ── Rejoindre une conversation ──────────────────────────── */
  joinConv(convId) {
    if (this._convActuelle && this._convActuelle !== convId) {
      this.io?.emit("conversation:leave", this._convActuelle);
    }
    this._convActuelle = convId;
    this.io?.emit("conversation:join", convId);
  },

  /* ── Quitter la conversation courante ────────────────────── */
  leaveConv() {
    if (this._convActuelle) {
      this.io?.emit("conversation:leave", this._convActuelle);
      this._convActuelle = null;
    }
  },

  /* ── Envoyer un message ──────────────────────────────────── */
  sendMessage(convId, contenu) {
    if (!this.io?.connected) return false;
    this.io.emit("message:send", { conversationId: convId, contenu });
    this.stopTyping(convId); // stopper l'indicateur dès l'envoi
    return true;
  },

  /* ── Indicateur de frappe ────────────────────────────────── */
  startTyping(convId) {
    if (!this.io?.connected) return;
    this.io.emit("typing:start", { conversationId: convId });
    clearTimeout(this._typingTimer);
    this._typingTimer = setTimeout(() => this.stopTyping(convId), 2500);
  },

  stopTyping(convId) {
    clearTimeout(this._typingTimer);
    this.io?.emit("typing:stop", { conversationId: convId });
  },

  /* ── État de connexion ───────────────────────────────────── */
  get connected() {
    return !!this.io?.connected;
  },
};
