const API_BASE = "http://127.0.0.1:8000/api";

const outEl = document.getElementById("out");
const userPanel = document.getElementById("userPanel");
const slotsForm = document.getElementById("slotsForm");
const clubSearchInput = document.getElementById("clubSearchInput");
const clubsListEl = document.getElementById("clubsList");
const clubQuickSelect = document.getElementById("clubQuickSelect");
const pcsListEl = document.getElementById("pcsList");
const slotsListEl = document.getElementById("slotsList");
const clubsFilterForm = document.getElementById("clubsFilterForm");
const pcsFilterForm = document.getElementById("pcsFilterForm");
const btnClubsReset = document.getElementById("btnClubsReset");
const btnPcsReset = document.getElementById("btnPcsReset");
const perTypeSelect = document.getElementById("perTypeSelect");
const perBrandSelect = document.getElementById("perBrandSelect");
const perModelSelect = document.getElementById("perModelSelect");
const pcStatusSelect = document.getElementById("pcStatusSelect");
const gpuSelect = document.getElementById("gpuSelect");
const processorSelect = document.getElementById("processorSelect");
const ramSelect = document.getElementById("ramSelect");
const storageTypeSelect = document.getElementById("storageTypeSelect");
const adminPanel = document.getElementById("adminPanel");
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
const btnMe = document.getElementById("btnMe");
const btnLogout = document.getElementById("btnLogout");
let selectedClubId = null;
let selectedPcId = null;
let adminPcsPage = 1;
let adminTariffsPage = 1;
let clubsSearchIndex = [];

function fillClubQuickSelect(clubs) {
  if (!clubQuickSelect) return;
  clubQuickSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Выбери существующий клуб";
  clubQuickSelect.appendChild(placeholder);

  (clubs || []).forEach((club) => {
    const option = document.createElement("option");
    option.value = String(club.id);
    option.textContent = `${club.name} (${club.address})`;
    clubQuickSelect.appendChild(option);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл изображения."));
    reader.readAsDataURL(file);
  });
}

function setOut(value) {
  outEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}

function getPrincipal() {
  return localStorage.getItem("principal") || "user";
}

function setPrincipal(value) {
  localStorage.setItem("principal", value);
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

function ensureAuth() {
  if (!getAccessToken()) {
    throw { status: 401, data: { detail: "Сначала авторизуйтесь." } };
  }
}

function parsePaginated(data) {
  if (data && Array.isArray(data.results)) {
    return {
      isPaginated: true,
      results: data.results,
      count: data.count,
      next: data.next,
      previous: data.previous,
    };
  }
  return { isPaginated: false, results: Array.isArray(data) ? data : [], count: null, next: null, previous: null };
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    usp.set(k, s);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function normalizeItems(data) {
  return parsePaginated(data).results;
}

async function fetchAllPages(path, params, { auth = false, pageSize = 100 } = {}) {
  let page = 1;
  let out = [];
  while (true) {
    const query = buildQuery({ ...params, page, page_size: pageSize });
    const data = await api(`${path}${query}`, { auth });
    const pag = parsePaginated(data);
    out = out.concat(pag.results || []);
    if (!pag.isPaginated || !pag.next) break;
    page += 1;
  }
  return out;
}

function fillSelect(selectEl, values, emptyLabel) {
  if (!selectEl) return;
  const cur = selectEl.value;
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = emptyLabel || "—";
  selectEl.appendChild(opt0);
  (values || []).forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
  if (cur) selectEl.value = cur;
}

function renderList(target, items, renderItem) {
  target.innerHTML = "";
  if (!items.length) {
    target.innerHTML = '<div class="item">Нет данных</div>';
    return;
  }
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = renderItem(item);
    target.appendChild(el);
  });
}

async function loadClubSuggestions() {
  ensureAuth();
  const clubs = await fetchAllPages("/clubs/", { order: "name" }, { auth: true });
  clubsSearchIndex = clubs.map((club) => ({
    id: club.id,
    name: String(club.name || "").trim(),
    address: String(club.address || "").trim(),
  }));
  fillClubQuickSelect(clubsSearchIndex);
}

