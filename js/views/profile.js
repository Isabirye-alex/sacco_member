import { api } from "../api.js";
import { getCurrentUser, getCurrentMember } from "../auth.js";
import { el, mount, formatDate, titleCase, showToast, openModal, badge } from "../utils.js";

export async function renderProfile(root) {
  const user = getCurrentUser();
  const member = getCurrentMember();

  const accountCard = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("h3", {}, [el("i", { class: "fa-solid fa-circle-user" }), " Account"])]),
    infoRow("Email", [el("span", { class: "material-symbols-rounded", style: "color:var(--brass-500);margin-right:6px;font-size:16px;" }, "mail"), user.email]),
    infoRow("Full name", [el("span", { class: "material-symbols-rounded", style: "color:var(--brass-500);margin-right:6px;font-size:16px;vertical-align:-3px;" }, "person"), user.full_name]),
    infoRow("Role", [el("span", { class: "material-symbols-rounded", style: "color:var(--brass-500);margin-right:6px;font-size:16px;vertical-align:-3px;" }, "badge"), titleCase(user.role)]),
  ]);

  const sections = [accountCard];

  if (member) {
    sections.push(
      el("div", { class: "card" }, [
        el("div", { class: "card-header" }, [el("h3", {}, [el("i", { class: "fa-solid fa-id-card" }), " Member Profile"])]),
        infoRow("Member number", [el("b", {}, member.member_number)]),
        infoRow("National ID", member.national_id),
        infoRow("Phone", [el("span", { class: "material-symbols-rounded", style: "color:var(--brass-500);margin-right:6px;font-size:16px;" }, "call"), member.phone_number]),
        infoRow("Status", badge(titleCase(member.status))),
        infoRow("Date joined", formatDate(member.date_joined)),
        infoRow("Occupation", member.occupation || "—"),
        infoRow("Address", member.physical_address || "—"),
      ])
    );

    if (member.next_of_kin?.length) {
      // F16: Beneficiary Share Splitter
      sections.push(buildBeneficiarySplitter(member.next_of_kin));
    }

    if (member.trusted_contacts?.length) {
      sections.push(
        el("div", { class: "card" }, [
          el("div", { class: "card-header" }, [el("h3", {}, [el("i", { class: "fa-solid fa-user-shield" }), " Trusted Contacts"])]),
          ...member.trusted_contacts.map((c) =>
            el("div", { style: "padding:8px 0;border-bottom:1px solid var(--line)" }, [
              el("div", { style: "display:flex;align-items:center;gap:8px;" }, [
                el("span", { class: "material-symbols-rounded", style: "color:var(--pine-700);font-size:20px;" }, "person_check"),
                el("span", { style: "font-weight:600" }, c.full_name),
              ]),
              el("div", { class: "muted small", style: "padding-left:28px;margin-top:2px;" }, [
                el("span", { class: "material-symbols-rounded", style: "margin-right:4px;font-size:14px;vertical-align:-3px;" }, "call"),
                c.phone_number
              ]),
            ])
          ),
        ])
      );
    }
  }

  sections.push(buildPasswordCard());

  // F17: Star Rating Widget
  sections.push(buildRatingWidget());

  mount(root, sections);
}

function infoRow(label, value) {
  const valueEl = typeof value === "string" || typeof value === "number"
    ? el("span", { style: "font-weight:600" }, String(value))
    : el("span", { style: "font-weight:600;display:flex;align-items:center;" }, Array.isArray(value) ? value : [value]);
  return el("div", { class: "profile-info-row", style: "display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)" }, [
    el("span", { class: "muted small" }, label),
    valueEl,
  ]);
}

