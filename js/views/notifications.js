import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatDateTime, titleCase, badge } from "../utils.js";

const CHANNEL_ICONS = { email: "\u2709", sms: "\u260E", push: "\u1F514" };

export async function renderNotifications(root) {
  const memberId = requireMemberProfile();
  const notifications = await api.get(`/api/v1/notifications/members/${memberId}`);

  if (!notifications.length) {
    mount(
      root,
      el("div", { class: "card empty-state" }, [
        el("h4", {}, "No notifications yet"),
        el("p", {}, "Updates about your savings, loans, and shares will appear here."),
      ])
    );
    return;
  }

  const card = el("div", { class: "card" });
  notifications.forEach((n, i) => {
    card.appendChild(
      el("div", {
        style: `padding:14px 4px;${i < notifications.length - 1 ? "border-bottom:1px solid var(--line)" : ""}`,
      }, [
        el("div", { style: "display:flex;justify-content:space-between;gap:12px;align-items:flex-start" }, [
          el("div", {}, [
            el("div", { style: "font-weight:600" }, n.subject || titleCase(n.event_type) || "Notification"),
            el("p", { class: "muted", style: "margin:4px 0 0" }, n.body),
          ]),
          badge(n.status),
        ]),
        el("div", { class: "muted small", style: "margin-top:6px" }, `${titleCase(n.channel)} \u00b7 ${formatDateTime(n.created_at)}`),
      ])
    );
  });

  mount(root, card);
}
