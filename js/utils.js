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

/** Render custom skeleton loaders / shimmer screens */
export function renderSkeleton(rootNode, templateType = "card") {
  clearNode(rootNode);
  if (templateType === "dashboard") {
    const items = el("div", { style: "width:100%" }, [
      el("div", { class: "shimmer-card", style: "margin-bottom:16px" }, [
        el("div", { class: "shimmer-elem shimmer-title" }),
        el("div", { class: "shimmer-elem shimmer-line half" }),
      ]),
      el("div", { class: "grid grid-3" }, [
        el("div", { class: "shimmer-card" }, [
          el("div", { class: "shimmer-elem shimmer-title" }),
          el("div", { class: "shimmer-elem shimmer-line" }),
        ]),
        el("div", { class: "shimmer-card" }, [
          el("div", { class: "shimmer-elem shimmer-title" }),
          el("div", { class: "shimmer-elem shimmer-line" }),
        ]),
        el("div", { class: "shimmer-card" }, [
          el("div", { class: "shimmer-elem shimmer-title" }),
          el("div", { class: "shimmer-elem shimmer-line" }),
        ]),
      ]),
      el("div", { class: "grid grid-2", style: "margin-top:16px" }, [
        el("div", { class: "shimmer-card" }, [
          el("div", { class: "shimmer-elem shimmer-title" }),
          el("div", { class: "shimmer-elem shimmer-line" }),
          el("div", { class: "shimmer-elem shimmer-line" }),
        ]),
        el("div", { class: "shimmer-card" }, [
          el("div", { class: "shimmer-elem shimmer-title" }),
          el("div", { class: "shimmer-elem shimmer-line" }),
          el("div", { class: "shimmer-elem shimmer-line" }),
        ]),
      ])
    ]);
    rootNode.appendChild(items);
  } else if (templateType === "table") {
    const tableShimmer = el("div", { class: "shimmer-card" }, [
      el("div", { class: "shimmer-elem shimmer-title", style: "width: 15%" }),
      el("div", { style: "display:flex; flex-direction:column; gap:10px; margin-top:20px" }, [
        el("div", { style: "display:flex; gap:10px" }, [
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
        ]),
        el("div", { style: "display:flex; gap:10px" }, [
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
        ]),
        el("div", { style: "display:flex; gap:10px" }, [
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
          el("div", { class: "shimmer-elem shimmer-line", style: "flex:1" }),
        ]),
      ])
    ]);
    rootNode.appendChild(tableShimmer);
  } else {
    const cardShimmer = el("div", { class: "shimmer-card" }, [
      el("div", { class: "shimmer-elem shimmer-title" }),
      el("div", { class: "shimmer-elem shimmer-line" }),
      el("div", { class: "shimmer-elem shimmer-line half" }),
    ]);
    rootNode.appendChild(cardShimmer);
  }
}

/** CSV Exporter utility */
export function exportToCSV(filename, headers, rows) {
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [];
  csvRows.push(headers.map(escapeCSV).join(','));
  for (const row of rows) {
    csvRows.push(row.map(escapeCSV).join(','));
  }

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

