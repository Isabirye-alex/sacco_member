import { login, logout, isAuthenticated, loadCurrentUser, getCurrentUser } from "./auth.js";
import { registerRoute, startRouter, goTo, refreshCurrentRoute } from "./router.js";
import { showToast, titleCase, el, openModal, clearNode } from "./utils.js";
import { API_BASE_URL } from "./config.js";

import { renderDashboard } from "./views/dashboard.js";
import { renderSavings } from "./views/savings.js";
import { renderLoans } from "./views/loans.js";
import { renderShares } from "./views/shares.js";
import { renderGroups } from "./views/groups.js";
import { renderNotifications } from "./views/notifications.js";
import { renderProfile } from "./views/profile.js";
import { renderTools } from "./views/tools.js";

registerRoute("/dashboard", "Dashboard", renderDashboard);
registerRoute("/savings", "Savings", renderSavings);
registerRoute("/loans", "Loans", renderLoans);
registerRoute("/shares", "Shares", renderShares);
registerRoute("/groups", "Groups", renderGroups);
registerRoute("/notifications", "Notifications", renderNotifications);
registerRoute("/tools", "Member Tools", renderTools);
registerRoute("/profile", "My Profile", renderProfile);

function renderUserChip() {
  const user = getCurrentUser();
  const chip = document.getElementById("user-chip");
  if (!user) return;
  chip.innerHTML = "";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = user.full_name;
  const role = document.createElement("span");
  role.className = "role";
  role.textContent = titleCase(user.role);
  chip.appendChild(name);
  chip.appendChild(role);
}

async function bootstrap() {
  initTheme();
  initGlobalSearch();
  initConnectivityMonitor();
  initForgotPassword();
  initLockScreen();
  initChatbot();
  initInactivityMonitor();

  if (isAuthenticated()) {
    try {
      await loadCurrentUser();
      renderUserChip();
    } catch {
      logout();
    }
  }
  startRouter();
}

/* ── Theme Switcher ─────────────────────────────────────── */
function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (!toggleBtn) return;
  const currentTheme = localStorage.getItem("sacco_theme") || "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeButton(currentTheme);
  toggleBtn.addEventListener("click", () => {
    const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sacco_theme", theme);
    updateThemeButton(theme);
    showToast(`Switched to ${theme} mode`, "success");
  });
}

function updateThemeButton(theme) {
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (!toggleBtn) return;
  const icon = toggleBtn.querySelector(".theme-icon");
  const label = toggleBtn.querySelector(".theme-label");
  if (theme === "dark") {
    icon.innerHTML = '<i class="fa-solid fa-moon"></i>';
    label.textContent = "Dark Mode";
  } else {
    icon.innerHTML = '<i class="fa-solid fa-sun"></i>';
    label.textContent = "Light Mode";
  }
}

/* ── Global Search ────────────────────────────────────────── */
const SEARCHABLE_ROUTES = [
  { path: "/dashboard", label: "Dashboard", icon: "dashboard", keywords: ["home", "overview", "summary"] },
  { path: "/savings", label: "Savings", icon: "savings", keywords: ["accounts", "deposit", "withdraw", "balance"] },
  { path: "/loans", label: "Loans", icon: "request_quote", keywords: ["apply", "borrow", "repayment", "guarantor"] },
  { path: "/shares", label: "Shares", icon: "trending_up", keywords: ["dividends", "holdings"] },
  { path: "/groups", label: "Groups", icon: "groups", keywords: ["table banking", "contributions", "chama"] },
  { path: "/notifications", label: "Notifications", icon: "notifications", keywords: ["alerts", "sms", "email", "preferences"] },
  { path: "/tools", label: "Member Tools", icon: "construction", keywords: ["calculator", "budget", "journal", "currency", "health", "goals"] },
  { path: "/profile", label: "My Profile", icon: "person", keywords: ["password", "settings", "account", "beneficiary", "rating"] },
];

