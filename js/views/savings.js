import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDateTime, titleCase, openModal } from "../utils.js";

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

  const cards = accounts.map((account) => buildAccountCard(account));
  mount(root, cards);
}

function buildAccountCard(account) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("div", {}, [
        el("h3", {}, account.account_number),
        el("div", { class: "muted small" }, account.is_active ? "Active" : "Closed"),
      ]),
      el("div", { class: "ledger", style: "font-size:22px;font-weight:600;color:var(--pine-900)" }, `UGX ${formatMoney(account.balance)}`),
    ]),
  ]);

  const actions = el("div", { style: "display:flex;gap:8px;margin-bottom:4px" }, [
    el(
      "button",
      {
        class: "btn btn-secondary btn-sm",
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
