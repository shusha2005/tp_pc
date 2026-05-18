import {
  adminApi,
  api,
  buildQuery,
  formatApiError,
  parsePaginated,
} from "./api.js";
import { initLayout, requireAuth } from "./nav.js";
import {
  fileToDataUrl,
  fillSelect,
  formatPrice,
  renderList,
  showToast,
} from "./ui.js";

initLayout({ active: "./admin.html" });
if (!requireAuth({ adminOnly: true })) {
  /* redirecting */
} else {
let adminPcsPage = 1;
let adminTariffsPage = 1;

const adminGreeting = document.getElementById("adminGreeting");
const btnAdminLoad = document.getElementById("btnAdminLoad");
const adminClubForm = document.getElementById("adminClubForm");
const adminClubPhotoForm = document.getElementById("adminClubPhotoForm");
const adminClubPhotosListEl = document.getElementById("adminClubPhotosList");
const btnAdminSaveClub = document.getElementById("btnAdminSaveClub");
const adminPcCreateForm = document.getElementById("adminPcCreateForm");
const adminPcsListEl = document.getElementById("adminPcsList");
const btnAdminPcsPrev = document.getElementById("btnAdminPcsPrev");
const btnAdminPcsNext = document.getElementById("btnAdminPcsNext");
const adminPcsPageInfo = document.getElementById("adminPcsPageInfo");
const adminTariffCreateForm = document.getElementById("adminTariffCreateForm");
const adminTariffsListEl = document.getElementById("adminTariffsList");
const btnAdminTariffsPrev = document.getElementById("btnAdminTariffsPrev");
const btnAdminTariffsNext = document.getElementById("btnAdminTariffsNext");
const adminTariffsPageInfo = document.getElementById("adminTariffsPageInfo");
const adminPeripheralCreateForm = document.getElementById("adminPeripheralCreateForm");
const adminPeripheralsListEl = document.getElementById("adminPeripheralsList");
const adminPcPeripheralForm = document.getElementById("adminPcPeripheralForm");
const adminPcPeripheralsListEl = document.getElementById("adminPcPeripheralsList");
const adminPcPeripheralPcSelect = document.getElementById("adminPcPeripheralPcSelect");
const adminPcPeripheralSelect = document.getElementById("adminPcPeripheralSelect");

async function loadMe() {
  const me = await api("/auth/admin-me/", { auth: true });
  adminGreeting.textContent = `Клуб #${me.club_id} · ${me.username} (${me.email})`;
}

async function adminLoadClub() {
  const data = await adminApi("clubs/");
  const club = parsePaginated(data).results[0];
  if (!club) return null;
  adminClubForm.elements.id.value = club.id;
  adminClubForm.elements.name.value = club.name || "";
  adminClubForm.elements.address.value = club.address || "";
  adminClubForm.elements.phone.value = club.phone || "";
  adminClubForm.elements.photo_url.value = club.photo_url || "";
  adminClubForm.elements.price.value = club.price || "";
  adminClubForm.elements.description.value = club.description || "";
  return club;
}

async function adminSaveClub() {
  const id = Number(adminClubForm.elements.id.value);
  if (!id) return;
  const payload = {
    name: adminClubForm.elements.name.value,
    address: adminClubForm.elements.address.value,
    phone: adminClubForm.elements.phone.value || null,
    photo_url: adminClubForm.elements.photo_url.value || null,
    price: adminClubForm.elements.price.value,
    description: adminClubForm.elements.description.value || null,
  };
  await adminApi(`clubs/${id}/`, { method: "PATCH", body: payload });
  showToast("Клуб сохранён", "success");
}

async function adminLoadClubPhotos() {
  const photos = await adminApi("club-photos/");
  const items = Array.isArray(photos) ? photos : parsePaginated(photos).results;
  renderList(
    adminClubPhotosListEl,
    items,
    (p) => `
      <p><a href="${p.url}" target="_blank" rel="noreferrer">Фото #${p.id}</a></p>
      <button type="button" class="btn danger small" data-photo-delete="${p.id}">Удалить</button>
    `
  );
}

async function adminLoadPcs() {
  const data = await adminApi(`pcs/${buildQuery({ page: adminPcsPage, page_size: 10, order: "number" })}`);
  const pag = parsePaginated(data);
  renderList(
    adminPcsListEl,
    pag.results,
    (pc) => `
      <h3>ПК #${pc.number}</h3>
      <p class="muted">${pc.processor || "—"} · ${pc.gpu || "—"} · ${pc.ram || "—"} · ${pc.storage_type || "—"}</p>
      <p>Статус: ${pc.status}</p>
      <div class="row">
        <button type="button" class="secondary small" data-pc-edit="${pc.id}">Изменить</button>
        <button type="button" class="danger small" data-pc-delete="${pc.id}">Удалить</button>
      </div>
    `
  );
  adminPcsPageInfo.textContent = `стр. ${adminPcsPage}`;
  btnAdminPcsPrev.disabled = adminPcsPage <= 1;
  btnAdminPcsNext.disabled = !pag.next;
}

async function adminLoadTariffs() {
  const data = await adminApi(`tariffs/${buildQuery({ page: adminTariffsPage, page_size: 10 })}`);
  const pag = parsePaginated(data);
  renderList(
    adminTariffsListEl,
    pag.results,
    (t) => `
      <h3>Тариф #${t.id}</h3>
      <p>День: ${t.day_of_week ?? "любой"} · ${t.time_from || "—"}–${t.time_to || "—"}</p>
      <p>${formatPrice(t.price_per_hour)}/час</p>
      <button type="button" class="danger small" data-tariff-delete="${t.id}">Удалить</button>
    `
  );
  adminTariffsPageInfo.textContent = `стр. ${adminTariffsPage}`;
  btnAdminTariffsPrev.disabled = adminTariffsPage <= 1;
  btnAdminTariffsNext.disabled = !pag.next;
}

async function adminLoadPeripherals() {
  const data = await adminApi("peripherals/");
  const pag = parsePaginated(data);
  renderList(
    adminPeripheralsListEl,
    pag.results,
    (p) => `
      <h3>${p.brand || ""} ${p.model}</h3>
      <p class="muted">${p.type}</p>
      <button type="button" class="danger small" data-peripheral-delete="${p.id}">Удалить</button>
    `
  );
  return pag.results;
}

async function refreshPeripheralSelects() {
  const peripherals = await adminLoadPeripherals();
  fillSelect(
    adminPcPeripheralSelect,
    peripherals.map((p) => String(p.id)),
    "—"
  );
  adminPcPeripheralSelect.querySelectorAll("option").forEach((opt, i) => {
    if (i === 0 || !peripherals[i - 1]) return;
    const p = peripherals[i - 1];
    opt.textContent = `${p.brand || ""} ${p.model} (${p.type})`.trim();
  });

  const pcsData = await adminApi("pcs/");
  const pcList = parsePaginated(pcsData).results;
  fillSelect(
    adminPcPeripheralPcSelect,
    pcList.map((p) => String(p.id)),
    "—"
  );
  adminPcPeripheralPcSelect.querySelectorAll("option").forEach((opt, i) => {
    if (i === 0 || !pcList[i - 1]) return;
    opt.textContent = `ПК #${pcList[i - 1].number}`;
  });
}

async function loadAdminPcPeripherals() {
  const data = await adminApi("pc-peripherals/");
  const pag = parsePaginated(data);
  renderList(
    adminPcPeripheralsListEl,
    pag.results,
    (pp) => `
      <p>ПК #${pp.pc?.number} → ${pp.peripheral?.brand || ""} ${pp.peripheral?.model} × ${pp.quantity}</p>
      <button type="button" class="danger small" data-pp-delete="${pp.id}">Удалить</button>
    `
  );
}

async function loadAll() {
  await adminLoadClub();
  adminPcsPage = 1;
  adminTariffsPage = 1;
  await adminLoadPcs();
  await adminLoadTariffs();
  await adminLoadClubPhotos();
  await refreshPeripheralSelects();
  await loadAdminPcPeripherals();
  showToast("Данные загружены", "success");
}

btnAdminLoad?.addEventListener("click", () => loadAll().catch((e) => showToast(formatApiError(e), "error")));
btnAdminSaveClub?.addEventListener("click", () => adminSaveClub().catch((e) => showToast(formatApiError(e), "error")));

adminClubPhotoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(adminClubPhotoForm);
  let url = String(fd.get("url") || "").trim();
  const file = fd.get("file");
  if (!url && file?.size > 0) url = await fileToDataUrl(file);
  if (!url) {
    showToast("Укажите URL или файл", "error");
    return;
  }
  try {
    await adminApi("club-photos/", { method: "POST", body: { url } });
    adminClubPhotoForm.reset();
    await adminLoadClubPhotos();
    showToast("Фото добавлено", "success");
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

adminClubPhotosListEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-photo-delete]");
  if (!btn || !confirm("Удалить фото?")) return;
  try {
    await adminApi(`club-photos/${btn.dataset.photoDelete}/`, { method: "DELETE" });
    await adminLoadClubPhotos();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

adminPcCreateForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(adminPcCreateForm);
  try {
    await adminApi("pcs/", {
      method: "POST",
      body: {
        number: Number(fd.get("number")),
        processor: fd.get("processor") || null,
        gpu: fd.get("gpu") || null,
        ram: fd.get("ram") || null,
        storage_type: fd.get("storage_type") || null,
        monitor_model: fd.get("monitor_model") || null,
        status: fd.get("status") || "active",
      },
    });
    adminPcCreateForm.reset();
    await adminLoadPcs();
    await refreshPeripheralSelects();
    showToast("ПК добавлен", "success");
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

adminPcsListEl?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-pc-edit]");
  const deleteBtn = e.target.closest("[data-pc-delete]");
  if (editBtn) {
    const id = Number(editBtn.dataset.pcEdit);
    try {
      const pc = await adminApi(`pcs/${id}/`);
      const status = prompt("Статус (active/inactive/maintenance)", pc.status) || pc.status;
      await adminApi(`pcs/${id}/`, { method: "PATCH", body: { status } });
      await adminLoadPcs();
      showToast("ПК обновлён", "success");
    } catch (err) {
      showToast(formatApiError(err), "error");
    }
    return;
  }
  if (deleteBtn && confirm("Удалить ПК?")) {
    try {
      await adminApi(`pcs/${deleteBtn.dataset.pcDelete}/`, { method: "DELETE" });
      await adminLoadPcs();
      await refreshPeripheralSelects();
      await loadAdminPcPeripherals();
      showToast("ПК удалён", "success");
    } catch (err) {
      showToast(formatApiError(err), "error");
    }
  }
});

