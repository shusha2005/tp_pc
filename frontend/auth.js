const API_BASE = "http://127.0.0.1:8000/api";

const outEl = document.getElementById("out");
const authForm = document.getElementById("authForm");
const adminClubField = document.getElementById("adminClubField");
const adminClubSelect = document.getElementById("adminClubSelect");
const btnGoApp = document.getElementById("btnGoApp");

function setOut(value) {
  outEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function toLogError(err) {
  if (err && typeof err === "object") {
    if ("status" in err || "data" in err) return { error: true, ...err };
    if ("message" in err) return { error: true, message: err.message };
  }
  return { error: true, message: String(err) };
}

function setPrincipal(value) {
  localStorage.setItem("principal", value);
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
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

  if (!res.ok) throw { status: res.status, data };
  return data;
}

function parsePaginated(data) {
  if (data && Array.isArray(data.results)) return data.results;
  return Array.isArray(data) ? data : [];
}

async function loadAdminClubOptions() {
  if (!adminClubSelect) return;
  adminClubSelect.innerHTML = "";
}

async function syncAuthFormUi() {
  if (!authForm) return;
  const fd = new FormData(authForm);
  const principal = String(fd.get("principal") || "user");
  if (adminClubField) adminClubField.style.display = "none";
  if (principal === "admin") await loadAdminClubOptions();
}

authForm?.addEventListener("change", async () => {
  try {
    await syncAuthFormUi();
  } catch (err) {
    setOut(toLogError(err));
  }
});

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
        tokens = await api("/auth/admin-register/", {
          method: "POST",
          body: {
            email: String(fd.get("email") || "").trim(),
            username: String(fd.get("username") || "").trim(),
            password,
          },
        });
      } else {
        tokens = await api("/auth/admin-login/", {
          method: "POST",
          body: { login: String(fd.get("login") || "").trim(), password },
        });
      }
    } else {
      if (mode === "register") {
        tokens = await api("/auth/register/", {
          method: "POST",
          body: {
            email: String(fd.get("email") || "").trim(),
            username: String(fd.get("username") || "").trim(),
            phone: String(fd.get("phone") || "").trim(),
            password,
          },
        });
      } else {
        tokens = await api("/auth/login/", {
          method: "POST",
          body: { login: String(fd.get("login") || "").trim(), password },
        });
      }
    }

    setTokens(tokens);
    setPrincipal(principal);
    setOut({ ok: true, principal, mode });
    window.location.href = "./app.html";
  } catch (err) {
    setOut(toLogError(err));
  }
});

if (btnGoApp) {
  btnGoApp.addEventListener("click", (e) => {
    if (!getAccessToken()) {
      e.preventDefault();
      setOut("Сначала выполните вход/регистрацию.");
    }
  });
}

syncAuthFormUi();
if (getAccessToken()) {
  setOut("Токен найден. Можно открыть кабинет.");
} else {
  setOut("Введите данные для входа или регистрации.");
}

