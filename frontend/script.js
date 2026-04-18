const API_BASE = "http://127.0.0.1:8000/api";

const outEl = document.getElementById("out");
const form = document.getElementById("registerForm");
const btnMe = document.getElementById("btnMe");
const btnLogout = document.getElementById("btnLogout");

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

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = {
    email: String(fd.get("email") || "").trim(),
    username: String(fd.get("username") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    password: String(fd.get("password") || ""),
  };

  try {
    const tokens = await api("/auth/register/", { method: "POST", body: payload });
    setTokens(tokens);
    const me = await api("/auth/me/", { auth: true });
    setOut({ registered: true, me });
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
  setOut("Токены удалены из localStorage.");
});

// show current state on load
if (getAccessToken()) {
  setOut("Токен найден в localStorage. Нажмите «Проверить /me».");
} else {
  setOut("Токена нет. Зарегистрируйтесь.");
}