async function loadClubs() {
  ensureAuth();
  const fd = clubsFilterForm ? new FormData(clubsFilterForm) : null;
  const params = {
    q: fd ? fd.get("q") : "",
    price_gte: fd ? fd.get("price_gte") : "",
    price_lte: fd ? fd.get("price_lte") : "",
    has_photo: fd ? fd.get("has_photo") : "",
    order: "name",
  };
  const clubs = await fetchAllPages("/clubs/", params, { auth: true });
  if (!String(params.q || "").trim() && !String(params.price_gte || "").trim() && !String(params.price_lte || "").trim() && !String(params.has_photo || "").trim()) {
    clubsSearchIndex = clubs.map((club) => ({
      id: club.id,
      name: String(club.name || "").trim(),
      address: String(club.address || "").trim(),
    }));
    fillClubQuickSelect(clubsSearchIndex);
  }
  renderList(
    clubsListEl,
    clubs,
    (club) => {
      const photos = Array.isArray(club.photos) ? club.photos : [];
      const photoLinks = photos.length
        ? photos.slice(0, 3).map((u) => `<a href="${u}" target="_blank" rel="noreferrer">фото</a>`).join(", ")
        : (club.photo_url ? `<a href="${club.photo_url}" target="_blank" rel="noreferrer">ссылка</a>` : "нет");
      return `
      <div><strong>${club.name}</strong> (${club.address})</div>
      ${club.description ? `<div class="muted">${club.description}</div>` : ""}
      <div>Цена: ${club.price} руб/час | Телефон: ${club.phone || "-"}</div>
      <div>Фото: ${photoLinks}</div>
      <div class="row">
        <button type="button" data-club-id="${club.id}" class="secondary">Выбрать клуб</button>
      </div>
    `
    }
  );
}

async function loadPcFilters(clubId) {
  if (!clubId) return;
  const data = await api(`/pcs/filters/?club_id=${clubId}`, { auth: true });
  fillSelect(pcStatusSelect, data.statuses, "любой");
  fillSelect(gpuSelect, data.gpus, "любой");
  fillSelect(processorSelect, data.processors, "любой");
  fillSelect(ramSelect, data.rams, "любая");
  fillSelect(storageTypeSelect, data.storage_types, "любой");
  fillSelect(perTypeSelect, data.peripheral_types, "любой");
  fillSelect(perBrandSelect, data.peripheral_brands, "любой");
  fillSelect(perModelSelect, data.peripheral_models, "любая");
}

async function loadPcs(clubId) {
  ensureAuth();
  const fd = pcsFilterForm ? new FormData(pcsFilterForm) : null;
  const params = {
    club_id: clubId,
    q: fd ? fd.get("q") : "",
    status: fd ? fd.get("status") : "",
    gpu: fd ? fd.get("gpu") : "",
    processor: fd ? fd.get("processor") : "",
    ram: fd ? fd.get("ram") : "",
    storage_type: fd ? fd.get("storage_type") : "",
    peripheral_type: fd ? fd.get("peripheral_type") : "",
    peripheral_brand: fd ? fd.get("peripheral_brand") : "",
    peripheral_model: fd ? fd.get("peripheral_model") : "",
    order: "number",
  };
  const pcs = await fetchAllPages("/pcs/", params, { auth: true });
  renderList(
    pcsListEl,
    pcs,
    (pc) => {
      const peripherals = pc.peripherals && pc.peripherals.length > 0
        ? pc.peripherals.map(p => `${p.peripheral.brand} ${p.peripheral.model} (${p.peripheral.type})`).join(", ")
        : "нет";
      return `
      <div><strong>ПК #${pc.number}</strong> (${pc.status})</div>
      <div>CPU: ${pc.processor || "-"} | GPU: ${pc.gpu || "-"} | RAM: ${pc.ram || "-"}</div>
      <div>Накопитель: ${pc.storage_type || "-"} | Монитор: ${pc.monitor_model || "-"}</div>
      <div>Периферия: ${peripherals}</div>
      <div class="row">
        <button type="button" data-pc-id="${pc.id}" class="secondary">Выбрать ПК</button>
      </div>
    `
    }
  );
}

async function loadSlots() {
  ensureAuth();
  if (!selectedPcId) {
    setOut({ error: true, message: "Сначала выберите ПК." });
    return;
  }
  const fd = new FormData(slotsForm);
  const date = String(fd.get("date") || "").trim();
  const duration = String(fd.get("duration_minutes") || "60").trim();
  const step = String(fd.get("step_minutes") || "30").trim();
  const slots = await api(
    `/bookings/available-slots/?pc_id=${selectedPcId}&date=${encodeURIComponent(date)}&duration_minutes=${duration}&step_minutes=${step}`,
    { auth: true }
  );
  renderList(
    slotsListEl,
    slots.slots || [],
    (slot) => `
      <div><strong>${slot.start_time}</strong> - ${slot.end_time}</div>
      <div>Оценка цены: ${slot.estimated_price}</div>
      <div class="row">
        <button type="button" data-book-start="${slot.start_time}" data-book-end="${slot.end_time}">Забронировать</button>
      </div>
    `
  );
}

