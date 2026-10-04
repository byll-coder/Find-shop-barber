/* ================================================================
   SALON FINDER V2 — theme.js
   Gestion dark / light / system — s'exécute avant le DOM
   ================================================================ */

const Theme = {
  KEY: "sf_v2_theme",
  ICONS: { dark: "ti-moon", light: "ti-sun", system: "ti-device-desktop" },
  LABELS: {
    dark: "Thème sombre",
    light: "Thème clair",
    system: "Thème système",
  },

  get() {
    return localStorage.getItem(this.KEY) || "dark";
  },

  set(theme) {
    localStorage.setItem(this.KEY, theme);
    this.apply(theme);
  },

  apply(theme) {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.setAttribute("data-theme", resolved);
    this._updateBtn(theme);
  },

  _updateBtn(theme) {
    const btn = document.getElementById("theme-btn");
    if (!btn) return;
    btn.innerHTML = `<i class="ti ${this.ICONS[theme] || this.ICONS.dark}" aria-hidden="true"></i>`;
    btn.title = this.LABELS[theme] || "";
  },

  cycle() {
    const order = ["dark", "light", "system"];
    const next = order[(order.indexOf(this.get()) + 1) % order.length];
    this.set(next);
  },

  init() {
    /* Applique immédiatement (avant DOMContentLoaded) pour éviter le flash */
    this.apply(this.get());

    document.addEventListener("DOMContentLoaded", () => {
      this._updateBtn(this.get());
      const btn = document.getElementById("theme-btn");
      if (btn) btn.addEventListener("click", () => Theme.cycle());
    });

    /* Réagit aux changements de préférence système */
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (this.get() === "system") this.apply("system");
      });
  },
};

Theme.init();