function initGlobalSearch() {
  const input = document.getElementById("global-search");
  const dropdown = document.getElementById("global-search-results");
  if (!input || !dropdown) return;

  let activeIndex = -1;
  let currentResults = [];

  function closeDropdown() {
    dropdown.hidden = true;
    dropdown.innerHTML = "";
    activeIndex = -1;
    currentResults = [];
  }

  function renderResults(results, query) {
    dropdown.innerHTML = "";
    currentResults = results;
    activeIndex = -1;

    if (!results.length) {
      dropdown.appendChild(el("div", { class: "search-empty" }, `No results for "${query}"`));
      dropdown.hidden = false;
      return;
    }

    results.forEach((r, idx) => {
      const item = el("a", { class: "search-result-item", href: `#${r.path}`, "data-index": idx }, [
        el("span", { class: "material-symbols-rounded" }, r.icon),
        el("div", {}, [
          el("div", { class: "sr-label" }, r.label),
          el("div", { class: "sr-sub" }, r.keywords.slice(0, 3).join(" • ") || "Navigate"),
        ]),
      ]);
      item.addEventListener("click", (e) => {
        e.preventDefault();
        goTo(r.path);
        refreshCurrentRoute();
        input.value = "";
        closeDropdown();
      });
      dropdown.appendChild(item);
    });
    dropdown.hidden = false;
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { closeDropdown(); return; }

    const matches = SEARCHABLE_ROUTES.filter((r) => {
      if (r.label.toLowerCase().includes(q)) return true;
      return r.keywords.some((k) => k.includes(q));
    });
    renderResults(matches, q);
  });

  input.addEventListener("keydown", (e) => {
    if (!currentResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % currentResults.length;
      updateActiveItem();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
      updateActiveItem();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < currentResults.length) {
        const r = currentResults[activeIndex];
        goTo(r.path);
        refreshCurrentRoute();
        input.value = "";
        closeDropdown();
      }
    } else if (e.key === "Escape") {
      input.value = "";
      closeDropdown();
      input.blur();
    }
  });

  function updateActiveItem() {
    const items = dropdown.querySelectorAll(".search-result-item");
    items.forEach((it, idx) => {
      it.classList.toggle("active", idx === activeIndex);
    });
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".global-search-wrap")) {
      closeDropdown();
    }
  });

  window.addEventListener("hashchange", () => {
    input.value = "";
    closeDropdown();
  });
}

/* ── Connectivity Monitor ───────────────────────────────── */
function initConnectivityMonitor() {
  const indicator = document.getElementById("connection-indicator");
  if (!indicator) return;
  const text = indicator.querySelector(".text");

  function setStatus(online) {
    if (online) {
      indicator.className = "conn-badge online";
      text.textContent = "Connected";
    } else {
      indicator.className = "conn-badge offline";
      text.textContent = "Offline";
    }
  }

  window.addEventListener("online", () => { showToast("Internet connection restored.", "success"); checkApi(); });
  window.addEventListener("offline", () => { showToast("Internet connection lost.", "error"); setStatus(false); });

  async function checkApi() {
    if (!window.navigator.onLine) { setStatus(false); return; }
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, { method: "GET", signal: controller.signal });
      clearTimeout(id);
      setStatus(res.status === 200 || res.status === 401);
    } catch { setStatus(false); }
  }

  checkApi();
  setInterval(checkApi, 20000);
}

/* ── Forgot Password ────────────────────────────────────── */
function initForgotPassword() {
  const link = document.getElementById("forgot-password-link");
  if (!link) return;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    openModal("Reset Password", (closeFn) => {
      const emailInput = el("input", { type: "email", required: true, placeholder: "Enter your registered email", style: "width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
      const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "send"), " Send Reset Link"]);
      const container = el("div", {}, [
        el("p", { class: "muted" }, "Enter your email address and we'll send you a password reset code."),
        el("form", {}, [
          el("div", { class: "field" }, [el("label", {}, "Email address"), emailInput]),
          el("div", { class: "modal-actions" }, [
            el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
            submitBtn,
          ])
        ])
      ]);
      container.querySelector("form").addEventListener("submit", (ev) => {
        ev.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
        setTimeout(() => {
          showToast("A mock reset code has been sent to your email.", "success");
          renderVerificationStage(container, emailInput.value, closeFn);
        }, 1200);
      });
      return [container];
    });
  });
}

function renderVerificationStage(container, email, closeFn) {
  clearNode(container);
  const codeInput = el("input", { type: "text", required: true, placeholder: "e.g. 123456", maxlength: "6", style: "width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const newPassInput = el("input", { type: "password", required: true, placeholder: "Min 8 characters", minlength: 8, style: "width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "lock_reset"), " Reset Password"]);
  const form = el("form", {}, [
    el("p", { class: "muted" }, `Enter the 6-digit code sent to ${email} and your new password.`),
    el("div", { class: "field" }, [el("label", {}, "Verification Code"), codeInput]),
    el("div", { class: "field" }, [el("label", {}, "New Password"), newPassInput]),
    el("div", { class: "modal-actions" }, [
      el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
      submitBtn,
    ])
  ]);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating…';
    setTimeout(() => {
      showToast("Password updated successfully! You can now log in.", "success");
      closeFn();
    }, 1500);
  });
  container.appendChild(form);
}

