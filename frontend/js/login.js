import { api, fetchAllPages, formatApiError, setPrincipal, setTokens } from "./api.js";
import { initLayout, redirectIfAuthed } from "./nav.js";
import { showToast } from "./ui.js";

initLayout({ active: "./login.html" });
redirectIfAuthed();

const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authHint = document.getElementById("authHint");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const adminClubSelect = document.getElementById("adminClubSelect");

let clubsLoaded = false;

function parseShowRules(el) {
  return (el.dataset.show || "").trim().split(/\s+/).filter(Boolean);
}

function fieldVisible(rules, { isLogin, isRegister, isUser, isAdmin }) {
  if (!rules.length) return true;
  let ok = true;
  if (rules.includes("login")) ok = ok && isLogin;
  if (rules.includes("register")) ok = ok && isRegister;
  if (rules.includes("user")) ok = ok && isUser;
  if (rules.includes("admin")) ok = ok && isAdmin;
  return ok;
}

function setFieldRequired(el, required) {
  const optional = el.hasAttribute("data-optional");
  el.querySelectorAll("input, select, textarea").forEach((input) => {
    if (optional || !required) input.removeAttribute("required");
    else input.setAttribute("required", "");
  });
}

async function loadAdminClubOptions() {
  if (!adminClubSelect || clubsLoaded) return;
  try {
    const clubs = await fetchAllPages("/clubs/", { order: "name" });
    clubs.forEach((club) => {
      const opt = document.createElement("option");
      opt.value = String(club.id);
      opt.textContent = `${club.name} — ${club.address || ""}`.trim();
      adminClubSelect.appendChild(opt);
    });
    clubsLoaded = true;
  } catch {
    showToast("Не удалось загрузить список клубов", "error");
  }
}

function syncAuthFormUi() {
  if (!authForm) return;

  const fd = new FormData(authForm);
  const principal = String(fd.get("principal") || "user");
  const mode = String(fd.get("mode") || "login");
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isUser = principal === "user";
  const isAdmin = principal === "admin";
  const ctx = { isLogin, isRegister, isUser, isAdmin };

  authForm.querySelectorAll("[data-show]").forEach((el) => {
    const visible = fieldVisible(parseShowRules(el), ctx);
    el.classList.toggle("auth-hidden", !visible);
    const needsRequired = visible && (isRegister ? el.dataset.show.includes("register") : el.dataset.show.includes("login"));
    setFieldRequired(el, needsRequired);
  });

  if (isRegister && isAdmin) {
    loadAdminClubOptions();
    if (adminClubSelect) adminClubSelect.setAttribute("required", "");
  } else if (adminClubSelect) {
    adminClubSelect.removeAttribute("required");
  }

  if (isRegister) {
    authTitle.textContent = isAdmin ? "Регистрация администратора" : "Регистрация";
    authSubtitle.textContent = isAdmin
      ? "Создайте аккаунт для управления клубом."
      : "Заполните данные для бронирования мест.";
    authHint.textContent = "Все поля с пометкой обязательны, кроме телефона.";
    authSubmitBtn.textContent = "Зарегистрироваться";
    authForm.querySelector('[name="password"]')?.setAttribute("autocomplete", "new-password");
  } else {
    authTitle.textContent = isAdmin ? "Вход администратора" : "Вход";
    authSubtitle.textContent = "Введите логин и пароль.";
    authHint.textContent = "Логин — это email или username, указанный при регистрации.";
    authSubmitBtn.textContent = "Войти";
    authForm.querySelector('[name="password"]')?.setAttribute("autocomplete", "current-password");
  }

  const loginInput = authForm.querySelector('[name="login"]');
  if (loginInput) {
    if (isLogin) loginInput.setAttribute("required", "");
    else loginInput.removeAttribute("required");
  }
}

authForm?.addEventListener("change", syncAuthFormUi);
authForm?.addEventListener("input", syncAuthFormUi);

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(authForm);
  const principal = String(fd.get("principal") || "user");
  const mode = String(fd.get("mode") || "login");
  const password = String(fd.get("password") || "");
  const passwordConfirm = String(fd.get("password_confirm") || "");

  if (mode === "register" && password !== passwordConfirm) {
    showToast("Пароли не совпадают", "error");
    return;
  }

  try {
    let tokens;
    if (principal === "admin") {
      if (mode === "register") {
        const clubIdRaw = String(fd.get("club_id") || "").trim();
        tokens = await api("/auth/admin-register/", {
          method: "POST",
          body: {
            email: String(fd.get("email") || "").trim(),
            username: String(fd.get("username") || "").trim(),
            password,
            club_id: clubIdRaw ? Number(clubIdRaw) : null,
          },
        });
      } else {
        tokens = await api("/auth/admin-login/", {
          method: "POST",
          body: { login: String(fd.get("login") || "").trim(), password },
        });
      }
    } else if (mode === "register") {
      tokens = await api("/auth/register/", {
        method: "POST",
        body: {
          email: String(fd.get("email") || "").trim(),
          username: String(fd.get("username") || "").trim(),
          phone: String(fd.get("phone") || "").trim() || undefined,
          password,
        },
      });
    } else {
      tokens = await api("/auth/login/", {
        method: "POST",
        body: { login: String(fd.get("login") || "").trim(), password },
      });
    }

    setTokens(tokens);
    setPrincipal(principal);
    showToast("Добро пожаловать!", "success");
    window.location.href = principal === "admin" ? "./admin.html" : "./clubs.html";
  } catch (err) {
    showToast(formatApiError(err), "error");
  }
});

syncAuthFormUi();
