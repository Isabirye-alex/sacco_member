import { api } from "../api.js";
import { getCurrentUser, loadCurrentUser } from "../auth.js";
import { el, mount, formatMoney, formatDate, titleCase, openModal, showToast, renderSkeleton, setButtonLoadingState } from "../utils.js";
import { refreshCurrentRoute } from "../router.js";

export async function renderVaults(root) {
  let user = getCurrentUser();
  if (!user) {
    try {
      user = await loadCurrentUser();
    } catch {
      user = null;
    }
  }

  if (!user?.member_id) {
    mount(
      root,
      el("div", { class: "card empty-state", style: "padding:48px 24px;text-align:center;" }, [
        el("span", { class: "material-symbols-rounded filled", style: "font-size:48px;color:var(--brass-500);margin-bottom:12px;" }, "person_alert"),
        el("h3", {}, "No Member Profile Linked"),
        el("p", { class: "muted", style: "max-width:480px;margin:8px auto;" }, "Your account is not linked to a member profile yet. Ask a SACCO staff member to link your user account to a member profile."),
      ])
    );
    return;
  }

  const memberId = user.member_id;

  renderSkeleton(root, "dashboard");

  let vaults = [], summary = null, savingsAccounts = [];
  try {
    [vaults, summary, savingsAccounts] = await Promise.all([
      api.get(`/api/v1/vaults?member_id=${memberId}`),
      api.get(`/api/v1/vaults/member/${memberId}/summary`).catch(() => null),
      api.get(`/api/v1/savings/members/${memberId}/accounts`).catch(() => []),
    ]);
  } catch (err) {
    mount(
      root,
      el("div", { class: "card" }, [
        el("h3", {}, "Could not load target vaults"),
        el("p", { class: "muted" }, err.message || "Please check your connection and try again."),
        el("button", { class: "btn btn-primary", onclick: () => renderVaults(root) }, "Retry")
      ])
    );
    return;
  }

  const header = el("div", { class: "card-header", style: "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;" }, [
    el("div", {}, [
      el("h2", { style: "margin:0" }, [
        el("span", { class: "material-symbols-rounded filled", style: "color:var(--brass-500);margin-right:8px;vertical-align:-3px;" }, "lock_clock"),
        "Target Savings Vaults"
      ]),
      el("p", { class: "muted", style: "margin:4px 0 0 0" }, "Lock funds towards specific goals with high interest yields and automated progress tracking.")
    ]),
    el("button", {
      class: "btn btn-primary",
      onclick: () => openCreateVaultModal(memberId, savingsAccounts)
    }, [el("span", { class: "material-symbols-rounded", style: "font-size:16px;vertical-align:-2px;margin-right:4px;" }, "add"), "+ Create New Vault"])
  ]);

  const totalSaved = summary ? summary.total_current_balance : vaults.reduce((sum, v) => sum + Number(v.current_balance || 0), 0);
  const totalTarget = summary ? summary.total_target_amount : vaults.reduce((sum, v) => sum + Number(v.target_amount || 0), 0);
  const progressPct = summary ? summary.overall_progress_pct : (totalTarget > 0 ? (totalSaved / totalTarget * 100).toFixed(1) : 0);
  const activeCount = summary ? summary.active_vaults : vaults.filter(v => v.status === "ACTIVE").length;
  const maturedCount = summary ? summary.matured_vaults : vaults.filter(v => v.status === "MATURED").length;

  const statCards = el("div", { class: "grid grid-4 stats-grid", style: "margin-top:16px;" }, [
    vaultStatCard("Total Saved in Vaults", `UGX ${formatMoney(totalSaved)}`, `${vaults.length} total goal${vaults.length === 1 ? "" : "s"}`, "fa-vault"),
    vaultStatCard("Total Goal Target", `UGX ${formatMoney(totalTarget)}`, `${progressPct}% overall progress`, "fa-bullseye"),
    vaultStatCard("Active Vaults", `${activeCount}`, `${maturedCount} matured vault${maturedCount === 1 ? "" : "s"}`, "fa-lock"),
    vaultStatCard("High Yield Interest", "Up to 12.5% p.a.", "Compounded annually", "fa-arrow-trend-up"),
  ]);

  let vaultsGrid;
  if (!vaults.length) {
    vaultsGrid = el("div", { class: "card empty-state", style: "margin-top:16px;text-align:center;padding:48px 24px;" }, [
      el("span", { class: "material-symbols-rounded filled", style: "font-size:48px;color:var(--brass-500);margin-bottom:12px;" }, "savings"),
      el("h3", {}, "No Target Savings Vaults Yet"),
      el("p", { class: "muted", style: "max-width:480px;margin:8px auto 20px auto;" }, "Target vaults allow you to set specific savings goals (e.g. Emergency Fund, School Fees, Land Purchase) and lock money away to earn higher interest rates."),
      el("button", { class: "btn btn-primary", onclick: () => openCreateVaultModal(memberId, savingsAccounts) }, "+ Start Your First Vault")
    ]);
  } else {
    vaultsGrid = el("div", { class: "grid grid-2", style: "margin-top:16px;gap:16px;" }, 
      vaults.map(vault => buildVaultCard(vault, memberId, savingsAccounts))
    );
  }

  mount(root, [header, statCards, vaultsGrid]);
}