btnAdminPcsPrev?.addEventListener("click", async () => {
  if (adminPcsPage <= 1) return;
  adminPcsPage -= 1;
  await adminLoadPcs();
});
btnAdminPcsNext?.addEventListener("click", async () => {
  adminPcsPage += 1;
  await adminLoadPcs().catch(() => {
    adminPcsPage -= 1;
  });
});

adminTariffCreateForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(adminTariffCreateForm);
  const dayRaw = String(fd.get("day_of_week") || "").trim();
  try {
    await adminApi("tariffs/", {
      method: "POST",
      body: {
        day_of_week: dayRaw === "" ? null : Number(dayRaw),
        time_from: fd.get("time_from") || null,
        time_to: fd.get("time_to") || null,
        price_per_hour: fd.get("price_per_hour"),
      },
    });
    adminTariffCreateForm.reset();
    await adminLoadTariffs();
    showToast("Тариф добавлен", "success");
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

btnAdminTariffsPrev?.addEventListener("click", async () => {
  if (adminTariffsPage <= 1) return;
  adminTariffsPage -= 1;
  await adminLoadTariffs();
});
btnAdminTariffsNext?.addEventListener("click", async () => {
  adminTariffsPage += 1;
  await adminLoadTariffs().catch(() => {
    adminTariffsPage -= 1;
  });
});

adminTariffsListEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-tariff-delete]");
  if (!btn || !confirm("Удалить тариф?")) return;
  try {
    await adminApi(`tariffs/${btn.dataset.tariffDelete}/`, { method: "DELETE" });
    await adminLoadTariffs();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

adminPeripheralCreateForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(adminPeripheralCreateForm);
  try {
    await adminApi("peripherals/", {
      method: "POST",
      body: {
        type: fd.get("type"),
        brand: fd.get("brand") || null,
        model: fd.get("model"),
      },
    });
    adminPeripheralCreateForm.reset();
    await refreshPeripheralSelects();
    showToast("Периферия добавлена", "success");
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

adminPeripheralsListEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-peripheral-delete]");
  if (!btn || !confirm("Удалить?")) return;
  try {
    await adminApi(`peripherals/${btn.dataset.peripheralDelete}/`, { method: "DELETE" });
    await refreshPeripheralSelects();
    await loadAdminPcPeripherals();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

adminPcPeripheralForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(adminPcPeripheralForm);
  try {
    await adminApi("pc-peripherals/", {
      method: "POST",
      body: {
        pc_id: Number(fd.get("pc_id")),
        peripheral_id: Number(fd.get("peripheral_id")),
        quantity: Number(fd.get("quantity") || 1),
      },
    });
    adminPcPeripheralForm.reset();
    await loadAdminPcPeripherals();
    showToast("Привязка создана", "success");
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

adminPcPeripheralsListEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-pp-delete]");
  if (!btn || !confirm("Удалить привязку?")) return;
  try {
    await adminApi(`pc-peripherals/${btn.dataset.ppDelete}/`, { method: "DELETE" });
    await loadAdminPcPeripherals();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

loadMe()
  .then(() => loadAll())
  .catch((err) => showToast(formatApiError(err), "error"));
}
