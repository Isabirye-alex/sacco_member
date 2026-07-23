import { api } from "../api.js";
import { getCurrentUser, getCurrentMember, requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDate, badge, titleCase, renderSkeleton, openModal, showToast } from "../utils.js";
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
  const totalSharesVal = holdings.reduce((sum, h) => sum + Number(h.total_value || (h.number_of_shares * 10000) || 0), 0);

  const ticker = buildNewsTicker();

  const welcomeCard = el("div", { class: "card", style: "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;" }, [
    el("div", {}, [
      el("h3", {}, [
        el("span", { class: "material-symbols-rounded filled", style: "color:var(--brass-500);margin-right:8px;font-size:22px;" }, "waving_hand"),
        `Welcome back, ${member ? member.first_name : user.full_name.split(" ")[0]}`
      ]),
      el("p", { class: "muted", style: "margin:0" }, member
        ? `Member No. ${member.member_number} · Joined ${formatDate(member.date_joined)} · ${titleCase(member.status)}`
        : "Loading your member profile…"),
    ]),
    el("button", { class: "btn btn-secondary btn-sm", onclick: () => showBadgesModal(accounts, loans, totalShares) }, [
      el("span", { class: "material-symbols-rounded filled", style: "font-size:15px;vertical-align:-2px;margin-right:4px;color:var(--brass-500);" }, "emoji_events"),
      " My Badges"
    ])
  ]);

  const quickActions = buildQuickActions();

  const statCards = el("div", { class: "grid grid-3 stats-grid", style: "margin-top:16px" }, [
    statCard("Total Savings", formatMoney(totalSavings), `${accounts.length} account${accounts.length === 1 ? "" : "s"}`, "fa-vault"),
    statCard("Active Loans", `${activeLoans.length}`, activeLoans.length ? `${formatMoney(totalOutstanding)} approved` : "No active loans", "fa-hand-holding-dollar"),
    statCard("Shares Held", `${totalShares}`, `${holdings.length} product${holdings.length === 1 ? "" : "s"}`, "fa-chart-pie"),
  ]);

  const recentAccountsCard = buildAccountsPreview(accounts);
  const recentLoansCard = buildLoansPreview(loans);
  
  const portfolioChartCard = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("h3", {}, [el("i", { class: "fa-solid fa-chart-donut" }), " Portfolio Allocation"])]),
    buildPortfolioChart(totalSavings, totalOutstanding, totalSharesVal)
  ]);

  const activityTimelineCard = buildActivityTimeline(accounts, loans);

  mount(root, [
    ticker,
    welcomeCard, 
    quickActions, 
    statCards, 
    el("div", { class: "grid grid-2", style: "margin-top:16px" }, [recentAccountsCard, recentLoansCard]),
    el("div", { class: "grid grid-2", style: "margin-top:16px" }, [portfolioChartCard, activityTimelineCard])
  ]);
}

function statCard(label, value, sub, iconClass) {
  return el("div", { class: "card stat-card interactive", onclick: () => {
    if (label.includes("Savings")) goTo("/savings");
    else if (label.includes("Loans")) goTo("/loans");
    else if (label.includes("Shares")) goTo("/shares");
  }}, [
    el("div", { class: "label" }, [iconClass ? el("i", { class: `fa-solid ${iconClass}` }) : null, label].filter(Boolean)),
    el("div", { class: "value ledger" }, value),
    el("div", { class: "sub" }, sub),
  ]);
}

function buildQuickActions() {
  return el("div", { class: "card", style: "margin-top:16px" }, [
    el("div", { class: "card-header" }, [el("h3", {}, [el("i", { class: "fa-solid fa-bolt" }), " Quick Actions"])]),
    el("div", { style: "display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;" }, [
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/savings") }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "account_balance"), " Savings Portal"]),
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/loans") }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "payments"), " Apply for Loan"]),
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/groups") }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "groups"), " Table Banking"]),
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/tools") }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "construction"), " Member Tools"]),
      el("button", { class: "btn btn-secondary btn-block", onclick: () => goTo("/profile") }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "key"), " Update Password"]),
    ])
  ]);
}

