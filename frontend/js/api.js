const API_BASE = "http://127.0.0.1:8000/api";

export function getAccessToken() {
  return localStorage.getItem("access_token");
}

export function getPrincipal() {
  return localStorage.getItem("principal") || "user";
}

export function setPrincipal(value) {
  localStorage.setItem("principal", value);
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("principal");
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function parsePaginated(data) {
  if (data && Array.isArray(data.results)) {
    return {
      isPaginated: true,
      results: data.results,
      count: data.count,
      next: data.next,
      previous: data.previous,
    };
  }
  return {
    isPaginated: false,
    results: Array.isArray(data) ? data : [],
    count: null,
    next: null,
    previous: null,
  };
}

export function buildQuery(params) {
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

export async function api(path, { method = "GET", body, auth = false } = {}) {
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

export async function fetchAllPages(path, params, { auth = false, pageSize = 100 } = {}) {
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

export async function adminApi(path, opts = {}) {
  return api(`/admin/${path}`, { ...opts, auth: true });
}

export function ensureAuth() {
  if (!getAccessToken()) {
    throw { status: 401, data: { detail: "Требуется авторизация." } };
  }
}

export function formatApiError(err) {
  if (!err || typeof err !== "object") return String(err);
  const data = err.data;
  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);
  if (data?.non_field_errors) return data.non_field_errors.join(", ");
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("; ");
  }
  return `Ошибка ${err.status || ""}`;
}
