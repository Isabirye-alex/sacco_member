import { api } from "../api.js";
import { getCurrentUser, getCurrentMember, requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDate, badge, titleCase } from "../utils.js";
import { goTo } from "../router.js";

export async function renderDashboard(root) {
  const user = getCurrentUser();
  const member = getCurrentMember();

  if (!user.member_id) {
    mount(
      root,
      el("div", { class: "card empty-state" }, [
        el("h4", {}, "No member profile linked"),
        el("p", {}, "Your account isn't linked to a member profile yet. Ask a SACCO staff member to link it, then refresh."),
      ])
    );
    return;
  }

  const memberId = requireMemberProfile();

  const [accounts, loans, holdings] = await Promise.all([
    api.get(`/api/v1/savings/members/${memberId}/accounts`),
    api.get(`/api/v1/loans/applications?member_id=${memberId}`),
    api.get(`/api/v1/shares/members/${memberId}/holdings`),
  ]);

  const totalSavings = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const activeLoans = loans.filter((l) => ["active", "disbursed"].includes(l.status));
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.amount_approved || 0), 0);
  const totalShares = holdings.reduce((sum, h) => sum + Number(h.number_of_shares || 0), 0);

  const statCards = el("div", { class: "grid grid-3" }, [
    statCard("Total Savings", formatMoney(totalSavings), `${accounts.length} account${accounts.length === 1 ? "" : "s"}`),
    statCard("Active Loans", `${activeLoans.length}`, activeLoans.length ? `${formatMoney(totalOutstanding)} approved` : "No active loans"),
    statCard("Shares Held", `${totalShares}`, `${holdings.length} product${holdings.length === 1 ? "" : "s"}`),
  ]);

  const welcomeCard = el("div", { class: "card" }, [
    el("h3", {}, `Welcome back, ${member ? member.first_name : user.full_name.split(" ")[0]}`),
    el("p", { class: "muted" }, member
      ? `Member No. ${member.member_number} · Joined ${formatDate(member.date_joined)} · ${titleCase(member.status)}`
      : "Loading your member profile…"),
  ]);

  const recentAccountsCard = buildAccountsPreview(accounts);
  const recentLoansCard = buildLoansPreview(loans);

  mount(root, [welcomeCard, statCards, el("div", { class: "grid grid-2", style: "margin-top:16px" }, [recentAccountsCard, recentLoansCard])]);
}

function statCard(label, value, sub) {
  return el("div", { class: "card stat-card" }, [
    el("div", { class: "label" }, label),
    el("div", { class: "value ledger" }, value),
    el("div", { class: "sub" }, sub),
  ]);
}

function buildAccountsPreview(accounts) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("h3", {}, "Savings accounts"),
      el("button", { class: "btn btn-secondary btn-sm", onclick: () => goTo("/savings") }, "View all"),
    ]),
  ]);

  if (!accounts.length) {
    card.appendChild(el("div", { class: "empty-state" }, [el("p", {}, "No savings accounts yet.")]));
    return card;
  }

  const list = el("div", {});
  accounts.slice(0, 4).forEach((a) => {
    list.appendChild(
      el("div", { style: "display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)" }, [
        el("div", {}, [
          el("div", { style: "font-weight:600" }, a.account_number),
          el("div", { class: "muted small" }, a.is_active ? "Active" : "Closed"),
        ]),
        el("div", { class: "ledger", style: "font-weight:600" }, `UGX ${formatMoney(a.balance)}`),
      ])
    );
  });
  card.appendChild(list);
  return card;
}

function buildLoansPreview(loans) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("h3", {}, "Loan applications"),
      el("button", { class: "btn btn-secondary btn-sm", onclick: () => goTo("/loans") }, "View all"),
    ]),
  ]);

  if (!loans.length) {
    card.appendChild(el("div", { class: "empty-state" }, [el("p", {}, "You haven't applied for a loan yet.")]));
    return card;
  }

  const list = el("div", {});
  loans.slice(0, 4).forEach((l) => {
    list.appendChild(
      el("div", { style: "display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)" }, [
        el("div", {}, [
          el("div", { style: "font-weight:600" }, l.loan_number),
          el("div", { class: "muted small" }, `Requested UGX ${formatMoney(l.amount_requested)}`),
        ]),
        badge(l.status),
      ])
    );
  });
  card.appendChild(list);
  return card;
}