async function createBooking(startTime, endTime) {
  ensureAuth();
  if (!selectedPcId) {
    setOut({ error: true, message: "Сначала выберите ПК." });
    return;
  }
  const booking = await api("/bookings/", {
    method: "POST",
    auth: true,
    body: {
      pc_id: selectedPcId,
      start_time: startTime,
      end_time: endTime,
    },
  });
  setOut({ booking_created: true, booking });
}

clubsFilterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await loadClubs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnClubsReset?.addEventListener("click", async () => {
  if (!clubsFilterForm) return;
  clubsFilterForm.reset();
  if (clubQuickSelect) clubQuickSelect.value = "";
  try {
    await loadClubs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

clubQuickSelect?.addEventListener("change", async () => {
  if (!clubSearchInput) return;
  const selectedId = Number(clubQuickSelect.value);
  const selectedClub = clubsSearchIndex.find((club) => club.id === selectedId);
  clubSearchInput.value = selectedClub ? selectedClub.name : "";
  try {
    await loadClubs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

clubsListEl?.addEventListener("click", async (e) => {
  const button = e.target.closest("button[data-club-id]");
  if (!button) return;
  selectedClubId = Number(button.dataset.clubId);
  selectedPcId = null;
  slotsListEl.innerHTML = "";
  try {
    pcsFilterForm?.reset();
    await loadPcFilters(selectedClubId);
    await loadPcs(selectedClubId);
    setOut({ club_selected: selectedClubId });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

pcsListEl?.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-pc-id]");
  if (!button) return;
  selectedPcId = Number(button.dataset.pcId);
  setOut({ pc_selected: selectedPcId, club_selected: selectedClubId });
});

slotsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await loadSlots();
    setOut({ slots_loaded_for_pc: selectedPcId });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

slotsListEl?.addEventListener("click", async (e) => {
  const button = e.target.closest("button[data-book-start][data-book-end]");
  if (!button) return;
  try {
    await createBooking(button.dataset.bookStart, button.dataset.bookEnd);
    await loadSlots();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

pcsFilterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedClubId) {
    setOut({ error: true, message: "Сначала выберите клуб." });
    return;
  }
  try {
    await loadPcs(selectedClubId);
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnPcsReset?.addEventListener("click", async () => {
  if (!pcsFilterForm) return;
  pcsFilterForm.reset();
  if (!selectedClubId) return;
  try {
    await loadPcFilters(selectedClubId);
    await loadPcs(selectedClubId);
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

async function adminApi(path, opts = {}) {
  return api(`/admin/${path}`, { ...opts, auth: true });
}

async function adminLoadClub() {
  const data = await adminApi("clubs/");
  const pag = parsePaginated(data);
  const club = pag.results[0];
  if (!club) return null;
  if (adminClubForm) {
    adminClubForm.elements.id.value = club.id;
    adminClubForm.elements.name.value = club.name || "";
    adminClubForm.elements.address.value = club.address || "";
    adminClubForm.elements.phone.value = club.phone || "";
    adminClubForm.elements.photo_url.value = club.photo_url || "";
    adminClubForm.elements.price.value = club.price || "";
    adminClubForm.elements.description.value = club.description || "";
  }
  return club;
}

async function adminSaveClub() {
  if (!adminClubForm) return;
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
  const club = await adminApi(`clubs/${id}/`, { method: "PATCH", body: payload });
  setOut({ club_saved: true, club });
}

async function adminLoadClubPhotos() {
  const photos = await adminApi("club-photos/");
  const items = Array.isArray(photos) ? photos : parsePaginated(photos).results;
  renderList(
    adminClubPhotosListEl,
    items,
    (p) => `
      <div><strong>Фото #${p.id}</strong></div>
      <div><a href="${p.url}" target="_blank" rel="noreferrer">${p.url}</a></div>
      <div class="row">
        <button type="button" class="secondary" data-club-photo-id="${p.id}" data-action="delete-club-photo">Удалить</button>
      </div>
    `
  );
}

async function adminCreateClubPhoto() {
  if (!adminClubPhotoForm) return;
  const fd = new FormData(adminClubPhotoForm);
  const file = fd.get("file");
  let url = String(fd.get("url") || "").trim();
  if (!url && file && typeof file === "object" && file.size > 0) {
    url = await fileToDataUrl(file);
  }
  if (!url) {
    setOut({ error: true, message: "Укажите URL фото или выберите файл." });
    return;
  }
  const photo = await adminApi("club-photos/", { method: "POST", body: { url } });
  setOut({ club_photo_created: true, photo });
  adminClubPhotoForm.reset();
  await adminLoadClubPhotos();
}

async function adminLoadPcs() {
  const data = await adminApi(`pcs/${buildQuery({ page: adminPcsPage, page_size: 10, order: "number" })}`);
  const pag = parsePaginated(data);
  renderList(
    adminPcsListEl,
    pag.results,
    (pc) => `
      <div><strong>ПК #${pc.number}</strong> (${pc.status})</div>
      <div>CPU: ${pc.processor || "-"} | GPU: ${pc.gpu || "-"} | RAM: ${pc.ram || "-"}</div>
      <div>Накопитель: ${pc.storage_type || "-"} | Монитор: ${pc.monitor_model || "-"}</div>
      <div class="row">
        <button type="button" class="secondary" data-admin-pc-edit="${pc.id}">Редактировать</button>
        <button type="button" class="danger" data-admin-pc-delete="${pc.id}">Удалить</button>
      </div>
    `
  );
  if (adminPcsPageInfo) adminPcsPageInfo.textContent = `стр. ${adminPcsPage}`;
  if (btnAdminPcsPrev) btnAdminPcsPrev.disabled = adminPcsPage <= 1;
  if (btnAdminPcsNext) btnAdminPcsNext.disabled = !pag.next;
}

async function adminCreatePc(e) {
  e.preventDefault();
  const fd = new FormData(adminPcCreateForm);
  const payload = {
    number: Number(fd.get("number")),
    processor: String(fd.get("processor") || "").trim() || null,
    gpu: String(fd.get("gpu") || "").trim() || null,
    ram: String(fd.get("ram") || "").trim() || null,
    storage_type: String(fd.get("storage_type") || "").trim() || null,
    monitor_model: String(fd.get("monitor_model") || "").trim() || null,
    status: String(fd.get("status") || "active"),
  };
  const pc = await adminApi("pcs/", { method: "POST", body: payload });
  setOut({ pc_created: true, pc });
  adminPcCreateForm.reset();
  await adminLoadPcs();
}

async function adminLoadTariffs() {
  const data = await adminApi(`tariffs/${buildQuery({ page: adminTariffsPage, page_size: 10, order: "id" })}`);
  const pag = parsePaginated(data);
  renderList(
    adminTariffsListEl,
    pag.results,
    (t) => `
      <div><strong>Тариф #${t.id}</strong></div>
      <div>День: ${t.day_of_week === null ? "любой" : t.day_of_week} | ${t.time_from || "—"} - ${t.time_to || "—"}</div>
      <div>Цена/час: ${t.price_per_hour}</div>
      <div class="row">
        <button type="button" class="secondary" data-admin-tariff-edit="${t.id}">Редактировать</button>
        <button type="button" class="danger" data-admin-tariff-delete="${t.id}">Удалить</button>
      </div>
    `
  );
  if (adminTariffsPageInfo) adminTariffsPageInfo.textContent = `стр. ${adminTariffsPage}`;
  if (btnAdminTariffsPrev) btnAdminTariffsPrev.disabled = adminTariffsPage <= 1;
  if (btnAdminTariffsNext) btnAdminTariffsNext.disabled = !pag.next;
}

async function adminCreateTariff(e) {
  e.preventDefault();
  const fd = new FormData(adminTariffCreateForm);
  const dayRaw = String(fd.get("day_of_week") || "").trim();
  const payload = {
    day_of_week: dayRaw === "" ? null : Number(dayRaw),
    time_from: String(fd.get("time_from") || "").trim() || null,
    time_to: String(fd.get("time_to") || "").trim() || null,
    price_per_hour: String(fd.get("price_per_hour") || "").trim(),
  };
  if ((payload.time_from && !payload.time_to) || (!payload.time_from && payload.time_to)) {
    setOut({ error: true, message: "Укажите оба поля времени или оставьте оба пустыми." });
    return;
  }
  const tariff = await adminApi("tariffs/", { method: "POST", body: payload });
  setOut({ tariff_created: true, tariff });
  adminTariffCreateForm.reset();
  await adminLoadTariffs();
}

async function adminLoadPeripherals() {
  const data = await adminApi("peripherals/", { auth: true });
  const pag = parsePaginated(data);
  renderList(
    adminPeripheralsListEl,
    pag.results,
    (peripheral) => `
      <div><strong>${peripheral.brand || "-"} ${peripheral.model || "-"}</strong></div>
      <div>Тип: ${peripheral.type}</div>
      <div>${peripheral.description || ""}</div>
      <div class="row">
        <button type="button" class="secondary" data-admin-peripheral-edit="${peripheral.id}">Редактировать</button>
        <button type="button" class="danger" data-admin-peripheral-delete="${peripheral.id}">Удалить</button>
      </div>
    `
  );
  return pag.results;
}

async function refreshUi() {
  const principal = getPrincipal();
  const authed = Boolean(getAccessToken());
  if (adminPanel) adminPanel.style.display = authed && principal === "admin" ? "block" : "none";
  if (userPanel) userPanel.style.display = authed && principal === "admin" ? "none" : "block";
}

btnAdminLoad?.addEventListener("click", async () => {
  try {
    await adminLoadClub();
    adminPcsPage = 1;
    adminTariffsPage = 1;
    await adminLoadPcs();
    await adminLoadTariffs();
    await adminLoadClubPhotos();
    await refreshPeripheralSelects();
    await loadAdminPcPeripherals();
    setOut({ admin_loaded: true });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnAdminSaveClub?.addEventListener("click", async () => {
  try {
    await adminSaveClub();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

adminClubPhotoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await adminCreateClubPhoto();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

adminClubPhotosListEl?.addEventListener("click", async (e) => {
  const button = e.target.closest("button[data-club-photo-id][data-action='delete-club-photo']");
  if (!button) return;
  const id = Number(button.dataset.clubPhotoId);
  if (!id) return;
  if (!confirm("Удалить фото клуба?")) return;
  try {
    await adminApi(`club-photos/${id}/`, { method: "DELETE" });
    await adminLoadClubPhotos();
    setOut({ club_photo_deleted: true, id });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

adminPcCreateForm?.addEventListener("submit", async (e) => {
  try {
    await adminCreatePc(e);
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

adminPcsListEl?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("button[data-admin-pc-edit]");
  const deleteBtn = e.target.closest("button[data-admin-pc-delete]");

  if (editBtn) {
    const id = Number(editBtn.dataset.adminPcEdit);
    try {
      const current = await adminApi(`pcs/${id}/`);
      const payload = {
        number: Number(prompt("Номер ПК", String(current.number)) || current.number),
        processor: prompt("CPU", current.processor || "") || null,
        gpu: prompt("GPU", current.gpu || "") || null,
        ram: prompt("RAM", current.ram || "") || null,
        storage_type: prompt("Накопитель (SSD/HDD/SSD+HDD/NVMe)", current.storage_type || "") || null,
        monitor_model: prompt("Монитор", current.monitor_model || "") || null,
        status: prompt("Статус (active/inactive/maintenance)", current.status || "active") || current.status,
      };
      await adminApi(`pcs/${id}/`, { method: "PATCH", body: payload });
      await adminLoadPcs();
      await refreshPeripheralSelects();
      setOut({ pc_updated: true, id });
    } catch (err) {
      setOut({ error: true, ...err });
    }
    return;
  }

  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.adminPcDelete);
    if (!confirm("Удалить ПК? Связанная периферия будет отвязана.")) return;
    try {
      await adminApi(`pcs/${id}/`, { method: "DELETE" });
      await adminLoadPcs();
      await refreshPeripheralSelects();
      await loadAdminPcPeripherals();
      setOut({ pc_deleted: true, id });
    } catch (err) {
      setOut({ error: true, ...err });
    }
  }
});

btnAdminPcsPrev?.addEventListener("click", async () => {
  if (adminPcsPage <= 1) return;
  adminPcsPage -= 1;
  try {
    await adminLoadPcs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnAdminPcsNext?.addEventListener("click", async () => {
  adminPcsPage += 1;
  try {
    await adminLoadPcs();
  } catch (err) {
    adminPcsPage -= 1;
    setOut({ error: true, ...err });
  }
});

adminTariffCreateForm?.addEventListener("submit", async (e) => {
  try {
    await adminCreateTariff(e);
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnAdminTariffsPrev?.addEventListener("click", async () => {
  if (adminTariffsPage <= 1) return;
  adminTariffsPage -= 1;
  try {
    await adminLoadTariffs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnAdminTariffsNext?.addEventListener("click", async () => {
  adminTariffsPage += 1;
  try {
    await adminLoadTariffs();
  } catch (err) {
    adminTariffsPage -= 1;
    setOut({ error: true, ...err });
  }
});

adminTariffsListEl?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("button[data-admin-tariff-edit]");
  const deleteBtn = e.target.closest("button[data-admin-tariff-delete]");

  if (editBtn) {
    const id = Number(editBtn.dataset.adminTariffEdit);
    try {
      const current = await adminApi(`tariffs/${id}/`);
      const dayRaw = prompt("День недели (0-6 или пусто)", current.day_of_week === null ? "" : String(current.day_of_week));
      const payload = {
        day_of_week: dayRaw === "" ? null : Number(dayRaw),
        time_from: prompt("Время начала HH:MM (или пусто)", current.time_from || "") || null,
        time_to: prompt("Время конца HH:MM (или пусто)", current.time_to || "") || null,
        price_per_hour: prompt("Цена за час", String(current.price_per_hour)) || String(current.price_per_hour),
      };
      await adminApi(`tariffs/${id}/`, { method: "PATCH", body: payload });
      await adminLoadTariffs();
      setOut({ tariff_updated: true, id });
    } catch (err) {
      setOut({ error: true, ...err });
    }
    return;
  }

  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.adminTariffDelete);
    if (!confirm("Удалить тариф?")) return;
    try {
      await adminApi(`tariffs/${id}/`, { method: "DELETE" });
      await adminLoadTariffs();
      setOut({ tariff_deleted: true, id });
    } catch (err) {
      setOut({ error: true, ...err });
    }
  }
});

adminPeripheralCreateForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(adminPeripheralCreateForm);
  const payload = {
    type: String(fd.get("type") || "").trim(),
    brand: String(fd.get("brand") || "").trim() || null,
    model: String(fd.get("model") || "").trim(),
    description: String(fd.get("description") || "").trim() || null,
  };
  try {
    const peripheral = await adminApi("peripherals/", { method: "POST", body: payload });
    setOut({ peripheral_created: true, peripheral });
    adminPeripheralCreateForm.reset();
    await refreshPeripheralSelects();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

adminPeripheralsListEl?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("button[data-admin-peripheral-edit]");
  const deleteBtn = e.target.closest("button[data-admin-peripheral-delete]");

  if (editBtn) {
    const id = Number(editBtn.dataset.adminPeripheralEdit);
    try {
      const current = await adminApi(`peripherals/${id}/`);
      const payload = {
        type: prompt("Тип (mouse/keyboard/headset/monitor/mousepad)", current.type || "mouse") || current.type,
        brand: prompt("Бренд", current.brand || "") || null,
        model: prompt("Модель", current.model || "") || current.model,
        description: prompt("Описание", current.description || "") || null,
      };
      await adminApi(`peripherals/${id}/`, { method: "PATCH", body: payload });
      await refreshPeripheralSelects();
      setOut({ peripheral_updated: true, id });
    } catch (err) {
      setOut({ error: true, ...err });
    }
    return;
  }

  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.adminPeripheralDelete);
    if (!confirm("Удалить периферию?")) return;
    try {
      await adminApi(`peripherals/${id}/`, { method: "DELETE" });
      await refreshPeripheralSelects();
      await loadAdminPcPeripherals();
      setOut({ peripheral_deleted: true, id });
    } catch (err) {
      setOut({ error: true, ...err });
    }
  }
});

adminPcPeripheralForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(adminPcPeripheralForm);
  const payload = {
    pc_id: Number(fd.get("pc_id")),
    peripheral_id: Number(fd.get("peripheral_id")),
    quantity: Number(fd.get("quantity") || 1),
  };
  try {
    const pcPeri = await adminApi("pc-peripherals/", { method: "POST", body: payload });
    setOut({ pc_peripheral_linked: true, pcPeri });
    adminPcPeripheralForm.reset();
    await loadAdminPcPeripherals();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

async function refreshPeripheralSelects() {
  try {
    const peripherals = await adminLoadPeripherals();
    fillSelect(adminPcPeripheralSelect, peripherals.map(p => `${p.id}`), "—");
    const opts = adminPcPeripheralSelect.querySelectorAll("option");
    peripherals.forEach((p, i) => {
      if (opts[i + 1]) opts[i + 1].textContent = `${p.brand} ${p.model} (${p.type})`;
    });
    
    // Also populate PC select
    const pcsData = await adminApi(`pcs/`);
    const pcList = parsePaginated(pcsData).results;
    fillSelect(adminPcPeripheralPcSelect, pcList.map(p => `${p.id}`), "—");
    const pcOpts = adminPcPeripheralPcSelect.querySelectorAll("option");
    pcList.forEach((p, i) => {
      if (pcOpts[i + 1]) pcOpts[i + 1].textContent = `ПК #${p.number}`;
    });
  } catch (err) {
    setOut({ error: true, ...err });
  }
}

async function loadAdminPcPeripherals() {
  try {
    const data = await adminApi("pc-peripherals/", { auth: true });
    const pag = parsePaginated(data);
    renderList(
      adminPcPeripheralsListEl,
      pag.results,
      (pp) => `
        <div><strong>ПК #${pp.pc?.number || "?"}</strong> → ${pp.peripheral?.brand || "-"} ${pp.peripheral?.model || "-"}</div>
        <div>Тип: ${pp.peripheral?.type || "-"} | Кол-во: ${pp.quantity}</div>
        <div class="row">
          <button type="button" class="secondary" data-admin-pc-peripheral-edit="${pp.id}">Изменить кол-во</button>
          <button type="button" class="danger" data-admin-pc-peripheral-delete="${pp.id}">Удалить</button>
        </div>
      `
    );
  } catch (err) {
    setOut({ error: true, ...err });
  }
}

adminPcPeripheralsListEl?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("button[data-admin-pc-peripheral-edit]");
  const deleteBtn = e.target.closest("button[data-admin-pc-peripheral-delete]");

  if (editBtn) {
    const id = Number(editBtn.dataset.adminPcPeripheralEdit);
    const qtyRaw = prompt("Новое количество", "1");
    const quantity = Number(qtyRaw);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setOut({ error: true, message: "Количество должно быть >= 1." });
      return;
    }
    try {
      await adminApi(`pc-peripherals/${id}/`, { method: "PATCH", body: { quantity } });
      await loadAdminPcPeripherals();
      setOut({ pc_peripheral_updated: true, id, quantity });
    } catch (err) {
      setOut({ error: true, ...err });
    }
    return;
  }

  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.adminPcPeripheralDelete);
    if (!confirm("Удалить привязку периферии к ПК?")) return;
    try {
      await adminApi(`pc-peripherals/${id}/`, { method: "DELETE" });
      await loadAdminPcPeripherals();
      setOut({ pc_peripheral_deleted: true, id });
    } catch (err) {
      setOut({ error: true, ...err });
    }
  }
});

btnMe?.addEventListener("click", async () => {
  try {
    const principal = getPrincipal();
    const me = principal === "admin" ? await api("/auth/admin-me/", { auth: true }) : await api("/auth/me/", { auth: true });
    setOut({ principal, me });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnLogout?.addEventListener("click", () => {
  clearTokens();
  selectedClubId = null;
  selectedPcId = null;
  adminPcsPage = 1;
  adminTariffsPage = 1;
  clubsListEl.innerHTML = "";
  pcsListEl.innerHTML = "";
  slotsListEl.innerHTML = "";
  if (adminPcsListEl) adminPcsListEl.innerHTML = "";
  if (adminTariffsListEl) adminTariffsListEl.innerHTML = "";
  if (adminPanel) adminPanel.style.display = "none";
  setOut("Токены удалены из localStorage.");
  window.location.href = "./index.html";
});

// guard: require auth for app page
if (!getAccessToken()) {
  window.location.href = "./index.html";
} else {
  setOut("Токен найден. Можно работать в кабинете.");
  refreshUi();
  if (getPrincipal() !== "admin") {
    loadClubSuggestions().catch((err) => setOut({ error: true, ...err }));
    loadClubs().catch((err) => setOut({ error: true, ...err }));
  }
}