/* ── F12: News Ticker ─────────────────────────────────────── */
function buildNewsTicker() {
  const announcements = [
    { icon: "fa-bell", text: "SACCO AGM scheduled for August 30th — all members expected to attend." },
    { icon: "fa-chart-line", text: "Q2 dividends of 14% approved and will be credited to share accounts by July 25th." },
    { icon: "fa-hand-holding-dollar", text: "Emergency loan limit increased to UGX 10,000,000 for active members." },
    { icon: "fa-piggy-bank", text: "New Fixed Deposit product launched — earn up to 16% p.a. on savings above UGX 2M." },
    { icon: "fa-trophy", text: "Top Savers of Q2 will be awarded at the next member meeting — keep saving!" },
    { icon: "fa-shield-halved", text: "System upgrade on Saturday 2:00–4:00 AM EAT. Portal may be temporarily unavailable." },
  ];
  const track = el("div", { class: "ticker-track" });
  // Double the items so the scroll feels seamless
  [...announcements, ...announcements].forEach(a => {
    track.appendChild(el("span", { class: "ticker-item" }, [
      el("i", { class: `fa-solid ${a.icon}` }),
      " " + a.text
    ]));
  });
  return el("div", { class: "news-ticker", style: "margin-bottom:16px;" }, [
    el("div", { class: "ticker-label" }, [el("i", { class: "fa-solid fa-satellite-dish" }), " SACCO NEWS"]),
    el("div", { class: "ticker-track-wrap" }, [track])
  ]);
}

/* ── F13: Achievement Badges Modal ───────────────────────── */
function showBadgesModal(accounts, loans, shares) {
  const badgeDefinitions = [
    { name: "First Saver", desc: "Open a savings account", icon: "fa-piggy-bank", color: "var(--success)", unlocked: accounts.length > 0 },
    { name: "Loan Seeker", desc: "Apply for your first loan", icon: "fa-hand-holding-dollar", color: "var(--pine-700)", unlocked: loans.length > 0 },
    { name: "Shareholder", desc: "Hold at least 1 share", icon: "fa-chart-pie", color: "var(--brass-500)", unlocked: shares > 0 },
    { name: "Multi-Saver", desc: "Open 3+ savings accounts", icon: "fa-vault", color: "var(--pine-800)", unlocked: accounts.length >= 3 },
    { name: "Diversified", desc: "Have savings, loan & shares", icon: "fa-layer-group", color: "var(--brass-600)", unlocked: accounts.length > 0 && loans.length > 0 && shares > 0 },
    { name: "Active Member", desc: "Log in 5+ times", icon: "fa-star", color: "var(--warn)", unlocked: +localStorage.getItem("sacco_login_count") >= 5 },
    { name: "Power User", desc: "Use Member Tools", icon: "fa-screwdriver-wrench", color: "var(--pine-700)", unlocked: !!localStorage.getItem("sacco_savings_goals") || !!localStorage.getItem("sacco_journal") },
    { name: "Goal Setter", desc: "Add a savings goal", icon: "fa-bullseye", color: "var(--danger)", unlocked: (() => { try { return JSON.parse(localStorage.getItem("sacco_savings_goals") || "[]").length > 0; } catch { return false; } })() },
    { name: "Journaler", desc: "Write a financial journal entry", icon: "fa-book-open", color: "var(--brass-500)", unlocked: (() => { try { return JSON.parse(localStorage.getItem("sacco_journal") || "[]").length > 0; } catch { return false; } })() },
  ];

  const unlocked = badgeDefinitions.filter(b => b.unlocked).length;

  openModal("🏆 My Achievement Badges", (close) => {
    const grid = el("div", { class: "badges-grid" });
    badgeDefinitions.forEach(b => {
      grid.appendChild(el("div", { class: `badge-item ${b.unlocked ? "unlocked" : "locked"}` }, [
        el("i", { class: `fa-solid ${b.icon}`, style: `color:${b.unlocked ? b.color : "var(--ink-400)"};font-size:28px;` }),
        el("div", { class: "badge-name" }, b.name),
        el("div", { class: "badge-desc" }, b.desc),
        b.unlocked ? el("span", { style: "font-size:10px;color:var(--success);font-weight:700;" }, "✓ Unlocked") : el("span", { style: "font-size:10px;color:var(--ink-400);" }, "🔒 Locked")
      ]));
    });
    return [el("div", {}, [
      el("p", { class: "muted small", style: "margin-bottom:14px;" }, [
        el("i", { class: "fa-solid fa-trophy", style: "color:var(--brass-500);margin-right:6px;" }),
        `${unlocked} of ${badgeDefinitions.length} badges unlocked`
      ]),
      grid,
      el("div", { class: "modal-actions" }, [el("button", { class: "btn btn-primary", onclick: close }, "Close")])
    ])];
  });
}

function buildAccountsPreview(accounts) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("h3", {}, "Savings accounts"),
      el("button", { class: "btn btn-secondary btn-sm", onclick: () => goTo("/savings") }, [el("span", { class: "material-symbols-rounded", style: "font-size:14px;vertical-align:-2px;margin-right:4px;" }, "arrow_forward"), "View all"]),
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
      el("button", { class: "btn btn-secondary btn-sm", onclick: () => goTo("/loans") }, [el("span", { class: "material-symbols-rounded", style: "font-size:14px;vertical-align:-2px;margin-right:4px;" }, "arrow_forward"), "View all"]),
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
