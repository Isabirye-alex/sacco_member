import { api } from "../api.js";
import { getCurrentUser, getCurrentMember } from "../auth.js";
import { el, mount, formatDate, titleCase, showToast } from "../utils.js";

export async function renderProfile(root) {
  const user = getCurrentUser();
  const member = getCurrentMember();

  const accountCard = el("div", { class: "card" }, [
    el("h3", {}, "Account"),
    infoRow("Email", user.email),
    infoRow("Full name", user.full_name),
    infoRow("Role", titleCase(user.role)),
  ]);

  const sections = [accountCard];

  if (member) {
    sections.push(
      el("div", { class: "card" }, [
        el("h3", {}, "Member profile"),
        infoRow("Member number", member.member_number),
        infoRow("National ID", member.national_id),
        infoRow("Phone", member.phone_number),
        infoRow("Status", titleCase(member.status)),
        infoRow("Date joined", formatDate(member.date_joined)),
        infoRow("Occupation", member.occupation || "\u2014"),
        infoRow("Address", member.physical_address || "\u2014"),
      ])
    );

    if (member.next_of_kin?.length) {
      sections.push(
        el("div", { class: "card" }, [
          el("h3", {}, "Next of kin"),
          ...member.next_of_kin.map((k) =>
            el("div", { style: "padding:8px 0;border-bottom:1px solid var(--line)" }, [
              el("div", { style: "font-weight:600" }, k.full_name),
              el("div", { class: "muted small" }, `${titleCase(k.relationship_type)} \u00b7 ${k.phone_number}`),
            ])
          ),
        ])
      );
    }

    if (member.trusted_contacts?.length) {
      sections.push(
        el("div", { class: "card" }, [
          el("h3", {}, "Trusted contacts"),
          ...member.trusted_contacts.map((c) =>
            el("div", { style: "padding:8px 0;border-bottom:1px solid var(--line)" }, [
              el("div", { style: "font-weight:600" }, c.full_name),
              el("div", { class: "muted small" }, c.phone_number),
            ])
          ),
        ])
      );
    }
  }

  sections.push(buildPasswordCard());

  mount(root, sections);
}

function infoRow(label, value) {
  return el("div", { style: "display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)" }, [
    el("span", { class: "muted" }, label),
    el("span", { style: "font-weight:600" }, value),
  ]);
}

function buildPasswordCard() {
  const errorEl = el("p", { class: "form-error", hidden: true });

  const form = el("form", { style: "max-width:360px" }, [
    el("div", { class: "field" }, [el("label", {}, "Current password"), el("input", { type: "password", id: "current-password", required: true })]),
    el("div", { class: "field" }, [el("label", {}, "New password"), el("input", { type: "password", id: "new-password", required: true, minlength: 8 })]),
    errorEl,
    el("button", { type: "submit", class: "btn btn-primary" }, "Update password"),
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: form.querySelector("#current-password").value,
        new_password: form.querySelector("#new-password").value,
      });
      showToast("Password updated.", "success");
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });

  return el("div", { class: "card" }, [el("h3", {}, "Change password"), form]);
}
