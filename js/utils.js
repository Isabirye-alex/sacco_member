export function formatMoney(value) {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-UG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function titleCase(value) {
  if (!value) return "";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Minimal, dependency-free element builder. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null && value !== false) {
      node.setAttribute(key, value === true ? "" : value);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const child of kids) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === "string" || typeof child === "number" ? document.createTextNode(child) : child);
  }
  return node;
}

export function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (["active", "approved", "disbursed", "closed", "accepted", "sent", "reconciled"].includes(s)) return "badge badge-success";
  if (["pending", "under_review", "queued", "draft"].includes(s)) return "badge badge-warn";
  if (["rejected", "defaulted", "declined", "failed", "exception", "suspended", "exited"].includes(s)) return "badge badge-danger";
  return "badge badge-neutral";
}

export function badge(status) {
  return el("span", { class: statusBadgeClass(status) }, titleCase(status));
}

export function showToast(message, type = "default") {
  const root = document.getElementById("toast-root");
  const toast = el("div", { class: `toast ${type === "error" ? "error" : type === "success" ? "success" : ""}` }, message);
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(rootNode, children) {
  clearNode(rootNode);
  const kids = Array.isArray(children) ? children : [children];
  kids.forEach((child) => child && rootNode.appendChild(child));
}

/**
 * Renders a modal dialog. `buildBody(closeFn)` returns an array of child
 * nodes for the modal body; call closeFn() to dismiss programmatically.
 */
export function openModal(title, buildBody) {
  const backdrop = el("div", { class: "modal-backdrop" });
  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  const modal = el("div", { class: "modal" }, [el("h3", {}, title), ...buildBody(close)]);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  return close;
}