/* ── F16: Beneficiary Share Splitter ─────────────────────── */
function buildBeneficiarySplitter(nextOfKin) {
  const PREF_KEY = "sacco_beneficiary_splits";
  let splits;
  try { splits = JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { splits = {}; }

  // Initialize with equal split if not set
  const count = nextOfKin.length;
  const defaultPct = Math.floor(100 / count);
  nextOfKin.forEach((k, i) => {
    if (splits[k.full_name] === undefined) {
      splits[k.full_name] = i === count - 1 ? 100 - defaultPct * (count - 1) : defaultPct;
    }
  });

  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [
    el("h3", {}, [el("i", { class: "fa-solid fa-scale-balanced" }), " Beneficiary Share Splitter"]),
    el("span", { class: "muted small" }, "Must total 100%")
  ]));

  const totalEl = el("div", { class: "beneficiary-total ok" });
  const rowsEl = el("div", {});

  function updateTotal() {
    const total = Object.values(splits).reduce((a, b) => a + b, 0);
    totalEl.className = `beneficiary-total ${total === 100 ? "ok" : "warn"}`;
    totalEl.innerHTML = `
      <span>${total === 100 ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>'} Total allocation</span>
      <span style="font-family:var(--font-ledger);font-size:17px;">${total}%</span>
    `;
    localStorage.setItem(PREF_KEY, JSON.stringify(splits));
  }

  nextOfKin.forEach(k => {
    const pctLbl = el("span", { class: "beneficiary-pct" }, `${splits[k.full_name]}%`);
    const slider = el("input", { type: "range", min: "0", max: "100", step: "1", value: splits[k.full_name], style: "flex:1;" });
    slider.addEventListener("input", () => {
      splits[k.full_name] = +slider.value;
      pctLbl.textContent = `${slider.value}%`;
      updateTotal();
    });
    rowsEl.appendChild(el("div", { class: "beneficiary-row" }, [
      el("div", { style: "display:flex;flex-direction:column;min-width:100px;" }, [
        el("div", { class: "beneficiary-name" }, [el("i", { class: "fa-solid fa-user", style: "color:var(--brass-500);margin-right:5px;font-size:11px;" }), k.full_name]),
        el("div", { style: "font-size:11px;color:var(--ink-400);" }, titleCase(k.relationship_type))
      ]),
      slider,
      pctLbl
    ]));
  });

  updateTotal();
  card.appendChild(rowsEl);
  card.appendChild(totalEl);
  card.appendChild(el("div", { style: "margin-top:12px;" }, [
    el("button", { class: "btn btn-primary btn-sm", onclick: () => { updateTotal(); showToast("Beneficiary splits saved! 📋", "success"); } }, [
      el("span", { class: "material-symbols-rounded", style: "font-size:14px;vertical-align:-2px;margin-right:4px;" }, "save"), " Save Splits"
    ])
  ]));

  return card;
}

/* ── F17: Star Rating Widget ─────────────────────────────── */
function buildRatingWidget() {
  const PREF_KEY = "sacco_service_rating";
  let currentRating = +localStorage.getItem(PREF_KEY) || 0;
  const comments = ["", "Very poor — needs urgent improvement.", "Below expectations.", "Acceptable — some areas need work.", "Good experience overall!", "Excellent! 🌟 Thank you for your feedback!"];

  const starsEl = el("div", { class: "star-rating", style: "justify-content:center;margin:12px 0;" });
  const commentEl = el("div", { class: "rating-comment" }, comments[currentRating]);
  const submitBtn = el("button", { class: "btn btn-primary btn-sm", style: "display:block;margin:10px auto 0;", onclick: () => {
    if (!currentRating) { showToast("Please select a star rating first.", "warn"); return; }
    localStorage.setItem(PREF_KEY, currentRating);
    showToast(`Thank you! You rated us ${currentRating} star${currentRating > 1 ? "s" : ""} ⭐`, "success");
  }}, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "send"), " Submit Rating"]);

  function render() {
    starsEl.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= currentRating;
      const btn = el("button", { class: `star-btn ${isFilled ? "filled" : ""}`, "data-star": i }, [
        el("span", { class: `material-symbols-rounded ${isFilled ? "filled" : ""}`, style: "font-size:26px;" }, "star")
      ]);
      btn.addEventListener("click", () => {
        currentRating = i;
        commentEl.textContent = comments[i];
        btn.classList.add("animate");
        setTimeout(() => btn.classList.remove("animate"), 400);
        render();
      });
      starsEl.appendChild(btn);
    }
  }

  render();

  return el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("h3", {}, [el("span", { class: "material-symbols-rounded filled", style: "color:var(--brass-500);margin-right:6px;font-size:16px;" }, "star"), " Rate Our Service"])]),
    el("p", { class: "muted small", style: "text-align:center;" }, "How would you rate your SACCO experience?"),
    starsEl,
    commentEl,
    submitBtn
  ]);
}

function buildPasswordCard() {
  const errorEl = el("p", { class: "form-error", hidden: true });
  const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, [
    el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "lock"), " Update Password"
  ]);
  const form = el("form", { style: "max-width:360px" }, [
    el("div", { class: "field" }, [
      el("label", {}, [el("span", { class: "material-symbols-rounded", style: "color:var(--brass-500);margin-right:6px;font-size:16px;vertical-align:-3px;" }, "key"), "Current password"]),
      el("input", { type: "password", id: "current-password", required: true })
    ]),
    el("div", { class: "field" }, [
      el("label", {}, [el("span", { class: "material-symbols-rounded", style: "color:var(--brass-500);margin-right:6px;font-size:16px;vertical-align:-3px;" }, "lock_reset"), "New password"]),
      el("input", { type: "password", id: "new-password", required: true, minlength: 8 })
    ]),
    errorEl,
    submitBtn,
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating…';
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: form.querySelector("#current-password").value,
        new_password: form.querySelector("#new-password").value,
      });
      showToast("Password updated successfully! 🔒", "success");
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Update Password';
    }
  });

  return el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("h3", {}, [el("i", { class: "fa-solid fa-key" }), " Change Password"])]),
    form
  ]);
}
