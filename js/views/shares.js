import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDateTime, titleCase } from "../utils.js";

export async function renderShares(root) {
  const memberId = requireMemberProfile();
  const holdings = await api.get(`/api/v1/shares/members/${memberId}/holdings`);

  if (!holdings.length) {
    mount(
      root,
      el("div", { class: "card empty-state" }, [
        el("h4", {}, "No share holdings yet"),
        el("p", {}, "Speak to a SACCO officer to subscribe to shares."),
      ])
    );
    return;
  }

  const totalShares = holdings.reduce((sum, h) => sum + Number(h.number_of_shares || 0), 0);

  const summary = el("div", { class: "card stat-card" }, [
    el("div", { class: "label" }, [el("span", { class: "material-symbols-rounded filled", style: "color:var(--brass-500);margin-right:6px;font-size:16px;" }, "trending_up"), "Total shares held"]),
    el("div", { class: "value ledger" }, `${totalShares}`),
  ]);

  const holdingCards = holdings.map((h) => buildHoldingCard(h));

  mount(root, [summary, ...holdingCards]);
}

function buildHoldingCard(holding) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("h3", {}, `${holding.number_of_shares} shares`),
    ]),
  ]);

  if (!holding.transactions?.length) {
    card.appendChild(el("p", { class: "muted" }, "No transaction history yet."));
    return card;
  }

  card.appendChild(
    el("div", { class: "table-wrap" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, "Date"),
          el("th", {}, "Type"),
          el("th", {}, "Shares"),
          el("th", {}, "Amount"),
        ])),
        el(
          "tbody",
          {},
          holding.transactions.map((t) =>
            el("tr", {}, [
              el("td", {}, formatDateTime(t.created_at)),
              el("td", {}, titleCase(t.txn_type)),
              el("td", {}, t.number_of_shares),
              el("td", { class: "ledger" }, `UGX ${formatMoney(t.amount)}`),
            ])
          )
        ),
      ]),
    ])
  );

  return card;
}
