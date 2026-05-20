import { api, ensureAuth, fetchAllPages, formatApiError } from "./api.js";
import { initLayout, requireAuth } from "./nav.js";
import { fillSelect, formatPrice, getQueryParam, renderList, showToast } from "./ui.js";

initLayout({ active: "./clubs.html" });
if (!requireAuth({ userOnly: true })) {
  /* redirecting */
} else {
const clubId = Number(getQueryParam("id"));
if (!clubId) {
  window.location.href = "./clubs.html";
  throw new Error("no club id");
}

const clubHero = document.getElementById("clubHero");
const breadcrumbName = document.getElementById("breadcrumbName");
const pcsList = document.getElementById("pcsList");
const pcsFilterForm = document.getElementById("pcsFilterForm");
const btnPcsReset = document.getElementById("btnPcsReset");
const pcStatusSelect = document.getElementById("pcStatusSelect");
const gpuSelect = document.getElementById("gpuSelect");
const processorSelect = document.getElementById("processorSelect");
const ramSelect = document.getElementById("ramSelect");
const storageTypeSelect = document.getElementById("storageTypeSelect");

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='280'%3E%3Crect fill='%23121b2b' width='600' height='280'/%3E%3C/svg%3E";

function clubSvgCover(title) {
  const safe = String(title || "PC Club").slice(0, 28);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="420">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#121b2b" offset="0"/>
        <stop stop-color="#0f1624" offset="1"/>
      </linearGradient>
    </defs>
    <rect width="900" height="420" fill="url(#g)"/>
    <circle cx="720" cy="130" r="160" fill="rgba(110,168,254,0.18)"/>
    <circle cx="820" cy="300" r="220" fill="rgba(81,207,102,0.08)"/>
    <text x="50%" y="52%" fill="#e8eef9" text-anchor="middle" font-size="48" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${safe}</text>
    <text x="50%" y="64%" fill="#9aa8c0" text-anchor="middle" font-size="18" font-family="Segoe UI, Arial, sans-serif">Фото недоступно офлайн</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function statusTag(status) {
  const cls = ["active", "inactive", "maintenance"].includes(status) ? status : "inactive";
  const labels = { active: "доступен", inactive: "недоступен", maintenance: "обслуживание" };
  return `<span class="tag ${cls}">${labels[status] || status}</span>`;
}

async function loadClub() {
  ensureAuth();
  const club = await api(`/clubs/${clubId}/`, { auth: true });
  breadcrumbName.textContent = club.name;
  document.title = `${club.name} — PC Club Booking`;

  let photo = (club.photos && club.photos[0]) || club.photo_url || "";
  photo = String(photo || "").trim();
  if (!photo) photo = clubSvgCover(club.name);
  if (photo.startsWith("http://") || photo.startsWith("https://")) photo = clubSvgCover(club.name);
  clubHero.innerHTML = `
    <img src="${photo}" alt="${club.name}" />
    <div>
      <h1 class="page-title" style="margin-top:0">${club.name}</h1>
      <p class="muted">${club.address || ""}</p>
      ${club.phone ? `<p>Телефон: <a href="tel:${club.phone}">${club.phone}</a></p>` : ""}
      <p class="price" style="font-size:1.25rem;font-weight:700;color:var(--primary)">от ${formatPrice(club.price)}/час</p>
      ${club.description ? `<p>${club.description}</p>` : ""}
    </div>
  `;
}

async function loadPcFilters() {
  const data = await api(`/pcs/filters/?club_id=${clubId}`, { auth: true });
  fillSelect(pcStatusSelect, data.statuses, "любой");
  fillSelect(gpuSelect, data.gpus, "любой");
  fillSelect(processorSelect, data.processors, "любой");
  fillSelect(ramSelect, data.rams, "любая");
  fillSelect(storageTypeSelect, data.storage_types, "любой");
}

async function loadPcs() {
  ensureAuth();
  const fd = new FormData(pcsFilterForm);
  const pcs = await fetchAllPages(
    "/pcs/",
    {
      club_id: clubId,
      q: fd.get("q"),
      status: fd.get("status"),
      gpu: fd.get("gpu"),
      processor: fd.get("processor"),
      ram: fd.get("ram"),
      storage_type: fd.get("storage_type"),
      order: "number",
    },
    { auth: true }
  );

  renderList(pcsList, pcs, (pc) => {
    const peripherals =
      pc.peripherals?.length > 0
        ? pc.peripherals
            .map((p) => `${p.peripheral.brand || ""} ${p.peripheral.model}`.trim())
            .join(", ")
        : "стандартная";
    const canBook = pc.status === "active";
    return `
      <h3>ПК #${pc.number}</h3>
      <div class="pc-specs">
        ${statusTag(pc.status)}
        ${pc.gpu ? `<span class="tag">${pc.gpu}</span>` : ""}
        ${pc.processor ? `<span class="tag">${pc.processor}</span>` : ""}
        ${pc.ram ? `<span class="tag">${pc.ram}</span>` : ""}
        ${pc.storage_type ? `<span class="tag">${pc.storage_type}</span>` : ""}
      </div>
      <p class="muted">Монитор: ${pc.monitor_model || "—"} · Периферия: ${peripherals}</p>
      <div class="row">
        ${
          canBook
            ? `<a class="btn" href="./booking.html?pc_id=${pc.id}&club_id=${clubId}">Забронировать</a>`
            : `<span class="muted">Бронирование недоступно</span>`
        }
      </div>
    `;
  });
}

pcsFilterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await loadPcs();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

btnPcsReset?.addEventListener("click", async () => {
  pcsFilterForm.reset();
  try {
    await loadPcFilters();
    await loadPcs();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

Promise.all([loadClub(), loadPcFilters(), loadPcs()]).catch((err) =>
  showToast(formatApiError(err), "error")
);
}
