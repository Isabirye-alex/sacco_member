import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDateTime, titleCase, openModal, showToast } from "../utils.js";
import { refreshCurrentRoute } from "../router.js";

export async function renderSavings(root) {
  const memberId = requireMemberProfile();
  const accounts = await api.get(`/api/v1/savings/members/${memberId}/accounts`);

  if (!accounts.length) {
    mount(
      root,
      el("div", { class: "card empty-state" }, [
        el("h4", {}, "No savings accounts yet"),
        el("p", {}, "Visit a branch or contact a teller to open your first savings account."),
      ])
    );
    return;
  }

  const cards = accounts.map((account) => buildAccountCard(account, memberId));
  mount(root, cards);
}

function buildAccountCard(account, memberId) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("div", {}, [
        el("h3", {}, account.account_number),
        el("div", { class: "muted small" }, account.is_active ? "Active" : "Closed"),
      ]),
      el("div", { class: "ledger", style: "font-size:22px;font-weight:600;color:var(--pine-900)" }, `UGX ${formatMoney(account.balance)}`),
    ]),
  ]);

  const actions = el("div", { style: "display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap" }, [
    el("button", {
      class: "btn btn-primary btn-sm",
      onclick: () => openMobileMoneyModal("deposit", account, memberId),
    }, "Deposit via Mobile Money"),
    el("button", {
      class: "btn btn-secondary btn-sm",
      onclick: () => openMobileMoneyModal("withdraw", account, memberId),
    }, "Withdraw via Mobile Money"),
    el(
      "button",
      {
        class: "btn btn-ghost btn-sm",
        onclick: async () => {
          const txns = await api.get(`/api/v1/savings/accounts/${account.id}/transactions`);
          showTransactionsModal(account, txns);
        },
      },
      "View transactions"
    ),
  ]);
  card.appendChild(actions);

  if (account.target_amount) {
    const pct = Math.min(100, (Number(account.balance) / Number(account.target_amount)) * 100);
    card.appendChild(
      el("div", { style: "margin-top:10px" }, [
        el("div", { class: "muted small" }, `Target: UGX ${formatMoney(account.target_amount)} (${pct.toFixed(0)}%)`),
        el("div", { style: "background:var(--pine-100);border-radius:999px;height:8px;margin-top:6px;overflow:hidden" }, [
          el("div", { style: `background:var(--brass-500);height:100%;width:${pct}%` }),
        ]),
      ])
    );
  }

  return card;
}

function openMobileMoneyModal(kind, account, memberId) {
  const isDeposit = kind === "deposit";
  const title = isDeposit ? "Deposit via Mobile Money" : "Withdraw via Mobile Money";
  const endpoint = isDeposit ? "/api/v1/mobile-money/deposits" : "/api/v1/mobile-money/withdrawals";

  openModal(title, (closeFn) => {
    const errorEl = el("p", { class: "form-error", hidden: true });
    const statusEl = el("p", { class: "muted small", hidden: true });
    const amountInput = el("input", { type: "number", required: true, min: "500", step: "1" });
    const phoneInput = el("input", { type: "tel", placeholder: "e.g. 07XXXXXXXX (defaults to your number on file)" });
    const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, isDeposit ? "Request deposit" : "Request withdrawal");

    const form = el("form", {}, [
      el("p", { class: "muted" },
        isDeposit
          ? "You'll get a mobile money prompt on your phone to approve this deposit."
          : "Funds will be sent to your mobile money number once approved."
      ),
      el("div", { class: "field" }, [el("label", {}, "Amount (UGX)"), amountInput]),
      el("div", { class: "field" }, [el("label", {}, "Phone number (optional)"), phoneInput]),
      errorEl,
      statusEl,
      el("div", { class: "modal-actions" }, [
        el("button", { type: "button", class: "btn btn-secondary", onclick: closeFn }, "Cancel"),
        submitBtn,
      ]),
    ]);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending request\u2026";

      try {
        const txn = await api.post(endpoint, {
          member_id: memberId,
          savings_account_id: account.id,
          amount: Number(amountInput.value),
          phone_number: phoneInput.value || null,
        });
        statusEl.hidden = false;
        statusEl.textContent = "Request sent - check your phone to approve. This window will update automatically.";
        submitBtn.textContent = "Waiting for confirmation\u2026";
        pollTransactionStatus(txn.id, closeFn, statusEl, submitBtn);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = isDeposit ? "Request deposit" : "Request withdrawal";
      }
    });

    return [form];
  });
}

async function pollTransactionStatus(transactionId, closeFn, statusEl, submitBtn) {
  const maxAttempts = 20; // ~2 minutes at 6s intervals
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    try {
      const txn = await api.get(`/api/v1/mobile-money/transactions/${transactionId}`);
      if (txn.status === "completed") {
        statusEl.textContent = "Confirmed! Your balance has been updated.";
        showToast("Mobile money transaction completed.", "success");
        setTimeout(() => { closeFn(); refreshCurrentRoute(); }, 1200);
        return;
      }
      if (txn.status === "failed" || txn.status === "cancelled") {
        statusEl.textContent = `Transaction ${txn.status}: ${txn.failure_reason || "please try again."}`;
        submitBtn.disabled = false;
        submitBtn.textContent = "Try again";
        return;
      }
    } catch {
      // transient network issue while polling - keep trying silently
    }
  }
  statusEl.textContent = "Still waiting on confirmation. You can close this and check Savings again shortly.";
  submitBtn.disabled = false;
  submitBtn.textContent = "Close and check later";
}

function showTransactionsModal(account, txns) {
  openModal(`${account.account_number} — Transactions`, () => {
    if (!txns.length) {
      return [el("p", { class: "muted" }, "No transactions recorded yet.")];
    }
    const table = el("div", { class: "table-wrap" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, "Date"),
          el("th", {}, "Type"),
          el("th", {}, "Amount"),
          el("th", {}, "Balance after"),
        ])),
        el(
          "tbody",
          {},
          txns.map((t) =>
            el("tr", {}, [
              el("td", {}, formatDateTime(t.created_at)),
              el("td", {}, titleCase(t.txn_type)),
              el("td", { class: "ledger" }, formatMoney(t.amount)),
              el("td", { class: "ledger" }, formatMoney(t.balance_after)),
            ])
          )
        ),
      ]),
    ]);
    return [table];
  });
}