function vaultStatCard(label, value, sub, iconClass) {
  return el("div", { class: "card stat-card" }, [
    el("div", { style: "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;" }, [
      el("span", { class: "muted small" }, label),
      el("i", { class: `fa-solid ${iconClass}`, style: "color:var(--pine-600);" })
    ]),
    el("div", { class: "ledger", style: "font-size:20px;font-weight:700;" }, value),
    el("div", { class: "muted small", style: "margin-top:4px;" }, sub)
  ]);
}

function buildVaultCard(vault, memberId, savingsAccounts) {
  const current = Number(vault.current_balance || 0);
  const target = Number(vault.target_amount || 1);
  const pct = Math.min(100, Math.round((current / target) * 100));

  let badgeClass = "badge badge-success";
  if (vault.status === "MATURED") badgeClass = "badge badge-brass";
  if (vault.status === "BROKEN") badgeClass = "badge badge-danger";

  const isMatured = vault.status === "MATURED";
  const isBroken = vault.status === "BROKEN";
  const isLocked = vault.is_locked && new Date(vault.maturity_date) > new Date() && vault.status === "ACTIVE";

  const card = el("div", { class: "card interactive", style: "position:relative;" }, [
    el("div", { class: "card-header", style: "align-items:flex-start;" }, [
      el("div", {}, [
        el("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:4px;" }, [
          el("h3", { style: "margin:0;font-size:18px;" }, vault.name),
          el("span", { class: badgeClass }, titleCase(vault.status))
        ]),
        el("div", { class: "muted small" }, `${titleCase(vault.vault_type || "Goal Vault")} · Account: ${vault.account_number}`)
      ]),
      el("div", { style: "text-align:right;" }, [
        el("div", { class: "ledger", style: "font-size:20px;font-weight:700;color:var(--pine-700);" }, `UGX ${formatMoney(current)}`),
        el("div", { class: "muted small" }, `of UGX ${formatMoney(target)} target`)
      ])
    ]),

    // Progress Bar
    el("div", { style: "margin:14px 0;" }, [
      el("div", { style: "display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;font-weight:600;" }, [
        el("span", { class: "muted" }, "Savings Goal Progress"),
        el("span", { style: "color:var(--pine-700);" }, `${pct}% Completed`)
      ]),
      el("div", { style: "height:8px;border-radius:4px;background:var(--pine-100,#E2ECE8);overflow:hidden;" }, [
        el("div", { style: `height:100%;width:${pct}%;background:linear-gradient(90deg, var(--pine-600), var(--brass-500));border-radius:4px;transition:width 0.4s ease;` })
      ])
    ]),

    // Vault Rules & Metrics Grid
    el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;padding:10px;background:var(--pine-50,#F4F7F6);border-radius:6px;margin-bottom:14px;" }, [
      el("div", {}, [el("span", { class: "muted" }, "Lock Period: "), el("strong", {}, `${vault.lock_period_months || 0} Months`)]),
      el("div", {}, [el("span", { class: "muted" }, "Interest Rate: "), el("strong", {}, `${vault.interest_rate_annual || 0}% p.a.`)]),
      el("div", {}, [el("span", { class: "muted" }, "Start Date: "), el("strong", {}, formatDate(vault.start_date))]),
      el("div", {}, [el("span", { class: "muted" }, "Maturity Date: "), el("strong", {}, formatDate(vault.maturity_date))]),
      el("div", { style: "grid-column: span 2;" }, [
        el("span", { class: "muted" }, "Early Withdrawal Fee: "),
        el("strong", { style: "color:var(--danger,#B3261E);" }, `${vault.early_withdrawal_penalty_pct || 0}% penalty on principal`)
      ])
    ]),

    // Action Buttons
    el("div", { style: "display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;" }, [
      vault.status === "ACTIVE" ? el("button", {
        class: "btn btn-primary btn-sm",
        onclick: () => openDepositVaultModal(vault, savingsAccounts)
      }, [el("span", { class: "material-symbols-rounded", style: "font-size:14px;vertical-align:-2px;margin-right:4px;" }, "add_card"), " Deposit Funds"]) : null,

      current > 0 ? el("button", {
        class: "btn btn-secondary btn-sm",
        onclick: () => openWithdrawVaultModal(vault, savingsAccounts)
      }, [el("span", { class: "material-symbols-rounded", style: "font-size:14px;vertical-align:-2px;margin-right:4px;" }, isLocked ? "lock_open" : "outbox"), isLocked ? " Early Withdrawal" : " Withdraw Funds"]) : null
    ])
  ]);

  return card;
}

