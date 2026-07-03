import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDate, badge, openModal, showToast } from "../utils.js";
import { refreshCurrentRoute } from "../router.js";

export async function renderLoans(root) {
  const memberId = requireMemberProfile();

  const [loans, products, guaranteeRequests] = await Promise.all([
    api.get(`/api/v1/loans/applications?member_id=${memberId}`),
    api.get(`/api/v1/loans/products`),
    api.get(`/api/v1/loans/guarantors/by-member/${memberId}`),
  ]);

  const tabs = el("div", { class: "tabs" });
  const content = el("div", {});

  const tabDefs = [
    { key: "loans", label: "My Loans" },
    { key: "guarantees", label: `Guarantee Requests${guaranteeRequests.some((g) => g.status === "pending") ? " \u2022" : ""}` },
  ];
  let active = "loans";

  function renderTab() {
    tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.key === active));
    mount(content, active === "loans" ? buildLoansTab(loans) : buildGuaranteesTab(guaranteeRequests));
  }

  tabDefs.forEach((t) => {
    tabs.appendChild(
      el("button", { class: "tab", "data-key": t.key, onclick: () => { active = t.key; renderTab(); } }, t.label)
    );
  });

  mount(root, [
    el("div", { style: "display:flex;justify-content:flex-end;margin-bottom:16px" }, [
      el("button", { class: "btn btn-primary", onclick: () => openApplyModal(memberId, products) }, "+ Apply for a loan"),
    ]),
    tabs,
    content,
  ]);
  renderTab();
}

function buildLoansTab(loans) {
  if (!loans.length) {
    return el("div", { class: "card empty-state" }, [
      el("h4", {}, "No loan applications yet"),
      el("p", {}, "Use \u201cApply for a loan\u201d above to get started."),
    ]);
  }

  return el("div", { class: "card" }, [
    el("div", { class: "table-wrap" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, "Loan No."),
          el("th", {}, "Requested"),
          el("th", {}, "Term"),
          el("th", {}, "Status"),
          el("th", {}, "Applied"),
          el("th", {}, ""),
        ])),
        el(
          "tbody",
          {},
          loans.map((l) =>
            el("tr", {}, [
              el("td", { style: "font-weight:600" }, l.loan_number),
              el("td", { class: "ledger" }, `UGX ${formatMoney(l.amount_requested)}`),
              el("td", {}, `${l.repayment_months} mo`),
              el("td", {}, badge(l.status)),
              el("td", {}, formatDate(l.created_at)),
              el("td", {}, [
                ["active", "closed"].includes(l.status)
                  ? el("button", {
                      class: "btn btn-secondary btn-sm",
                      onclick: async () => {
                        const schedule = await api.get(`/api/v1/loans/applications/${l.id}/schedule`);
                        showScheduleModal(l, schedule);
                      },
                    }, "Schedule")
                  : null,
              ]),
            ])
          )
        ),
      ]),
    ]),
  ]);
}

function buildGuaranteesTab(requests) {
  if (!requests.length) {
    return el("div", { class: "card empty-state" }, [
      el("h4", {}, "No guarantee requests"),
      el("p", {}, "When another member asks you to guarantee their loan, it will show up here."),
    ]);
  }

  return el("div", { class: "card" }, [
    el("div", { class: "table-wrap" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, "Loan No."),
          el("th", {}, "Amount guaranteed"),
          el("th", {}, "Status"),
          el("th", {}, ""),
        ])),
        el(
          "tbody",
          {},
          requests.map((g) =>
            el("tr", {}, [
              el("td", { style: "font-weight:600" }, g.loan_number),
              el("td", { class: "ledger" }, `UGX ${formatMoney(g.amount_guaranteed)}`),
              el("td", {}, badge(g.status)),
              el("td", {}, g.status === "pending" ? el("div", { style: "display:flex;gap:8px" }, [
                el("button", { class: "btn btn-primary btn-sm", onclick: () => respondToGuarantee(g.id, true) }, "Accept"),
                el("button", { class: "btn btn-secondary btn-sm", onclick: () => respondToGuarantee(g.id, false) }, "Decline"),
              ]) : null),
            ])
          )
        ),
      ]),
    ]),
  ]);
}

