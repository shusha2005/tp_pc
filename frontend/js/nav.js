import { clearTokens, getPrincipal, isAuthenticated } from "./api.js";

const NAV_LINKS = {
  public: [
    { href: "./index.html", label: "Главная" },
    { href: "./login.html", label: "Вход" },
  ],
  user: [
    { href: "./clubs.html", label: "Клубы" },
    { href: "./bookings.html", label: "Мои брони" },
  ],
  admin: [
    { href: "./admin.html", label: "Панель клуба" },
  ],
};

function buildNavLinks() {
  const links = [...NAV_LINKS.public];
  if (!isAuthenticated()) return links;

  const principal = getPrincipal();
  if (principal === "admin") {
    return [...links.filter((l) => l.href !== "./login.html"), ...NAV_LINKS.admin];
  }
  return [...links.filter((l) => l.href !== "./login.html"), ...NAV_LINKS.user];
}

export function initLayout({ active = "" } = {}) {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;

  const links = buildNavLinks();
  const navHtml = links
    .map(
      (l) =>
        `<a href="${l.href}" class="nav-link${active === l.href ? " active" : ""}">${l.label}</a>`
    )
    .join("");

  const authBlock = isAuthenticated()
    ? `<button type="button" class="btn secondary" id="btnLogout">Выйти</button>`
    : `<a class="btn" href="./login.html">Войти</a>`;

  header.innerHTML = `
    <div class="site-header-inner">
      <a class="logo" href="./index.html">PC Club Booking</a>
      <nav class="site-nav">${navHtml}</nav>
      <div class="header-actions">${authBlock}</div>
    </div>
  `;

  document.getElementById("btnLogout")?.addEventListener("click", () => {
    clearTokens();
    window.location.href = "./index.html";
  });
}

export function requireAuth({ adminOnly = false, userOnly = false } = {}) {
  if (!isAuthenticated()) {
    window.location.href = "./login.html";
    return false;
  }
  const principal = getPrincipal();
  if (adminOnly && principal !== "admin") {
    window.location.href = "./clubs.html";
    return false;
  }
  if (userOnly && principal === "admin") {
    window.location.href = "./admin.html";
    return false;
  }
  return true;
}

export function redirectIfAuthed() {
  if (!isAuthenticated()) return;
  window.location.href = getPrincipal() === "admin" ? "./admin.html" : "./clubs.html";
}