/* ── F20: Session Lock Screen ────────────────────────────── */
const LOCK_PIN = "1234";
let currentPin = "";

function initLockScreen() {
  const lockBtn = document.getElementById("lock-session-btn");
  if (lockBtn) lockBtn.addEventListener("click", lockSession);

  const padBtns = document.querySelectorAll(".pin-btn[data-digit]");
  const clearBtn = document.getElementById("pin-clear");

  padBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentPin.length >= 4) return;
      currentPin += btn.dataset.digit;
      updatePinDisplay();
      if (currentPin.length === 4) {
        setTimeout(checkPin, 200);
      }
    });
  });

  if (clearBtn) clearBtn.addEventListener("click", () => {
    currentPin = currentPin.slice(0, -1);
    updatePinDisplay();
    hidePinError();
  });
}

function updatePinDisplay() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pd${i}`);
    if (!dot) continue;
    dot.classList.toggle("filled", i < currentPin.length);
    dot.classList.remove("error");
  }
}

function checkPin() {
  if (currentPin === LOCK_PIN) {
    unlockSession();
  } else {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pd${i}`);
      if (dot) { dot.classList.add("error"); dot.classList.remove("filled"); }
    }
    const errEl = document.getElementById("pin-error");
    if (errEl) { errEl.hidden = false; errEl.style.animation = "none"; void errEl.offsetWidth; errEl.style.animation = ""; }
    currentPin = "";
    setTimeout(() => {
      updatePinDisplay();
      hidePinError();
    }, 1800);
  }
}

function hidePinError() {
  const errEl = document.getElementById("pin-error");
  if (errEl) errEl.hidden = true;
}

export function lockSession() {
  const lockScreen = document.getElementById("lock-screen");
  if (!lockScreen) return;
  currentPin = "";
  updatePinDisplay();
  hidePinError();
  lockScreen.hidden = false;
  showToast("Session locked. Enter PIN to resume.", "warn");
}

function unlockSession() {
  const lockScreen = document.getElementById("lock-screen");
  if (lockScreen) lockScreen.hidden = true;
  currentPin = "";
  showToast("Session unlocked. Welcome back! 🔓", "success");
  resetInactivityTimer();
}

/* ── Inactivity Monitor (auto-lock after 5 min) ─────────── */
let inactivityTimer = null;
const INACTIVITY_MS = 5 * 60 * 1000;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  if (!isAuthenticated()) return;
  inactivityTimer = setTimeout(() => {
    const lockScreen = document.getElementById("lock-screen");
    if (lockScreen && lockScreen.hidden) {
      lockSession();
    }
  }, INACTIVITY_MS);
}

function initInactivityMonitor() {
  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}

/* ── F11: SACCO Virtual Chatbot ─────────────────────────── */
const BOT_RESPONSES = {
  savings: "Your savings section shows all your accounts and balances. Navigate to Savings to see full transaction history. 💰",
  loan: "You can apply for a loan in the Loans section. Your eligibility is based on your savings balance. 📝",
  loans: "You can apply for a loan in the Loans section. Your eligibility is based on your savings balance. 📝",
  share: "Shares are purchased through a SACCO staff member. You can view your current share holdings in the Shares section. 📊",
  shares: "Shares are purchased through a SACCO staff member. You can view your current share holdings in the Shares section. 📊",
  group: "View your table banking groups and personal contributions in the Groups section. 👥",
  groups: "View your table banking groups and personal contributions in the Groups section. 👥",
  dividend: "Dividends are paid annually based on your share holdings. Use the Dividends Simulator in Member Tools to project your returns! 📈",
  rate: "SACCO loan interest rates typically range from 12% to 24% per annum. Check the loan calculator in Member Tools! 📊",
  interest: "SACCO loan interest rates typically range from 12% to 24% per annum. Check the loan calculator in Member Tools! 📊",
  tools: "Member Tools is your personal financial toolkit — it has a Loan Calculator, Savings Goals, Currency Converter, Budget Planner, and more. 🛠️",
  password: "You can change your password in the Profile section under 'Security'. 🔐",
  contact: "For assistance, contact your SACCO branch or visit the nearest office during working hours. 📞",
  pin: "Your default session lock PIN is 1234. Use the Lock Session button in the sidebar to protect your account. 🔒",
  help: "I can help with: savings, loans, shares, groups, dividends, interest rates, tools, password, PIN. What would you like to know?",
};
const DEFAULT_RESPONSES = [
  "I'm not sure about that! Try asking about savings, loans, shares, or tools. 🤔",
  "That's a great question! For detailed answers, please contact your SACCO branch. 📞",
  "I can help with savings, loans, shares, groups, and Member Tools. Try one of those! 😊",
];