async function respondToGuarantee(guarantorId, accept) {
  try {
    await api.post(`/api/v1/loans/guarantors/${guarantorId}/respond`, { accept });
    showToast(accept ? "Guarantee accepted." : "Guarantee declined.", "success");
    refreshCurrentRoute();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function showScheduleModal(loan, schedule) {
  openModal(`${loan.loan_number} \u2014 Repayment schedule`, () => [
    el("div", { class: "table-wrap" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, "#"),
          el("th", {}, "Due"),
          el("th", {}, "Principal"),
          el("th", {}, "Interest"),
          el("th", {}, "Paid"),
          el("th", {}, "Status"),
        ])),
        el(
          "tbody",
          {},
          schedule.map((s) =>
            el("tr", {}, [
              el("td", {}, s.installment_number),
              el("td", {}, formatDate(s.due_date)),
              el("td", { class: "ledger" }, formatMoney(s.principal_due)),
              el("td", { class: "ledger" }, formatMoney(s.interest_due)),
              el("td", { class: "ledger" }, formatMoney(s.amount_paid)),
              el("td", {}, s.is_paid ? badge("closed") : badge("pending")),
            ])
          )
        ),
      ]),
    ]),
  ]);
}

function openApplyModal(memberId, products) {
  if (!products.length) {
    showToast("No loan products are available right now.", "error");
    return;
  }

  openModal("Apply for a loan", (closeFn) => {
    const productSelect = el(
      "select",
      { id: "loan-product" },
      products.map((p) => el("option", { value: p.id }, `${p.name} (up to UGX ${formatMoney(p.max_amount)})`))
    );

    const selectedProduct = () => products.find((p) => p.id === productSelect.value);

    const guarantorList = el("div", { id: "guarantor-list" });
    const guarantorSection = el("div", { class: "field" }, [
      el("label", {}, "Guarantors"),
      guarantorList,
      el("button", {
        type: "button",
        class: "btn btn-secondary btn-sm",
        onclick: () => addGuarantorRow(),
      }, "+ Add guarantor"),
      el("div", { class: "field-hint" }, "Enter the guarantor's member number and the amount they're guaranteeing."),
    ]);

    function addGuarantorRow() {
      const row = el("div", { class: "field-row", style: "margin-bottom:8px" }, [
        el("input", { placeholder: "Guarantor member number", class: "guarantor-number" }),
        el("input", { placeholder: "Amount guaranteed", type: "number", class: "guarantor-amount" }),
        el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => row.remove() }, "\u2715"),
      ]);
      guarantorList.appendChild(row);
    }

    const errorEl = el("p", { class: "form-error", hidden: true });

    const form = el("form", { id: "apply-loan-form" }, [
      el("div", { class: "field" }, [el("label", {}, "Loan product"), productSelect]),
      el("div", { class: "field-row" }, [
        el("div", { class: "field" }, [el("label", {}, "Amount requested (UGX)"), el("input", { type: "number", id: "loan-amount", required: true })]),
        el("div", { class: "field" }, [el("label", {}, "Repayment term (months)"), el("input", { type: "number", id: "loan-months", required: true })]),
      ]),
      el("div", { class: "field" }, [el("label", {}, "Purpose"), el("textarea", { id: "loan-purpose", rows: 3 })]),
      guarantorSection,
      errorEl,
      el("div", { class: "modal-actions" }, [
        el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
        el("button", { type: "submit", class: "btn btn-primary" }, "Submit application"),
      ]),
    ]);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.hidden = true;

      const product = selectedProduct();
      const amount = Number(form.querySelector("#loan-amount").value);
      const months = Number(form.querySelector("#loan-months").value);
      const purpose = form.querySelector("#loan-purpose").value;

      const guarantorRowEls = [...guarantorList.children];
      const guarantors = [];

      try {
        for (const row of guarantorRowEls) {
          const memberNumber = row.querySelector(".guarantor-number").value.trim();
          const amountGuaranteed = Number(row.querySelector(".guarantor-amount").value);
          if (!memberNumber) continue;
          const results = await api.get(`/api/v1/members?q=${encodeURIComponent(memberNumber)}`);
          const found = results.items.find((m) => m.member_number === memberNumber) || results.items[0];
          if (!found) throw new Error(`Could not find a member with number "${memberNumber}".`);
          guarantors.push({ guarantor_member_id: found.id, amount_guaranteed: amountGuaranteed || 0 });
        }

        if (product.requires_guarantors && guarantors.length < product.min_guarantors) {
          throw new Error(`This product requires at least ${product.min_guarantors} guarantor(s).`);
        }

        await api.post("/api/v1/loans/applications", {
          member_id: memberId,
          product_id: product.id,
          amount_requested: amount,
          repayment_months: months,
          purpose,
          guarantors,
        });

        showToast("Loan application submitted.", "success");
        closeFn();
        refreshCurrentRoute();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
    });

    return [form];
  });
}