/* ── Modal 1: Create Target Vault ───────────────────────────── */
function openCreateVaultModal(memberId, savingsAccounts) {
  openModal("Create New Target Savings Vault", (closeFn) => {
    const errorEl = el("p", { class: "form-error", hidden: true });

    const form = el("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        errorEl.hidden = true;
        const submitBtn = form.querySelector("button[type='submit']");
        setButtonLoadingState(submitBtn, true);

        const name = (form.querySelector("#v-name")?.value || "").trim();
        const vault_type = form.querySelector("#v-type")?.value || "GOAL";
        const target_amount = parseFloat(form.querySelector("#v-target")?.value || 0);
        const lock_period_months = parseInt(form.querySelector("#v-months")?.value || 6);
        const interest_rate_annual = parseFloat(form.querySelector("#v-rate")?.value || 8.5);
        const early_withdrawal_penalty_pct = parseFloat(form.querySelector("#v-penalty")?.value || 5.0);

        if (!name || target_amount <= 0) {
          errorEl.textContent = "Please enter a valid goal name and target amount.";
          errorEl.hidden = false;
          setButtonLoadingState(submitBtn, false);
          return;
        }

        try {
          await api.post("/api/v1/vaults", {
            member_id: memberId || user?.member_id,
            name,
            vault_type: vault_type === "FIXED_DEPOSIT" ? "FIXED_DEPOSIT" : "GOAL",
            target_amount,
            lock_period_months,
            interest_rate_annual,
            early_withdrawal_penalty_pct
          });
          showToast(`Target vault '${name}' created successfully!`, "success");
          closeFn();
          refreshCurrentRoute();
        } catch (err) {
          errorEl.textContent = err.message || "Failed to create vault.";
          errorEl.hidden = false;
        } finally {
          setButtonLoadingState(submitBtn, false);
        }
      }
    }, [
      el("div", { class: "field", style: "margin-bottom:14px;" }, [
        el("label", { style: "display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:var(--heading-color);" }, "Goal Name / Purpose"),
        el("input", { id: "v-name", required: true, placeholder: "e.g. Land Purchase 2027, Children School Fees", style: "width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;" })
      ]),
      el("div", { class: "field-row", style: "display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;" }, [
        el("div", { class: "field", style: "margin:0;" }, [
          el("label", { style: "display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:var(--heading-color);" }, "Vault Type"),
          el("select", { id: "v-type", style: "width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;" }, [
            el("option", { value: "GOAL" }, "Target Savings Goal"),
            el("option", { value: "FIXED_DEPOSIT" }, "Fixed Deposit Vault")
          ])
        ]),
        el("div", { class: "field", style: "margin:0;" }, [
          el("label", { style: "display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:var(--heading-color);" }, "Target Goal Amount (UGX)"),
          el("input", { id: "v-target", type: "number", step: "10000", required: true, placeholder: "e.g. 5000000", style: "width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;" })
        ])
      ]),
      el("div", { class: "field-row", style: "display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;" }, [
        el("div", { class: "field", style: "margin:0;" }, [
          el("label", { style: "display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:var(--heading-color);" }, "Lock Period (Months)"),
          el("select", { id: "v-months", style: "width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;" }, [
            el("option", { value: "3" }, "3 Months (High Yield)"),
            el("option", { value: "6", selected: true }, "6 Months (Standard)"),
            el("option", { value: "12" }, "12 Months (1 Year)"),
            el("option", { value: "24" }, "24 Months (2 Years)")
          ])
        ]),
        el("div", { class: "field", style: "margin:0;" }, [
          el("label", { style: "display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:var(--heading-color);" }, "Annual Interest Rate (%)"),
          el("input", { id: "v-rate", type: "number", step: "0.5", value: "8.5", style: "width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;" })
        ])
      ]),
      el("div", { class: "field", style: "margin-bottom:14px;" }, [
        el("label", { style: "display:block;margin-bottom:6px;font-weight:600;font-size:13px;color:var(--heading-color);" }, "Early Withdrawal Penalty (%)"),
        el("input", { id: "v-penalty", type: "number", step: "0.5", value: "5.0", style: "width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;" }),
        el("div", { class: "field-hint", style: "font-size:12px;color:var(--ink-400);margin-top:4px;" }, "Penalty applied only if funds are withdrawn before maturity date.")
      ]),
      errorEl,
      el("div", { class: "modal-actions", style: "margin-top:16px;" }, [
        el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
        el("button", { type: "submit", class: "btn btn-primary" }, "Create Vault")
      ])
    ]);

    return form;
  });
}

