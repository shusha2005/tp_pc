export function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${n.toFixed(0)} ₽`;
}

export function fillSelect(selectEl, values, emptyLabel) {
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

export function renderList(target, items, renderItem) {
  if (!target) return;
  target.innerHTML = "";
  if (!items.length) {
    target.innerHTML = '<div class="empty-state">Ничего не найдено</div>';
    return;
  }
  items.forEach((item) => {
    const el = document.createElement("article");
    el.className = "list-card";
    el.innerHTML = renderItem(item);
    target.appendChild(el);
  });
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}
