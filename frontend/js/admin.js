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

const dlgPcEdit = document.getElementById("dlgPcEdit");
const pcEditForm = document.getElementById("pcEditForm");
const dlgTariffEdit = document.getElementById("dlgTariffEdit");
const tariffEditForm = document.getElementById("tariffEditForm");
const dlgPeripheralEdit = document.getElementById("dlgPeripheralEdit");
const peripheralEditForm = document.getElementById("peripheralEditForm");
const dlgPcPeripheralEdit = document.getElementById("dlgPcPeripheralEdit");
const pcPeripheralEditForm = document.getElementById("pcPeripheralEditForm");

function closeDialog(dlg) {
  if (!dlg) return;
  try {
    dlg.close();
  } catch {
    // ignore
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-dialog-cancel]");
  if (!btn) return;
  const dlg = btn.closest("dialog");
  closeDialog(dlg);
});

function openDialog(dlg) {
  if (!dlg) return;
  if (typeof dlg.showModal === "function") dlg.showModal();
}

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
        <button type="button" class="secondary small" data-pc-edit="${pc.id}">Редактировать</button>
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
      <div class="row">
        <button type="button" class="secondary small" data-tariff-edit="${t.id}">Редактировать</button>
        <button type="button" class="danger small" data-tariff-delete="${t.id}">Удалить</button>
      </div>
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
      <div class="row">
        <button type="button" class="secondary small" data-peripheral-edit="${p.id}">Редактировать</button>
        <button type="button" class="danger small" data-peripheral-delete="${p.id}">Удалить</button>
      </div>
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
      <div class="row">
        <button type="button" class="secondary small" data-pp-edit="${pp.id}" data-pp-qty="${pp.quantity}">Изменить</button>
        <button type="button" class="danger small" data-pp-delete="${pp.id}">Удалить</button>
      </div>
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
      pcEditForm.elements.id.value = pc.id;
      pcEditForm.elements.number.value = pc.number ?? "";
      pcEditForm.elements.processor.value = pc.processor ?? "";
      pcEditForm.elements.gpu.value = pc.gpu ?? "";
      pcEditForm.elements.ram.value = pc.ram ?? "";
      pcEditForm.elements.storage_type.value = pc.storage_type ?? "";
      pcEditForm.elements.monitor_model.value = pc.monitor_model ?? "";
      pcEditForm.elements.status.value = pc.status ?? "active";
      openDialog(dlgPcEdit);
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

pcEditForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(pcEditForm);
  const id = Number(fd.get("id"));
  try {
    await adminApi(`pcs/${id}/`, {
      method: "PATCH",
      body: {
        number: Number(fd.get("number")),
        processor: String(fd.get("processor") || "").trim() || null,
        gpu: String(fd.get("gpu") || "").trim() || null,
        ram: String(fd.get("ram") || "").trim() || null,
        storage_type: String(fd.get("storage_type") || "").trim() || null,
        monitor_model: String(fd.get("monitor_model") || "").trim() || null,
        status: String(fd.get("status") || "active").trim(),
      },
    });
    closeDialog(dlgPcEdit);
    await adminLoadPcs();
    await refreshPeripheralSelects();
    showToast("ПК сохранён", "success");
  } catch (err) {
    showToast(formatApiError(err), "error");
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
  const editBtn = e.target.closest("[data-tariff-edit]");
  const btn = e.target.closest("[data-tariff-delete]");
  if (editBtn) {
    const id = Number(editBtn.dataset.tariffEdit);
    try {
      const t = await adminApi(`tariffs/${id}/`);
      tariffEditForm.elements.id.value = t.id;
      tariffEditForm.elements.day_of_week.value = t.day_of_week === null ? "" : String(t.day_of_week);
      tariffEditForm.elements.time_from.value = t.time_from ?? "";
      tariffEditForm.elements.time_to.value = t.time_to ?? "";
      tariffEditForm.elements.price_per_hour.value = t.price_per_hour ?? "";
      openDialog(dlgTariffEdit);
    } catch (err) {
      showToast(formatApiError(err), "error");
    }
    return;
  }
  if (!btn || !confirm("Удалить тариф?")) return;
  try {
    await adminApi(`tariffs/${btn.dataset.tariffDelete}/`, { method: "DELETE" });
    await adminLoadTariffs();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

tariffEditForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(tariffEditForm);
  const id = Number(fd.get("id"));
  const dayRaw = String(fd.get("day_of_week") || "").trim();
  const timeFrom = String(fd.get("time_from") || "").trim();
  const timeTo = String(fd.get("time_to") || "").trim();
  if ((timeFrom && !timeTo) || (!timeFrom && timeTo)) {
    showToast("Укажите оба времени или оставьте оба пустыми", "error");
    return;
  }
  try {
    await adminApi(`tariffs/${id}/`, {
      method: "PATCH",
      body: {
        day_of_week: dayRaw === "" ? null : Number(dayRaw),
        time_from: timeFrom || null,
        time_to: timeTo || null,
        price_per_hour: String(fd.get("price_per_hour") || "").trim(),
      },
    });
    closeDialog(dlgTariffEdit);
    await adminLoadTariffs();
    showToast("Тариф сохранён", "success");
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
  const editBtn = e.target.closest("[data-peripheral-edit]");
  const btn = e.target.closest("[data-peripheral-delete]");
  if (editBtn) {
    const id = Number(editBtn.dataset.peripheralEdit);
    try {
      const p = await adminApi(`peripherals/${id}/`);
      peripheralEditForm.elements.id.value = p.id;
      peripheralEditForm.elements.type.value = p.type ?? "mouse";
      peripheralEditForm.elements.brand.value = p.brand ?? "";
      peripheralEditForm.elements.model.value = p.model ?? "";
      peripheralEditForm.elements.description.value = p.description ?? "";
      openDialog(dlgPeripheralEdit);
    } catch (err) {
      showToast(formatApiError(err), "error");
    }
    return;
  }
  if (!btn || !confirm("Удалить?")) return;
  try {
    await adminApi(`peripherals/${btn.dataset.peripheralDelete}/`, { method: "DELETE" });
    await refreshPeripheralSelects();
    await loadAdminPcPeripherals();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

peripheralEditForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(peripheralEditForm);
  const id = Number(fd.get("id"));
  try {
    await adminApi(`peripherals/${id}/`, {
      method: "PATCH",
      body: {
        type: String(fd.get("type") || "").trim(),
        brand: String(fd.get("brand") || "").trim() || null,
        model: String(fd.get("model") || "").trim(),
        description: String(fd.get("description") || "").trim() || null,
      },
    });
    closeDialog(dlgPeripheralEdit);
    await refreshPeripheralSelects();
    await loadAdminPcPeripherals();
    showToast("Периферия сохранена", "success");
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
  const editBtn = e.target.closest("[data-pp-edit]");
  const btn = e.target.closest("[data-pp-delete]");
  if (editBtn) {
    pcPeripheralEditForm.elements.id.value = editBtn.dataset.ppEdit;
    pcPeripheralEditForm.elements.quantity.value = editBtn.dataset.ppQty || "1";
    openDialog(dlgPcPeripheralEdit);
    return;
  }
  if (!btn || !confirm("Удалить привязку?")) return;
  try {
    await adminApi(`pc-peripherals/${btn.dataset.ppDelete}/`, { method: "DELETE" });
    await loadAdminPcPeripherals();
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

pcPeripheralEditForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(pcPeripheralEditForm);
  const id = Number(fd.get("id"));
  const quantity = Number(fd.get("quantity"));
  if (!Number.isFinite(quantity) || quantity < 1) {
    showToast("Количество должно быть >= 1", "error");
    return;
  }
  try {
    await adminApi(`pc-peripherals/${id}/`, { method: "PATCH", body: { quantity } });
    closeDialog(dlgPcPeripheralEdit);
    await loadAdminPcPeripherals();
    showToast("Количество обновлено", "success");
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

loadMe()
  .then(() => loadAll())
  .catch((err) => showToast(formatApiError(err), "error"));
}