/* ── Modal 2: Deposit into Vault ────────────────────────────── */
function openDepositVaultModal(vault, savingsAccounts) {
  openModal(`Deposit into Vault: ${vault.name}`, (closeFn) => {
    const errorEl = el("p", { class: "form-error", hidden: true });

    const accountOptions = savingsAccounts.map(a => 
      el("option", { value: a.id }, `${a.account_number} — UGX ${formatMoney(a.balance)}`)
    );

    const form = el("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        errorEl.hidden = true;
        const submitBtn = form.querySelector("button[type='submit']");
        setButtonLoadingState(submitBtn, true);

        const amount = parseFloat(form.querySelector("#vd-amount")?.value || 0);

        if (amount <= 0) {
          errorEl.textContent = "Please enter a valid deposit amount.";
          errorEl.hidden = false;
          setButtonLoadingState(submitBtn, false);
          return;
        }

        try {
          await api.post(`/api/v1/vaults/${vault.id}/deposit`, { amount });
          showToast(`Deposited UGX ${formatMoney(amount)} into '${vault.name}'!`, "success");
          closeFn();
          refreshCurrentRoute();
        } catch (err) {
          errorEl.textContent = err.message || "Deposit failed.";
          errorEl.hidden = false;
        } finally {
          setButtonLoadingState(submitBtn, false);
        }
      }
    }, [
      el("div", { class: "field" }, [
        el("label", {}, "Select Savings Account Source"),
        el("select", { id: "vd-source" }, accountOptions.length ? accountOptions : [el("option", {}, "No savings account found")])
      ]),
      el("div", { class: "field" }, [
        el("label", {}, "Deposit Amount (UGX)"),
        el("input", { id: "vd-amount", type: "number", step: "1000", required: true, placeholder: "e.g. 100000" })
      ]),
      el("div", { class: "field-hint", style: "margin-bottom:12px;" }, `Current Vault Balance: UGX ${formatMoney(vault.current_balance)} / Target: UGX ${formatMoney(vault.target_amount)}`),
      errorEl,
      el("div", { class: "modal-actions" }, [
        el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
        el("button", { type: "submit", class: "btn btn-primary" }, "Confirm Deposit")
      ])
    ]);

    return form;
  });
}

