import { api, formatApiError, getPrincipal } from "./api.js";
import { initLayout, requireAuth } from "./nav.js";
import { renderList, showToast } from "./ui.js";

initLayout({ active: "./profile.html" });
if (!requireAuth()) {
  /* redirecting */
} else {
  const box = document.getElementById("profileBox");

  async function loadProfile() {
    const principal = getPrincipal();
    const me =
      principal === "admin"
        ? await api("/auth/admin-me/", { auth: true })
        : await api("/auth/me/", { auth: true });

    const items = [
      {
        title: principal === "admin" ? "Администратор" : "Пользователь",
        lines:
          principal === "admin"
            ? [
                `ID: ${me.id}`,
                `Email: ${me.email}`,
                `Username: ${me.username}`,
                `Клуб: #${me.club_id ?? "—"}`,
              ]
            : [
                `ID: ${me.id}`,
                `Email: ${me.email}`,
                `Username: ${me.username}`,
                `Телефон: ${me.phone || "—"}`,
              ],
        actions:
          principal === "admin"
            ? [{ href: "./admin.html", label: "Открыть панель клуба" }]
            : [
                { href: "./clubs.html", label: "Клубы" },
                { href: "./bookings.html", label: "Мои брони" },
              ],
      },
    ];

    renderList(box, items, (it) => {
      const lines = it.lines.map((l) => `<div>${l}</div>`).join("");
      const actions = (it.actions || [])
        .map((a) => `<a class="btn secondary small" href="${a.href}">${a.label}</a>`)
        .join("");
      return `
        <h3>${it.title}</h3>
        <div class="muted" style="display:grid;gap:4px;margin:10px 0 12px">${lines}</div>
        <div class="row">${actions}</div>
      `;
    });
  }

  loadProfile().catch((err) => showToast(formatApiError(err), "error"));
}

