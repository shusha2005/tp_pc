const API_BASE = "http://127.0.0.1:8000/api";

const outEl = document.getElementById("out");
const authForm = document.getElementById("authForm");
const slotsForm = document.getElementById("slotsForm");
const clubsListEl = document.getElementById("clubsList");
const pcsListEl = document.getElementById("pcsList");
const slotsListEl = document.getElementById("slotsList");
const btnLoadClubs = document.getElementById("btnLoadClubs");
const clubsFilterForm = document.getElementById("clubsFilterForm");
const pcsFilterForm = document.getElementById("pcsFilterForm");
const btnClubsReset = document.getElementById("btnClubsReset");
const btnPcsReset = document.getElementById("btnPcsReset");
const btnClubsPrev = document.getElementById("btnClubsPrev");
const btnClubsNext = document.getElementById("btnClubsNext");
const clubsPageInfo = document.getElementById("clubsPageInfo");
const btnPcsPrev = document.getElementById("btnPcsPrev");
const btnPcsNext = document.getElementById("btnPcsNext");
const pcsPageInfo = document.getElementById("pcsPageInfo");
const perTypeSelect = document.getElementById("perTypeSelect");
const perBrandSelect = document.getElementById("perBrandSelect");
const perModelSelect = document.getElementById("perModelSelect");
const adminPanel = document.getElementById("adminPanel");
const adminClubField = document.getElementById("adminClubField");
const adminClubSelect = document.getElementById("adminClubSelect");
const btnAdminLoad = document.getElementById("btnAdminLoad");
const adminClubForm = document.getElementById("adminClubForm");
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
const btnMe = document.getElementById("btnMe");
const btnLogout = document.getElementById("btnLogout");
let selectedClubId = null;
let selectedPcId = null;
let clubsPage = 1;
let pcsPage = 1;
let adminPcsPage = 1;
let adminTariffsPage = 1;

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

async function loadClubs() {
  ensureAuth();
  const fd = clubsFilterForm ? new FormData(clubsFilterForm) : null;
  const params = {
    q: fd ? fd.get("q") : "",
    price_gte: fd ? fd.get("price_gte") : "",
    price_lte: fd ? fd.get("price_lte") : "",
    has_photo: fd ? fd.get("has_photo") : "",
    order: fd ? fd.get("order") : "name",
    page: clubsPage,
    page_size: fd ? fd.get("page_size") : 10,
  };
  const clubs = await api(`/clubs/${buildQuery(params)}`, { auth: true });
  const pag = parsePaginated(clubs);
  renderList(
    clubsListEl,
    pag.results,
    (club) => `
      <div><strong>${club.name}</strong> (${club.address})</div>
      <div>Цена: ${club.price} | Телефон: ${club.phone || "-"}</div>
      <div>Фото: ${club.photo_url ? `<a href="${club.photo_url}" target="_blank" rel="noreferrer">ссылка</a>` : "нет"}</div>
      <div class="row">
        <button type="button" data-club-id="${club.id}" class="secondary">Выбрать клуб</button>
      </div>
    `
  );
  if (clubsPageInfo) clubsPageInfo.textContent = `стр. ${clubsPage}`;
  if (btnClubsPrev) btnClubsPrev.disabled = clubsPage <= 1;
  if (btnClubsNext) btnClubsNext.disabled = !pag.next;
}

