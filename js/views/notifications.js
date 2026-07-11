import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatDateTime, titleCase, badge, showToast } from "../utils.js";

/* ── F19: Notification Preferences Panel ───────────────────── */
const PREF_KEY = "sacco_notif_prefs";
function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || { sms: true, email: true, push: false, loan_updates: true, savings_updates: true, promotions: false }; } catch { return { sms: true, email: true, push: false, loan_updates: true, savings_updates: true, promotions: false }; } }
function savePrefs(p) { localStorage.setItem(PREF_KEY, JSON.stringify(p)); }

export async function renderNotifications(root) {
  const memberId = requireMemberProfile();

  let notifications = [];
  try {
    notifications = await api.get(`/api/v1/notifications/members/${memberId}`);
  } catch (err) {
    mount(root, el("div", { class: "card empty-state" }, [
      el("i", { class: "fa-solid fa-bell-slash" }),
      el("h4", {}, "Could not load notifications"),
      el("p", {}, err.message || "Please try again.")
    ]));
    return;
  }

  // F19: Preferences panel
  const prefs = loadPrefs();
  const prefsCard = buildPreferencesPanel(prefs);

  if (!notifications.length) {
    mount(root, [
      prefsCard,
      el("div", { class: "card empty-state", style: "margin-top:16px;" }, [
        el("i", { class: "fa-regular fa-bell" }),
        el("h4", {}, "No notifications yet"),
        el("p", {}, "Updates about your savings, loans, and shares will appear here."),
      ])
    ]);
    return;
  }

  const card = el("div", { class: "card", style: "margin-top:16px;" });
  const header = el("div", { class: "card-header" }, [
    el("h3", {}, [el("i", { class: "fa-solid fa-bell" }), ` Notifications (${notifications.length})`]),
  ]);
  card.appendChild(header);

  notifications.forEach((n, i) => {
    const channelIcon = { email: "fa-envelope", sms: "fa-comment-sms", push: "fa-mobile-screen" }[n.channel] || "fa-bell";
    card.appendChild(
      el("div", {
        style: `padding:14px 4px;${i < notifications.length - 1 ? "border-bottom:1px solid var(--line)" : ""}`,
      }, [
        el("div", { style: "display:flex;justify-content:space-between;gap:12px;align-items:flex-start" }, [
          el("div", { style: "display:flex;gap:10px;align-items:flex-start" }, [
            el("i", { class: `fa-solid ${channelIcon}`, style: "color:var(--brass-500);margin-top:3px;flex-shrink:0;" }),
            el("div", {}, [
              el("div", { style: "font-weight:600" }, n.subject || titleCase(n.event_type) || "Notification"),
              el("p", { class: "muted", style: "margin:4px 0 0" }, n.body),
            ]),
          ]),
          badge(n.status),
        ]),
        el("div", { class: "muted small", style: "margin-top:6px;padding-left:28px;" }, [
          el("i", { class: "fa-regular fa-clock", style: "margin-right:4px;" }),
          `${titleCase(n.channel)} · ${formatDateTime(n.created_at)}`
        ]),
      ])
    );
  });

  mount(root, [prefsCard, card]);
}

/* ── F19 Panel Builder ───────────────────────────────────────── */
function buildPreferencesPanel(prefs) {
  const channels = [
    { key: "sms", label: "SMS Alerts", sub: "Loan approvals, repayment reminders", icon: "fa-comment-sms", iconBg: "#23685C18", iconColor: "var(--pine-700)" },
    { key: "email", label: "Email Notifications", sub: "Statements, receipts, and updates", icon: "fa-envelope", iconBg: "var(--brass-100)", iconColor: "var(--brass-600)" },
    { key: "push", label: "Push Notifications", sub: "Real-time app alerts (mobile)", icon: "fa-mobile-screen", iconBg: "var(--danger-bg)", iconColor: "var(--danger)" },
    { key: "loan_updates", label: "Loan Updates", sub: "Status changes on your loan applications", icon: "fa-hand-holding-dollar", iconBg: "#1B4B4318", iconColor: "var(--success)" },
    { key: "savings_updates", label: "Savings Activity", sub: "Deposits, withdrawals, interest credits", icon: "fa-vault", iconBg: "var(--pine-100)", iconColor: "var(--pine-800)" },
    { key: "promotions", label: "SACCO Promotions", sub: "Special offers, products, and events", icon: "fa-bullhorn", iconBg: "var(--warn-bg)", iconColor: "var(--warn)" },
  ];

  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [
    el("h3", {}, [el("i", { class: "fa-solid fa-sliders" }), " Notification Preferences"]),
    el("span", { class: "muted small" }, "Changes saved automatically")
  ]));

  channels.forEach(ch => {
    const checkbox = el("input", { type: "checkbox", id: `notif-${ch.key}` });
    if (prefs[ch.key]) checkbox.checked = true;

    const toggleLabel = el("label", { class: "toggle-slider", for: `notif-${ch.key}` });
    const toggleWrap = el("label", { class: "toggle-switch" }, [checkbox, toggleLabel]);

    checkbox.addEventListener("change", () => {
      prefs[ch.key] = checkbox.checked;
      savePrefs(prefs);
      showToast(`${ch.label} ${checkbox.checked ? "enabled" : "disabled"}.`, checkbox.checked ? "success" : "warn");
    });

    card.appendChild(el("div", { class: "notif-pref-row" }, [
      el("div", { class: "notif-pref-info" }, [
        el("div", { class: "notif-pref-icon", style: `background:${ch.iconBg};color:${ch.iconColor};` }, [el("i", { class: `fa-solid ${ch.icon}` })]),
        el("div", { class: "notif-pref-text" }, [
          el("div", { class: "notif-title" }, ch.label),
          el("div", { class: "notif-sub" }, ch.sub)
        ])
      ]),
      toggleWrap
    ]));
  });

  return card;
}
