import { api, ensureAuth, formatApiError } from "./api.js";
import { initLayout, requireAuth } from "./nav.js";
import { formatDateTime, formatPrice, getQueryParam, showToast } from "./ui.js";

initLayout({ active: "./bookings.html" });
if (!requireAuth({ userOnly: true })) {
  /* redirecting */
} else {
const pcId = Number(getQueryParam("pc_id"));
const clubId = Number(getQueryParam("club_id"));
if (!pcId) {
  window.location.href = "./clubs.html";
  throw new Error("no pc");
}

const clubLink = document.getElementById("clubLink");
const pcLabel = document.getElementById("pcLabel");
const bookingSubtitle = document.getElementById("bookingSubtitle");
const slotsForm = document.getElementById("slotsForm");
const slotsGrid = document.getElementById("slotsGrid");

function setDefaultDate() {
  const input = slotsForm.querySelector('[name="date"]');
  if (!input.value) {
    const today = new Date();
    input.value = today.toISOString().slice(0, 10);
  }
}

async function loadContext() {
  ensureAuth();
  const [club, pc] = await Promise.all([
    api(`/clubs/${clubId}/`, { auth: true }),
    api(`/pcs/${pcId}/`, { auth: true }),
  ]);

  clubLink.href = `./club.html?id=${clubId}`;
  clubLink.textContent = club.name;
  pcLabel.textContent = `ПК #${pc.number}`;
  bookingSubtitle.textContent = `${club.name} · ПК #${pc.number} · ${pc.gpu || ""} ${pc.processor || ""}`.trim();
  document.title = `Бронь ПК #${pc.number} — PC Club Booking`;
}

function renderSlots(slots) {
  if (!slots.length) {
    slotsGrid.innerHTML =
      '<div class="empty-state">На выбранную дату свободных слотов нет. Попробуйте другую дату или длительность.</div>';
    return;
  }

  slotsGrid.innerHTML = slots
    .map(
      (slot) => `
    <article class="slot-card">
      <p class="time">${formatDateTime(slot.start_time)}</p>
      <p class="muted">до ${formatDateTime(slot.end_time)}</p>
      <p><strong>${formatPrice(slot.estimated_price)}</strong></p>
      <button type="button" class="btn small" data-start="${slot.start_time}" data-end="${slot.end_time}">
        Забронировать
      </button>
    </article>
  `
    )
    .join("");
}

async function loadSlots() {
  ensureAuth();
  const fd = new FormData(slotsForm);
  const date = String(fd.get("date") || "").trim();
  const duration = String(fd.get("duration_minutes") || "60");
  const step = String(fd.get("step_minutes") || "30");

  const data = await api(
    `/bookings/available-slots/?pc_id=${pcId}&date=${encodeURIComponent(date)}&duration_minutes=${duration}&step_minutes=${step}`,
    { auth: true }
  );
  renderSlots(data.slots || []);
}

async function createBooking(startTime, endTime) {
  const booking = await api("/bookings/", {
    method: "POST",
    auth: true,
    body: { pc_id: pcId, start_time: startTime, end_time: endTime },
  });
  showToast(`Бронь создана · ${formatPrice(booking.total_price)}`, "success");
  setTimeout(() => {
    window.location.href = "./bookings.html";
  }, 800);
}

slotsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await loadSlots();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

slotsGrid?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-start][data-end]");
  if (!btn) return;
  if (!confirm("Подтвердить бронирование на выбранное время?")) return;
  try {
    await createBooking(btn.dataset.start, btn.dataset.end);
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

setDefaultDate();
loadContext()
  .then(() => loadSlots())
  .catch((err) => showToast(formatApiError(err), "error"));
}