async function loadPcFilters(clubId) {
  if (!clubId) return;
  const data = await api(`/pcs/filters/?club_id=${clubId}`, { auth: true });
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
    order: fd ? fd.get("order") : "number",
    page: pcsPage,
    page_size: fd ? fd.get("page_size") : 10,
  };
  const pcs = await api(`/pcs/${buildQuery(params)}`, { auth: true });
  const pag = parsePaginated(pcs);
  renderList(
    pcsListEl,
    pag.results,
    (pc) => `
      <div><strong>ПК #${pc.number}</strong> (${pc.status})</div>
      <div>CPU: ${pc.processor || "-"} | GPU: ${pc.gpu || "-"} | RAM: ${pc.ram || "-"}</div>
      <div>Накопитель: ${pc.storage_type || "-"} | Монитор: ${pc.monitor_model || "-"}</div>
      <div class="row">
        <button type="button" data-pc-id="${pc.id}" class="secondary">Выбрать ПК</button>
      </div>
    `
  );
  if (pcsPageInfo) pcsPageInfo.textContent = `стр. ${pcsPage}`;
  if (btnPcsPrev) btnPcsPrev.disabled = pcsPage <= 1;
  if (btnPcsNext) btnPcsNext.disabled = !pag.next;
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

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(authForm);
  const principal = String(fd.get("principal") || "user");
  const mode = String(fd.get("mode") || "login");
  const password = String(fd.get("password") || "");

  try {
    let tokens;
    if (principal === "admin") {
      if (mode === "register") {
        const payload = {
          email: String(fd.get("email") || "").trim(),
          username: String(fd.get("username") || "").trim(),
          password,
          club_id: Number(fd.get("club_id") || 0),
        };
        tokens = await api("/auth/admin-register/", { method: "POST", body: payload });
      } else {
        const payload = {
          login: String(fd.get("login") || "").trim(),
          password,
        };
        tokens = await api("/auth/admin-login/", { method: "POST", body: payload });
      }
    } else {
      if (mode === "register") {
        const payload = {
          email: String(fd.get("email") || "").trim(),
          username: String(fd.get("username") || "").trim(),
          phone: String(fd.get("phone") || "").trim(),
          password,
        };
        tokens = await api("/auth/register/", { method: "POST", body: payload });
      } else {
        const payload = {
          login: String(fd.get("login") || "").trim(),
          password,
        };
        tokens = await api("/auth/login/", { method: "POST", body: payload });
      }
    }
    setTokens(tokens);
    setPrincipal(principal);
    const me = principal === "admin" ? await api("/auth/admin-me/", { auth: true }) : await api("/auth/me/", { auth: true });
    setOut({ auth_ok: true, principal, mode, me });
    await refreshUi();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnLoadClubs?.addEventListener("click", async () => {
  try {
    clubsPage = 1;
    await loadClubs();
    setOut({ clubs_loaded: true });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

clubsFilterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    clubsPage = 1;
    await loadClubs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnClubsReset?.addEventListener("click", async () => {
  if (!clubsFilterForm) return;
  clubsFilterForm.reset();
  clubsPage = 1;
  try {
    await loadClubs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnClubsPrev?.addEventListener("click", async () => {
  if (clubsPage <= 1) return;
  clubsPage -= 1;
  try {
    await loadClubs();
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnClubsNext?.addEventListener("click", async () => {
  clubsPage += 1;
  try {
    await loadClubs();
  } catch (err) {
    clubsPage -= 1;
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
    pcsPage = 1;
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
    pcsPage = 1;
    await loadPcs(selectedClubId);
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnPcsReset?.addEventListener("click", async () => {
  if (!pcsFilterForm) return;
  pcsFilterForm.reset();
  if (!selectedClubId) return;
  pcsPage = 1;
  try {
    await loadPcFilters(selectedClubId);
    await loadPcs(selectedClubId);
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnPcsPrev?.addEventListener("click", async () => {
  if (!selectedClubId || pcsPage <= 1) return;
  pcsPage -= 1;
  try {
    await loadPcs(selectedClubId);
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnPcsNext?.addEventListener("click", async () => {
  if (!selectedClubId) return;
  pcsPage += 1;
  try {
    await loadPcs(selectedClubId);
  } catch (err) {
    pcsPage -= 1;
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

async function refreshUi() {
  const principal = getPrincipal();
  const authed = Boolean(getAccessToken());
  if (adminPanel) adminPanel.style.display = authed && principal === "admin" ? "block" : "none";
}

async function loadAdminClubOptions() {
  try {
    const data = await api("/clubs/?order=name&page_size=100", { auth: true });
    const pag = parsePaginated(data);
    if (!adminClubSelect) return;
    adminClubSelect.innerHTML = "";
    pag.results.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = String(c.id);
      opt.textContent = `${c.name} (#${c.id})`;
      adminClubSelect.appendChild(opt);
    });
  } catch (err) {
    // ignore
  }
}

authForm?.addEventListener("change", async () => {
  if (!authForm) return;
  const fd = new FormData(authForm);
  const principal = String(fd.get("principal") || "user");
  const mode = String(fd.get("mode") || "login");
  if (adminClubField) adminClubField.style.display = principal === "admin" && mode === "register" ? "grid" : "none";
  if (principal === "admin" && mode === "register") {
    await loadAdminClubOptions();
  }
});

btnAdminLoad?.addEventListener("click", async () => {
  try {
    await adminLoadClub();
    adminPcsPage = 1;
    adminTariffsPage = 1;
    await adminLoadPcs();
    await adminLoadTariffs();
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

adminPcCreateForm?.addEventListener("submit", async (e) => {
  try {
    await adminCreatePc(e);
  } catch (err) {
    setOut({ error: true, ...err });
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
  clubsPage = 1;
  pcsPage = 1;
  adminPcsPage = 1;
  adminTariffsPage = 1;
  clubsListEl.innerHTML = "";
  pcsListEl.innerHTML = "";
  slotsListEl.innerHTML = "";
  if (adminPcsListEl) adminPcsListEl.innerHTML = "";
  if (adminTariffsListEl) adminTariffsListEl.innerHTML = "";
  if (adminPanel) adminPanel.style.display = "none";
  setOut("Токены удалены из localStorage.");
});

// show current state on load
if (getAccessToken()) {
  setOut("Токен найден в localStorage. Нажмите «Проверить /me».");
} else {
  setOut("Токена нет. Зарегистрируйтесь.");
}

refreshUi();

