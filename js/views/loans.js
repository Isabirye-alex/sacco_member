import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDate, badge, openModal, showToast, renderSkeleton } from "../utils.js";
import { refreshCurrentRoute } from "../router.js";

export async function renderLoans(root) {
  const memberId = requireMemberProfile();

  // Render shimmer loader immediately
  renderSkeleton(root, "table");

  let loans = [], products = [], guaranteeRequests = [];
  try {
    [loans, products, guaranteeRequests] = await Promise.all([
      api.get(`/api/v1/loans/applications?member_id=${memberId}`),
      api.get(`/api/v1/loans/products`),
      api.get(`/api/v1/loans/guarantors/by-member/${memberId}`),
    ]);
  } catch (err) {
    mount(
      root,
      el("div", { class: "card" }, [
        el("h3", {}, "Could not load loan details"),
        el("p", { class: "muted" }, err.message || "Please check your connection and try again."),
        el("button", { class: "btn btn-primary", onclick: () => renderLoans(root) }, "Retry")
      ])
    );
    return;
  }

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
    el("div", { style: "display:flex;justify-content:flex-end;margin-bottom:16px;flex-wrap:wrap;gap:8px;" }, [
      el("button", { class: "btn btn-primary", onclick: () => openApplyModal(memberId, products) }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "add"), " Apply for a loan"]),
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
      el("div", { class: "field-hint" }, "Search for an active member. They must accept your guarantee request."),
    ]);

    let debounceTimeout;
    function addGuarantorRow() {
      const input = el("input", { placeholder: "Search guarantor by name/number...", class: "guarantor-number-input", autocomplete: "off", style: "width:100%" });
      const dropdown = el("div", { class: "autocomplete-dropdown", style: "display:none;" });
      const wrapper = el("div", { class: "autocomplete-wrapper", style: "flex:1" }, [input, dropdown]);
      const amountInput = el("input", { placeholder: "Amount (UGX)", type: "number", class: "guarantor-amount", style: "width:140px" });

      const row = el("div", { class: "field-row", style: "margin-bottom:8px; display:flex; gap:8px; align-items:center;" }, [
        wrapper,
        amountInput,
        el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => row.remove() }, "✕"),
      ]);

      input.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        const query = input.value.trim();
        if (query.length < 2) {
          dropdown.style.display = "none";
          return;
        }

        debounceTimeout = setTimeout(async () => {
          try {
            const results = await api.get(`/api/v1/members?q=${encodeURIComponent(query)}`);
            dropdown.innerHTML = "";
            const matches = results.items || [];
            const filtered = matches.filter(m => m.id !== memberId && m.status === "active");

            if (!filtered.length) {
              dropdown.appendChild(el("div", { class: "autocomplete-no-match" }, "No active members found"));
              dropdown.style.display = "block";
              return;
            }

            filtered.forEach((m) => {
              const item = el("div", { class: "autocomplete-item" }, [
                el("span", { style: "font-weight:600" }, `${m.first_name} ${m.last_name}`),
                el("span", { class: "muted small" }, m.member_number),
              ]);
              item.addEventListener("click", () => {
                input.value = `${m.first_name} ${m.last_name} (${m.member_number})`;
                row.dataset.guarantorMemberId = m.id;
                row.dataset.guarantorMemberNumber = m.member_number;
                dropdown.style.display = "none";
              });
              dropdown.appendChild(item);
            });
            dropdown.style.display = "block";
          } catch {
            dropdown.style.display = "none";
          }
        }, 300);
      });

      document.addEventListener("click", (e) => {
        if (e.target !== input && e.target !== dropdown) {
          dropdown.style.display = "none";
        }
      });

      guarantorList.appendChild(row);
    }

    const calcContainer = el("div", { class: "calculator-preview", style: "display:none;" });

    const errorEl = el("p", { class: "form-error", hidden: true });

    const amountField = el("input", { type: "number", id: "loan-amount", required: true });
    const monthsField = el("input", { type: "number", id: "loan-months", required: true });

    function updateCalculator() {
      calcContainer.innerHTML = "";
      const product = selectedProduct();
      const amount = Number(amountField.value) || 0;
      const months = Number(monthsField.value) || 0;

      if (!product || amount <= 0 || months <= 0) {
        calcContainer.style.display = "none";
        return;
      }

      calcContainer.style.display = "block";
      const monthlyRate = Number(product.interest_rate || 1.2) / 100;
      const totalInterest = amount * monthlyRate * months;
      const totalRepayment = amount + totalInterest;
      const monthlyPayment = totalRepayment / months;

      calcContainer.appendChild(el("div", { class: "calc-title" }, "Repayment Calculation"));
      calcContainer.appendChild(el("div", { class: "calc-grid" }, [
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Monthly Installment"),
          el("div", { class: "calc-val" }, `UGX ${formatMoney(monthlyPayment)}`)
        ]),
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Total Interest"),
          el("div", { class: "calc-val" }, `UGX ${formatMoney(totalInterest)}`)
        ]),
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Total Repayment"),
          el("div", { class: "calc-val" }, `UGX ${formatMoney(totalRepayment)}`)
        ]),
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Rate (monthly)"),
          el("div", { class: "calc-val" }, `${(monthlyRate * 100).toFixed(1)}% p.m.`)
        ]),
      ]));
    }

    amountField.addEventListener("input", updateCalculator);
    monthsField.addEventListener("input", updateCalculator);
    productSelect.addEventListener("change", updateCalculator);

    const form = el("form", { id: "apply-loan-form" }, [
      el("div", { class: "field" }, [el("label", {}, "Loan product"), productSelect]),
      el("div", { class: "field-row" }, [
        el("div", { class: "field" }, [el("label", {}, "Amount requested (UGX)"), amountField]),
        el("div", { class: "field" }, [el("label", {}, "Repayment term (months)"), monthsField]),
      ]),
      el("div", { class: "field" }, [el("label", {}, "Purpose"), el("textarea", { id: "loan-purpose", rows: 3 })]),
      guarantorSection,
      calcContainer,
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
      const amount = Number(amountField.value);
      const months = Number(monthsField.value);
      const purpose = form.querySelector("#loan-purpose").value;

      const guarantorRowEls = [...guarantorList.children];
      const guarantors = [];

      try {
        for (const row of guarantorRowEls) {
          const gId = row.dataset.guarantorMemberId;
          const gNumber = row.dataset.guarantorMemberNumber;
          const amountGuaranteed = Number(row.querySelector(".guarantor-amount").value);
          if (!gId) {
            throw new Error("Please search and select a valid active member for all guarantor fields.");
          }
          guarantors.push({ guarantor_member_id: gId, amount_guaranteed: amountGuaranteed || 0 });
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
