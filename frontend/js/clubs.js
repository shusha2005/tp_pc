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

function renderClubs(clubs) {
  if (!clubs.length) {
    clubsGrid.innerHTML = '<div class="empty-state">Клубы не найдены. Попробуйте изменить фильтры.</div>';
    return;
  }

  clubsGrid.innerHTML = clubs
    .map(
      (club) => `
    <article class="club-card">
      <img src="${club.photo || PLACEHOLDER_IMG}" alt="${club.name}" loading="lazy" />
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
