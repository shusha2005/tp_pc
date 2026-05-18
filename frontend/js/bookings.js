import { api, ensureAuth, fetchAllPages, formatApiError } from "./api.js";
import { initLayout, requireAuth } from "./nav.js";
import { formatDateTime, formatPrice, renderList, showToast } from "./ui.js";

initLayout({ active: "./bookings.html" });
if (!requireAuth({ userOnly: true })) {
  /* redirecting */
} else {
const bookingsList = document.getElementById("bookingsList");

const STATUS_LABELS = {
  created: "Создано",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
};

async function cancelBooking(id) {
  await api(`/bookings/${id}/cancel/`, { method: "POST", auth: true });
  showToast("Бронирование отменено", "success");
  await loadBookings();
}

async function loadBookings() {
  ensureAuth();
  const bookings = await fetchAllPages("/bookings/", {}, { auth: true });

  renderList(bookingsList, bookings, (b) => {
    const canCancel = !["cancelled", "completed"].includes(b.status);
    return `
      <h3>${b.club_name || "Клуб"} · ПК #${b.pc_number ?? b.pc_id}</h3>
      <p>${formatDateTime(b.start_time)} — ${formatDateTime(b.end_time)}</p>
      <p><strong>${formatPrice(b.total_price)}</strong>
        <span class="status-badge status-${b.status}">${STATUS_LABELS[b.status] || b.status}</span>
      </p>
      <div class="row">
        ${
          canCancel
            ? `<button type="button" class="btn danger small" data-cancel="${b.id}">Отменить</button>`
            : ""
        }
      </div>
    `;
  });
}

bookingsList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-cancel]");
  if (!btn) return;
  if (!confirm("Отменить бронирование?")) return;
  try {
    await cancelBooking(Number(btn.dataset.cancel));
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

loadBookings().catch((err) => showToast(formatApiError(err), "error"));
}