/* ── Modal 3: Withdraw from Vault ───────────────────────────── */
function openWithdrawVaultModal(vault, savingsAccounts) {
  openModal(`Withdraw from Vault: ${vault.name}`, (closeFn) => {
    const errorEl = el("p", { class: "form-error", hidden: true });
    const isLocked = vault.is_locked && new Date(vault.maturity_date) > new Date() && vault.status === "ACTIVE";

    const form = el("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        errorEl.hidden = true;
        const submitBtn = form.querySelector("button[type='submit']");
        setButtonLoadingState(submitBtn, true);

        const amount = parseFloat(form.querySelector("#vw-amount")?.value || 0);
        const forceEarly = form.querySelector("#vw-force") ? form.querySelector("#vw-force").checked : false;

        if (amount <= 0 || amount > Number(vault.current_balance)) {
          errorEl.textContent = `Amount must be between UGX 1 and UGX ${formatMoney(vault.current_balance)}.`;
          errorEl.hidden = false;
          setButtonLoadingState(submitBtn, false);
          return;
        }

        try {
          await api.post(`/api/v1/vaults/${vault.id}/withdraw`, {
            amount,
            force_early_withdrawal: forceEarly
          });
          showToast(`Withdrew UGX ${formatMoney(amount)} from '${vault.name}'.`, "success");
          closeFn();
          refreshCurrentRoute();
        } catch (err) {
          errorEl.textContent = err.message || "Withdrawal failed.";
          errorEl.hidden = false;
        } finally {
          setButtonLoadingState(submitBtn, false);
        }
      }
    }, [
      isLocked ? el("div", { class: "alert alert-warning", style: "margin-bottom:14px;padding:12px;background:#FFF3CD;border:1px solid #FFEBAA;border-radius:6px;font-size:13px;" }, [
        el("strong", {}, "⚠️ Early Withdrawal Warning: "),
        `This vault is locked until ${formatDate(vault.maturity_date)}. Withdrawing now incurs a ${vault.early_withdrawal_penalty_pct}% early withdrawal fee.`
      ]) : null,

      el("div", { class: "field" }, [
        el("label", {}, "Withdrawal Amount (UGX)"),
        el("input", { id: "vw-amount", type: "number", step: "1000", value: vault.current_balance, required: true })
      ]),

      isLocked ? el("div", { class: "field", style: "display:flex;align-items:center;gap:8px;margin-top:10px;" }, [
        el("input", { id: "vw-force", type: "checkbox", required: true }),
        el("label", { for: "vw-force", style: "margin:0;font-size:13px;font-weight:600;color:var(--danger,#B3261E);" }, `I acknowledge the ${vault.early_withdrawal_penalty_pct}% penalty and confirm early withdrawal.`)
      ]) : null,

      errorEl,
      el("div", { class: "modal-actions", style: "margin-top:16px;" }, [
        el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
        el("button", { type: "submit", class: "btn btn-danger" }, "Execute Withdrawal")
      ])
    ]);

    return form;
  });
}
