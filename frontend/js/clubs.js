import { ensureAuth, fetchAllPages, formatApiError } from "./api.js";
import { initLayout, requireAuth } from "./nav.js";
import { formatPrice, showToast } from "./ui.js";

initLayout({ active: "./clubs.html" });
if (!requireAuth({ userOnly: true })) {
  /* redirecting */
} else {
const clubsGrid = document.getElementById("clubsGrid");
const clubsFilterForm = document.getElementById("clubsFilterForm");
const btnReset = document.getElementById("btnReset");

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23121b2b' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%239aa8c0' text-anchor='middle' dy='.3em' font-family='sans-serif'%3EНет фото%3C/text%3E%3C/svg%3E";

function clubSvgCover(title) {
  const safe = String(title || "PC Club").slice(0, 28);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#121b2b" offset="0"/>
        <stop stop-color="#0f1624" offset="1"/>
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#g)"/>
    <circle cx="650" cy="110" r="140" fill="rgba(110,168,254,0.18)"/>
    <circle cx="720" cy="260" r="180" fill="rgba(81,207,102,0.08)"/>
    <text x="50%" y="52%" fill="#e8eef9" text-anchor="middle" font-size="44" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${safe}</text>
    <text x="50%" y="64%" fill="#9aa8c0" text-anchor="middle" font-size="18" font-family="Segoe UI, Arial, sans-serif">Фото недоступно офлайн</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function clubCoverSrc(club) {
  const src = String(club?.photo || "").trim();
  if (!src) return clubSvgCover(club?.name);
  // Если внешняя сеть недоступна (часто в учебных аудиториях), показываем SVG.
  if (src.startsWith("http://") || src.startsWith("https://")) return clubSvgCover(club?.name);
  return src;
}

function renderClubs(clubs) {
  if (!clubs.length) {
    clubsGrid.innerHTML = '<div class="empty-state">Клубы не найдены. Попробуйте изменить фильтры.</div>';
    return;
  }

  clubsGrid.innerHTML = clubs
    .map(
      (club) => `
    <article class="club-card">
      <img src="${clubCoverSrc(club) || PLACEHOLDER_IMG}" alt="${club.name}" loading="lazy" />
      <div class="club-card-body">
        <h3>${club.name}</h3>
        <p class="muted">${club.address || "—"}</p>
        ${club.description ? `<p class="muted" style="font-size:0.9rem">${club.description}</p>` : ""}
        <p class="price">от ${formatPrice(club.price)}/час</p>
        <a class="btn" href="./club.html?id=${club.id}">Выбрать ПК</a>
      </div>
    </article>
  `
    )
    .join("");
}

async function loadClubs() {
  ensureAuth();
  const fd = new FormData(clubsFilterForm);
  const clubs = await fetchAllPages(
    "/clubs/",
    {
      q: fd.get("q"),
      price_gte: fd.get("price_gte"),
      price_lte: fd.get("price_lte"),
      has_photo: fd.get("has_photo"),
      order: "name",
    },
    { auth: true }
  );
  renderClubs(clubs);
}

clubsFilterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await loadClubs();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

btnReset?.addEventListener("click", async () => {
  clubsFilterForm.reset();
  try {
    await loadClubs();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

loadClubs().catch((err) => showToast(formatApiError(err), "error"));
}
