import { api } from "../api.js";
import { getCurrentUser, getCurrentMember, requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDate, badge, titleCase, renderSkeleton } from "../utils.js";
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

  // Render shimmer loader immediately before data fetch
  renderSkeleton(root, "dashboard");

  const memberId = requireMemberProfile();

  let accounts = [], loans = [], holdings = [];
  try {
    [accounts, loans, holdings] = await Promise.all([
      api.get(`/api/v1/savings/members/${memberId}/accounts`),
      api.get(`/api/v1/loans/applications?member_id=${memberId}`),
      api.get(`/api/v1/shares/members/${memberId}/holdings`),
    ]);
  } catch (err) {
    mount(
      root,
      el("div", { class: "card" }, [
        el("h3", {}, "Could not load dashboard data"),
        el("p", { class: "muted" }, err.message || "Please check your connection and try again."),
        el("button", { class: "btn btn-primary", onclick: () => renderDashboard(root) }, "Retry")
      ])
    );
    return;
  }

  const totalSavings = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const activeLoans = loans.filter((l) => ["active", "disbursed"].includes(l.status));
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.amount_approved || 0), 0);
  const totalShares = holdings.reduce((sum, h) => sum + Number(h.number_of_shares || 0), 0);
  const totalSharesVal = totalShares * 10000; // Assuming mock share valuation of 10,000 UGX per share

  const welcomeCard = el("div", { class: "card" }, [
    el("h3", {}, `Welcome back, ${member ? member.first_name : user.full_name.split(" ")[0]}`),
    el("p", { class: "muted" }, member
      ? `Member No. ${member.member_number} · Joined ${formatDate(member.date_joined)} · ${titleCase(member.status)}`
      : "Loading your member profile…"),
  ]);

  const quickActions = buildQuickActions();

  const statCards = el("div", { class: "grid grid-3", style: "margin-top:16px" }, [
    statCard("Total Savings", formatMoney(totalSavings), `${accounts.length} account${accounts.length === 1 ? "" : "s"}`),
    statCard("Active Loans", `${activeLoans.length}`, activeLoans.length ? `${formatMoney(totalOutstanding)} approved` : "No active loans"),
    statCard("Shares Held", `${totalShares}`, `${holdings.length} product${holdings.length === 1 ? "" : "s"}`),
  ]);

  const recentAccountsCard = buildAccountsPreview(accounts);
  const recentLoansCard = buildLoansPreview(loans);
  
  const portfolioChartCard = el("div", { class: "card" }, [
    el("h3", {}, "Financial Portfolio Allocation"),
    buildPortfolioChart(totalSavings, totalOutstanding, totalSharesVal)
  ]);

  const activityTimelineCard = buildActivityTimeline(accounts, loans);

  mount(root, [
    welcomeCard, 
    quickActions, 
    statCards, 
    el("div", { class: "grid grid-2", style: "margin-top:16px" }, [recentAccountsCard, recentLoansCard]),
    el("div", { class: "grid grid-2", style: "margin-top:16px" }, [portfolioChartCard, activityTimelineCard])
  ]);
}

function statCard(label, value, sub) {
  return el("div", { class: "card stat-card interactive", onclick: () => {
    if (label.includes("Savings")) goTo("/savings");
    else if (label.includes("Loans")) goTo("/loans");
    else if (label.includes("Shares")) goTo("/shares");
  }}, [
    el("div", { class: "label" }, label),
    el("div", { class: "value ledger" }, value),
    el("div", { class: "sub" }, sub),
  ]);
}

