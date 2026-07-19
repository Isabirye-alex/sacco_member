import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatDateTime, formatMoney, badge, showToast } from "../utils.js";
import { refreshCurrentRoute } from "../router.js";

export async function renderReferrals(root) {
  const memberId = requireMemberProfile();
  const referrals = await api.get(`/api/v1/referrals/members/${memberId}`);

  const paidCount = referrals.filter((r) => r.status === "commission_paid").length;
  const totalEarned = referrals
    .filter((r) => r.commission_amount)
    .reduce((sum, r) => sum + Number(r.commission_amount), 0);

  const summary = el("div", { class: "grid grid-2" }, [
    el("div", { class: "card stat-card" }, [
      el("div", { class: "label" }, "People you've invited"),
      el("div", { class: "value ledger" }, `${referrals.length}`),
      el("div", { class: "sub" }, `${paidCount} became members`),
    ]),
    el("div", { class: "card stat-card" }, [
      el("div", { class: "label" }, "Commission earned"),
      el("div", { class: "value ledger" }, `UGX ${formatMoney(totalEarned)}`),
      el("div", { class: "sub" }, "Credited to your savings account"),
    ]),
  ]);

  const inviteCard = el("div", { class: "card" }, [
    el("h3", {}, "Invite someone to join"),
    el("p", { class: "muted" }, "Know someone who'd benefit from being a member? Send them an invite \u2014 you'll earn a commission once they join."),
    buildInviteForm(memberId),
  ]);

  const listCard = el("div", { class: "card" }, [
    el("h3", {}, "Your invitations"),
    referrals.length
      ? el("div", { class: "table-wrap" }, [
          el("table", {}, [
            el("thead", {}, el("tr", {}, [
              el("th", {}, "Name"),
              el("th", {}, "Sent via"),
              el("th", {}, "Date"),
              el("th", {}, "Status"),
              el("th", {}, "Commission"),
            ])),
            el("tbody", {}, referrals.map((r) => el("tr", {}, [
              el("td", {}, r.referred_name),
              el("td", {}, r.channel === "sms" ? "SMS" : "Email"),
              el("td", {}, formatDateTime(r.invited_at)),
              el("td", {}, badge(r.status)),
              el("td", { class: "ledger" }, r.commission_amount ? `UGX ${formatMoney(r.commission_amount)}` : "\u2014"),
            ]))),
          ]),
        ])
      : el("div", { class: "empty-state" }, [
          el("h4", {}, "No invitations yet"),
          el("p", {}, "Use the form above to invite your first person."),
        ]),
  ]);

  mount(root, [summary, inviteCard, listCard]);
}

function buildInviteForm(memberId) {
  const errorEl = el("p", { class: "form-error", hidden: true });
  const channelSelect = el("select", { id: "ref-channel" }, [
    el("option", { value: "sms" }, "SMS"),
    el("option", { value: "email" }, "Email"),
  ]);
  const contactInput = el("input", { id: "ref-contact", placeholder: "Phone number", required: true });

  channelSelect.addEventListener("change", () => {
    contactInput.placeholder = channelSelect.value === "sms" ? "Phone number" : "Email address";
    contactInput.type = channelSelect.value === "sms" ? "tel" : "email";
  });

  const form = el("form", {}, [
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [el("label", {}, "Their name"), el("input", { id: "ref-name", required: true })]),
      el("div", { class: "field" }, [el("label", {}, "Invite via"), channelSelect]),
    ]),
    el("div", { class: "field" }, [el("label", {}, "Contact"), contactInput]),
    errorEl,
    el("button", { type: "submit", class: "btn btn-primary" }, "Send invitation"),
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    try {
      await api.post("/api/v1/referrals", {
        referrer_member_id: memberId,
        referred_name: form.querySelector("#ref-name").value,
        referred_contact: contactInput.value,
        channel: channelSelect.value,
      });
      showToast("Invitation sent!", "success");
      refreshCurrentRoute();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });

  return form;
}
