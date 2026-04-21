const API_BASE = "http://127.0.0.1:8000/api";

const outEl = document.getElementById("out");
const authForm = document.getElementById("authForm");
const slotsForm = document.getElementById("slotsForm");
const clubsListEl = document.getElementById("clubsList");
const pcsListEl = document.getElementById("pcsList");
const slotsListEl = document.getElementById("slotsList");
const btnLoadClubs = document.getElementById("btnLoadClubs");
const btnMe = document.getElementById("btnMe");
const btnLogout = document.getElementById("btnLogout");
let selectedClubId = null;
let selectedPcId = null;

function setOut(value) {
  outEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function getAccessToken() {
  return localStorage.getItem("access_token");
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
  const clubs = await api("/clubs/?order=name", { auth: true });
  renderList(
    clubsListEl,
    clubs.results || clubs,
    (club) => `
      <div><strong>${club.name}</strong> (${club.address})</div>
      <div>Цена: ${club.price} | Телефон: ${club.phone || "-"}</div>
      <div>Фото: ${club.photo_url ? `<a href="${club.photo_url}" target="_blank" rel="noreferrer">ссылка</a>` : "нет"}</div>
      <div class="row">
        <button type="button" data-club-id="${club.id}" class="secondary">Выбрать клуб</button>
      </div>
    `
  );
}

async function loadPcs(clubId) {
  ensureAuth();
  const pcs = await api(`/pcs/?club_id=${clubId}&order=number`, { auth: true });
  renderList(
    pcsListEl,
    pcs.results || pcs,
    (pc) => `
      <div><strong>ПК #${pc.number}</strong> (${pc.status})</div>
      <div>CPU: ${pc.processor || "-"} | GPU: ${pc.gpu || "-"} | RAM: ${pc.ram || "-"}</div>
      <div>Накопитель: ${pc.storage_type || "-"} | Монитор: ${pc.monitor_model || "-"}</div>
      <div class="row">
        <button type="button" data-pc-id="${pc.id}" class="secondary">Выбрать ПК</button>
      </div>
    `
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

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(authForm);
  const mode = String(fd.get("mode") || "login");
  const password = String(fd.get("password") || "");

  try {
    let tokens;
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
    setTokens(tokens);
    const me = await api("/auth/me/", { auth: true });
    setOut({ auth_ok: true, mode, me });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnLoadClubs?.addEventListener("click", async () => {
  try {
    await loadClubs();
    setOut({ clubs_loaded: true });
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

btnMe?.addEventListener("click", async () => {
  try {
    const me = await api("/auth/me/", { auth: true });
    setOut({ me });
  } catch (err) {
    setOut({ error: true, ...err });
  }
});

btnLogout?.addEventListener("click", () => {
  clearTokens();
  selectedClubId = null;
  selectedPcId = null;
  clubsListEl.innerHTML = "";
  pcsListEl.innerHTML = "";
  slotsListEl.innerHTML = "";
  setOut("Токены удалены из localStorage.");
});

// show current state on load
if (getAccessToken()) {
  setOut("Токен найден в localStorage. Нажмите «Проверить /me».");
} else {
  setOut("Токена нет. Зарегистрируйтесь.");
}