function buildQuickActions() {
  return el("div", { class: "card", style: "margin-top:16px" }, [
    el("h3", { style: "margin-bottom:12px" }, "Quick Actions"),
    el("div", { style: "display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;" }, [
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/savings") }, "💰 Savings Portal"),
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/loans") }, "📝 Apply for Loan"),
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/groups") }, "👥 Table Banking"),
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/profile") }, "👤 Update Password"),
    ])
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

function buildPortfolioChart(savings, loans, sharesVal) {
  const total = savings + loans + sharesVal;
  if (total === 0) {
    return el("div", { class: "portfolio-svg-container" }, [
      el("div", { html: `
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="45" fill="none" stroke="var(--line)" stroke-width="12" />
        </svg>
      ` }),
      el("div", { class: "portfolio-legend" }, [
        el("div", { class: "legend-item" }, [
          el("div", { class: "legend-color", style: "background:var(--line)" }),
          el("span", {}, "No transactions recorded yet")
        ])
      ])
    ]);
  }

  const pSavings = (savings / total) * 100;
  const pLoans = (loans / total) * 100;
  const pShares = (sharesVal / total) * 100;

  const circ = 2 * Math.PI * 45; // ~282.7

  const strokeSavings = circ * (pSavings / 100);
  const strokeLoans = circ * (pLoans / 100);
  const strokeShares = circ * (pShares / 100);

  const offsetSavings = 0;
  const offsetLoans = -strokeSavings;
  const offsetShares = -(strokeSavings + strokeLoans);

  const svgContent = `
    <svg width="120" height="120" viewBox="0 0 120 120" style="transform: rotate(-90deg)">
      <circle cx="60" cy="60" r="45" fill="none" stroke="var(--line)" stroke-width="12" />
      ${strokeSavings > 0 ? `<circle cx="60" cy="60" r="45" fill="none" stroke="var(--success)" stroke-width="12" stroke-dasharray="${strokeSavings} ${circ - strokeSavings}" stroke-dashoffset="${offsetSavings}" />` : ''}
      ${strokeLoans > 0 ? `<circle cx="60" cy="60" r="45" fill="none" stroke="var(--danger)" stroke-width="12" stroke-dasharray="${strokeLoans} ${circ - strokeLoans}" stroke-dashoffset="${offsetLoans}" />` : ''}
      ${strokeShares > 0 ? `<circle cx="60" cy="60" r="45" fill="none" stroke="var(--brass-500)" stroke-width="12" stroke-dasharray="${strokeShares} ${circ - strokeShares}" stroke-dashoffset="${offsetShares}" />` : ''}
    </svg>
  `;

  return el("div", { class: "portfolio-svg-container" }, [
    el("div", { html: svgContent }),
    el("div", { class: "portfolio-legend" }, [
      el("div", { class: "legend-item" }, [
        el("div", { class: "legend-color", style: "background:var(--success)" }),
        el("span", {}, `Savings: UGX ${formatMoney(savings)} (${pSavings.toFixed(1)}%)`)
      ]),
      el("div", { class: "legend-item" }, [
        el("div", { class: "legend-color", style: "background:var(--danger)" }),
        el("span", {}, `Loans: UGX ${formatMoney(loans)} (${pLoans.toFixed(1)}%)`)
      ]),
      el("div", { class: "legend-item" }, [
        el("div", { class: "legend-color", style: "background:var(--brass-500)" }),
        el("span", {}, `Shares Value: UGX ${formatMoney(sharesVal)} (${pShares.toFixed(1)}%)`)
      ])
    ])
  ]);
}

function buildActivityTimeline(accounts, loans) {
  const events = [];

  accounts.forEach((a) => {
    events.push({
      date: new Date(a.created_at || new Date()),
      title: `Savings Account Created`,
      desc: `Account No: ${a.account_number} was initialized with active status.`,
      iconColor: "var(--success)"
    });
  });

  loans.forEach((l) => {
    events.push({
      date: new Date(l.created_at || new Date()),
      title: `Loan Requested`,
      desc: `Requested UGX ${formatMoney(l.amount_requested)} (status: ${titleCase(l.status)}).`,
      iconColor: l.status === "approved" || l.status === "disbursed" ? "var(--success)" : l.status === "rejected" ? "var(--danger)" : "var(--brass-500)"
    });
  });

  events.sort((a, b) => b.date - a.date);

  const timelineItems = events.slice(0, 4).map((ev) => {
    return el("div", { class: "timeline-item" }, [
      el("div", { class: "timeline-icon", style: `border-color: ${ev.iconColor}` }),
      el("div", { class: "timeline-content" }, [
        el("div", { style: "font-weight:600" }, ev.title),
        el("div", { class: "muted small" }, ev.desc),
        el("div", { class: "timeline-date" }, formatDate(ev.date))
      ])
    ]);
  });

  return el("div", { class: "card" }, [
    el("h3", { style: "margin-bottom:14px" }, "Recent Activity Timeline"),
    timelineItems.length ? el("div", { class: "timeline" }, timelineItems) : el("p", { class: "muted empty-state" }, "No recent financial activities recorded.")
  ]);
}
