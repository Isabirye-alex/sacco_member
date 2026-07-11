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

registerRoute("/dashboard", "Dashboard", renderDashboard);
registerRoute("/savings", "Savings", renderSavings);
registerRoute("/loans", "Loans", renderLoans);
registerRoute("/shares", "Shares", renderShares);
registerRoute("/groups", "Groups", renderGroups);
registerRoute("/notifications", "Notifications", renderNotifications);
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
  initConnectivityMonitor();
  initForgotPassword();

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

// Theme switcher initialization and update
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
    icon.textContent = "🌙";
    label.textContent = "Dark Mode";
  } else {
    icon.textContent = "☀️";
    label.textContent = "Light Mode";
  }
}

// Network status and API endpoint health pinger
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

  window.addEventListener("online", () => {
    showToast("Internet connection restored.", "success");
    checkApi();
  });
  window.addEventListener("offline", () => {
    showToast("Internet connection lost.", "error");
    setStatus(false);
  });

  async function checkApi() {
    if (!window.navigator.onLine) {
      setStatus(false);
      return;
    }
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(id);
      setStatus(res.status === 200 || res.status === 401);
    } catch {
      setStatus(false);
    }
  }

  checkApi();
  setInterval(checkApi, 20000);
}

// Forgot password mockup flow
function initForgotPassword() {
  const link = document.getElementById("forgot-password-link");
  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    openModal("Reset Password", (closeFn) => {
      const emailInput = el("input", { type: "email", required: true, placeholder: "Enter your registered email" });
      const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, "Send Reset Link");
      const errorEl = el("p", { class: "form-error", hidden: true });
      const container = el("div", {}, [
        el("p", { class: "muted" }, "Enter your email address and we'll send you a password reset code to recover your account."),
        el("form", {}, [
          el("div", { class: "field" }, [el("label", {}, "Email address"), emailInput]),
          errorEl,
          el("div", { class: "modal-actions" }, [
            el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
            submitBtn,
          ])
        ])
      ]);

      container.querySelector("form").addEventListener("submit", (ev) => {
        ev.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending\u2026";
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
  const codeInput = el("input", { type: "text", required: true, placeholder: "e.g. 123456", maxlength: "6" });
  const newPassInput = el("input", { type: "password", required: true, placeholder: "Min 8 characters", minlength: 8 });
  const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, "Reset Password");

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
    submitBtn.textContent = "Updating\u2026";
    setTimeout(() => {
      showToast("Password updated successfully! You can now log in.", "success");
      closeFn();
    }, 1500);
  });

  container.appendChild(form);
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in\u2026";

  try {
    await login(email, password);
    renderUserChip();
    goTo("/dashboard");
    refreshCurrentRoute();
    showToast(`Welcome back, ${getCurrentUser().full_name.split(" ")[0]}!`, "success");
  } catch (err) {
    errorEl.textContent = err.message || "Unable to sign in.";
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  logout();
});

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

bootstrap();