function initChatbot() {
  const widget = document.getElementById("chatbot-widget");
  const panel = document.getElementById("chatbot-panel");
  const toggle = document.getElementById("chatbot-toggle");
  const closeBtn = document.getElementById("chatbot-close");
  const input = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");
  const messages = document.getElementById("chatbot-messages");

  if (!widget) return;

  // Show chatbot only when authenticated
  function updateChatbotVisibility() {
    widget.hidden = !isAuthenticated();
  }
  updateChatbotVisibility();
  window.addEventListener("hashchange", updateChatbotVisibility);

  toggle.addEventListener("click", () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    toggle.innerHTML = isOpen
      ? '<i class="fa-solid fa-robot"></i>'
      : '<i class="fa-solid fa-xmark"></i>';
  });

  closeBtn.addEventListener("click", () => {
    panel.hidden = true;
    toggle.innerHTML = '<i class="fa-solid fa-robot"></i>';
  });

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    // User bubble
    const userBubble = el("div", { class: "chat-msg user-msg" }, [
      el("span", {}, text)
    ]);
    messages.appendChild(userBubble);
    input.value = "";
    messages.scrollTop = messages.scrollHeight;

    // Typing indicator
    const typingEl = el("div", { class: "chat-msg bot-msg" }, [
      el("i", { class: "fa-solid fa-robot chat-avatar" }),
      el("span", { style: "color:var(--ink-400);font-style:italic;" }, "Typing…")
    ]);
    messages.appendChild(typingEl);
    messages.scrollTop = messages.scrollHeight;

    setTimeout(() => {
      typingEl.remove();
      const lower = text.toLowerCase();
      let response = DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
      for (const [key, val] of Object.entries(BOT_RESPONSES)) {
        if (lower.includes(key)) { response = val; break; }
      }
      const botBubble = el("div", { class: "chat-msg bot-msg" }, [
        el("i", { class: "fa-solid fa-robot chat-avatar" }),
        el("span", {}, response)
      ]);
      messages.appendChild(botBubble);
      messages.scrollTop = messages.scrollHeight;
    }, 900);
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
}

/* ── Login Form ─────────────────────────────────────────── */
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…';

  try {
    await login(email, password);
    renderUserChip();
    goTo("/dashboard");
    refreshCurrentRoute();
    showToast(`Welcome back, ${getCurrentUser().full_name.split(" ")[0]}! 👋`, "success");
  } catch (err) {
    errorEl.textContent = err.message || "Unable to sign in.";
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:15px;vertical-align:-2px;margin-right:4px;">login</span> Sign in';
  }
});

document.getElementById("logout-btn").addEventListener("click", () => { logout(); });

const footerYear = document.getElementById("footer-year");
if (footerYear) footerYear.textContent = new Date().getFullYear();

document.getElementById("menu-toggle").addEventListener("click", () => {
  const sidebar = document.querySelector(".sidebar");
  const appShell = document.getElementById("app-shell");
  const overlay = document.getElementById("sidebar-overlay");
  sidebar.classList.toggle("open");
  if (window.innerWidth <= 780) {
    appShell.classList.toggle("sidebar-open");
    if (overlay) {
      overlay.classList.toggle("visible");
      if (sidebar.classList.contains("open")) {
        overlay.style.pointerEvents = "auto";
      } else {
        overlay.style.pointerEvents = "none";
      }
    }
  }
});

document.getElementById("sidebar-overlay")?.addEventListener("click", () => {
  const sidebar = document.querySelector(".sidebar");
  const appShell = document.getElementById("app-shell");
  sidebar.classList.remove("open");
  appShell.classList.remove("sidebar-open");
  const overlay = document.getElementById("sidebar-overlay");
  if (overlay) overlay.classList.remove("visible");
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 780) {
    const sidebar = document.querySelector(".sidebar");
    const appShell = document.getElementById("app-shell");
    sidebar.classList.remove("open");
    appShell.classList.remove("sidebar-open");
    const overlay = document.getElementById("sidebar-overlay");
    if (overlay) overlay.classList.remove("visible");
  }
});

bootstrap();
