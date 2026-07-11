import { el, mount, formatMoney, showToast, openModal } from "../utils.js";

/* ============================================================
   Member Tools Hub — 10 interactive client-side widgets
   F1: Loan Calculator
   F2: Early Payoff Simulator
   F3: Savings Goal Tracker
   F4: Risk Profile Quiz
   F5: Financial Health Card
   F6: Dividends Simulator
   F7: Inflation Calculator
   F8: Currency Converter
   F9: Budget Planner
   F10: Financial Journal
   ============================================================ */

export async function renderTools(root) {
  const header = el("div", { class: "section-header" }, [
    el("h2", {}, [
      el("i", { class: "fa-solid fa-screwdriver-wrench" }),
      "Member Tools Hub"
    ]),
    el("p", { class: "muted small", style: "margin:0" }, "10 interactive financial utilities — all offline, private & instant.")
  ]);

  const grid = el("div", { class: "tools-grid" });

  grid.appendChild(buildLoanCalculator());
  grid.appendChild(buildPayoffSimulator());
  grid.appendChild(buildSavingsGoalTracker());
  grid.appendChild(buildRiskQuiz());
  grid.appendChild(buildHealthCard());
  grid.appendChild(buildDividendSimulator());
  grid.appendChild(buildInflationCalc());
  grid.appendChild(buildCurrencyConverter());
  grid.appendChild(buildBudgetPlanner());
  grid.appendChild(buildJournal());

  mount(root, [header, grid]);

  // Animate all tool cards in with stagger
  requestAnimationFrame(() => {
    const cards = grid.querySelectorAll(".tool-card");
    cards.forEach((c, i) => {
      c.style.opacity = "0";
      c.style.transform = "translateY(18px)";
      setTimeout(() => {
        c.style.transition = "opacity 0.35s ease, transform 0.35s ease";
        c.style.opacity = "1";
        c.style.transform = "translateY(0)";
      }, 60 + i * 55);
    });
  });
}

/* ── F1: Loan Calculator ─────────────────────────────────── */
function buildLoanCalculator() {
  const amountSlider = el("input", { type: "range", min: "500000", max: "50000000", step: "100000", value: "5000000", id: "lc-amount" });
  const termSlider = el("input", { type: "range", min: "1", max: "60", step: "1", value: "12", id: "lc-term" });
  const rateSlider = el("input", { type: "range", min: "5", max: "36", step: "0.5", value: "18", id: "lc-rate" });

  const amountLbl = el("span", { style: "font-weight:700;font-family:var(--font-ledger);" });
  const termLbl = el("span", { style: "font-weight:700;" });
  const rateLbl = el("span", { style: "font-weight:700;" });

  const resultBox = el("div", { class: "calc-result-box" });

  function calc() {
    const P = +amountSlider.value;
    const n = +termSlider.value;
    const r = +rateSlider.value / 100 / 12;
    const monthly = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    const interest = total - P;
    const pctInterest = (interest / total) * 100;
    const pctPrincipal = 100 - pctInterest;

    amountLbl.textContent = `UGX ${formatMoney(P)}`;
    termLbl.textContent = `${n} month${n > 1 ? "s" : ""}`;
    rateLbl.textContent = `${rateSlider.value}% p.a.`;

    resultBox.innerHTML = `
      <div class="cr-label">Monthly Repayment</div>
      <div class="cr-value">UGX ${formatMoney(monthly)}</div>
      <div class="calc-grid-3" style="margin-top:14px;">
        <div class="calc-mini">
          <div style="font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.05em;">Total</div>
          <div style="font-family:var(--font-ledger);font-weight:700;font-size:13px;">UGX ${formatMoney(total)}</div>
        </div>
        <div class="calc-mini">
          <div style="font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.05em;">Interest</div>
          <div style="font-family:var(--font-ledger);font-weight:700;font-size:13px;color:#DFB86C;">UGX ${formatMoney(interest)}</div>
        </div>
        <div class="calc-mini">
          <div style="font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.05em;">Int. Rate</div>
          <div style="font-family:var(--font-ledger);font-weight:700;font-size:13px;">${((interest / P) * 100).toFixed(1)}%</div>
        </div>
      </div>
      <div class="repayment-vis-label" style="margin-top:12px;color:rgba(255,255,255,0.65);">Principal vs Interest breakdown</div>
      <div class="repayment-vis-row">
        <div class="repayment-principal" style="flex:${pctPrincipal.toFixed(1)};">${pctPrincipal.toFixed(0)}%</div>
        <div class="repayment-interest" style="flex:${pctInterest.toFixed(1)};">${pctInterest.toFixed(0)}%</div>
      </div>
    `;
  }

  [amountSlider, termSlider, rateSlider].forEach(s => s.addEventListener("input", calc));
  setTimeout(calc, 0);

  return toolCard("fa-calculator", "Loan Calculator", "Compute monthly repayments", [
    labeledSlider("Loan Amount", amountSlider, amountLbl),
    labeledSlider("Loan Term", termSlider, termLbl),
    labeledSlider("Annual Rate", rateSlider, rateLbl),
    resultBox
  ]);
}

/* ── F2: Early Payoff Simulator ──────────────────────────── */
function buildPayoffSimulator() {
  const balInput = el("input", { type: "number", placeholder: "e.g. 10000000", id: "ep-balance", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const rateInput = el("input", { type: "number", placeholder: "e.g. 18", id: "ep-rate", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const extraInput = el("input", { type: "range", min: "0", max: "2000000", step: "50000", value: "200000", id: "ep-extra" });
  const extraLbl = el("span", {});
  const resultBox = el("div", { class: "payoff-saving" });
  resultBox.style.display = "none";

  function compute() {
    const bal = +balInput.value;
    const rate = +rateInput.value / 100 / 12;
    const extra = +extraInput.value;
    extraLbl.textContent = `Extra UGX ${formatMoney(extra)} / month`;

    if (!bal || !rate) { resultBox.style.display = "none"; return; }

    const minPayment = bal * rate * Math.pow(1 + rate, 60) / (Math.pow(1 + rate, 60) - 1);
    function months(payment) {
      let b = bal, m = 0;
      while (b > 0 && m < 600) { b = b * (1 + rate) - payment; m++; }
      return m;
    }
    const stdMonths = months(minPayment);
    const extraMonths = months(minPayment + extra);
    const saved = stdMonths - extraMonths;
    const intStd = minPayment * stdMonths - bal;
    const intExtra = (minPayment + extra) * extraMonths - bal;
    const intSaved = intStd - intExtra;

    resultBox.style.display = "flex";
    resultBox.innerHTML = `
      <i class="fa-solid fa-piggy-bank" style="font-size:28px;color:var(--success);flex-shrink:0;"></i>
      <div>
        <div class="pf-label">Interest Saved</div>
        <div class="pf-value">UGX ${formatMoney(Math.max(0, intSaved))}</div>
        <div style="font-size:12px;color:var(--ink-400);margin-top:4px;">Pay off <b>${Math.max(0, saved)} months</b> earlier</div>
      </div>
    `;
  }

  [balInput, rateInput, extraInput].forEach(i => i.addEventListener("input", compute));

  return toolCard("fa-forward-fast", "Early Payoff Simulator", "See how extra payments help", [
    field("Loan Balance (UGX)", balInput),
    field("Annual Interest Rate (%)", rateInput),
    el("div", { style: "margin-bottom:10px;" }, [
      el("div", { style: "display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--ink-600);margin-bottom:4px;" }, [
        el("span", {}, "Extra Monthly Payment"),
        extraLbl
      ]),
      extraInput
    ]),
    resultBox
  ]);
}

/* ── F3: Savings Goal Tracker ────────────────────────────── */
function buildSavingsGoalTracker() {
  const STORE_KEY = "sacco_savings_goals";
  function loadGoals() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
  function saveGoals(goals) { localStorage.setItem(STORE_KEY, JSON.stringify(goals)); }

  const listEl = el("div", { id: "goal-list" });

  function renderGoals() {
    const goals = loadGoals();
    listEl.innerHTML = "";
    if (!goals.length) {
      listEl.appendChild(el("p", { class: "muted small", style: "text-align:center;padding:14px 0;" }, "No goals yet. Add your first savings goal!"));
      return;
    }
    goals.forEach((g, i) => {
      const pct = Math.min(100, (g.saved / g.target) * 100);
      const circ = 138.2;
      const offset = circ * (1 - pct / 100);
      const row = el("div", { class: "goal-ring-wrapper" }, [
        el("div", { class: "goal-ring" }, [
          el("div", { html: `<svg width="54" height="54" viewBox="0 0 54 54"><circle class="ring-bg" cx="27" cy="27" r="22" /><circle class="ring-fill" cx="27" cy="27" r="22" style="stroke-dashoffset:${offset};" /></svg>` }),
          el("div", { class: "goal-ring-pct" }, `${pct.toFixed(0)}%`)
        ]),
        el("div", { class: "goal-info" }, [
          el("div", { class: "goal-name" }, [el("i", { class: `fa-solid ${g.icon} small`, style: "color:var(--brass-500);margin-right:5px;" }), g.name]),
          el("div", { class: "goal-meta" }, `UGX ${formatMoney(g.saved)} / ${formatMoney(g.target)}`),
          el("div", { class: "goal-progress-bar" }, [el("div", { class: "goal-progress-fill", style: `width:${pct}%` })])
        ]),
        el("button", { class: "btn btn-sm btn-danger", style: "padding:4px 8px;", onclick: () => { const gs = loadGoals(); gs.splice(i, 1); saveGoals(gs); renderGoals(); } }, [el("i", { class: "fa-solid fa-trash" })])
      ]);
      listEl.appendChild(row);
    });
  }

  const addBtn = el("button", { class: "btn btn-secondary btn-block goal-add-btn", onclick: () => {
    openModal("Add Savings Goal", (close) => {
      const nameI = el("input", { type: "text", placeholder: "e.g. Emergency Fund", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
      const targetI = el("input", { type: "number", placeholder: "e.g. 5000000", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
      const savedI = el("input", { type: "number", placeholder: "e.g. 500000", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
      return [el("div", {}, [
        field("Goal Name", nameI), field("Target Amount (UGX)", targetI), field("Already Saved (UGX)", savedI),
        el("div", { class: "modal-actions" }, [
          el("button", { class: "btn btn-secondary", onclick: close }, "Cancel"),
          el("button", { class: "btn btn-primary", onclick: () => {
            if (!nameI.value || !targetI.value) { showToast("Please fill in all fields.", "error"); return; }
            const icons = ["fa-piggy-bank", "fa-house", "fa-car", "fa-graduation-cap", "fa-plane", "fa-heartbeat"];
            const goals = loadGoals();
            goals.push({ name: nameI.value, target: +targetI.value, saved: +savedI.value || 0, icon: icons[goals.length % icons.length] });
            saveGoals(goals); renderGoals(); close();
            showToast(`Goal "${nameI.value}" added! 🎯`, "success");
          }}, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "add"), " Add Goal"])
        ])
      ])];
    });
  }}, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "add"), " Add Goal"]);

  renderGoals();
  return toolCard("fa-bullseye", "Savings Goal Tracker", "Track & visualize your financial goals", [listEl, addBtn]);
}

/* ── F4: Risk Profile Quiz ───────────────────────────────── */
function buildRiskQuiz() {
  const questions = [
    { q: "How long is your investment horizon?", opts: ["Less than 1 year", "1 – 3 years", "3 – 7 years", "Over 7 years"], icons: ["fa-clock", "fa-calendar", "fa-calendar-check", "fa-infinity"] },
    { q: "What is your reaction to a 20% drop in investment value?", opts: ["Sell everything immediately", "Sell some holdings", "Hold and wait", "Buy more at lower prices"], icons: ["fa-face-sad-tear", "fa-face-meh", "fa-face-smile", "fa-face-grin-stars"] },
    { q: "What percentage of income can you invest monthly?", opts: ["Less than 5%", "5% – 10%", "10% – 20%", "Over 20%"], icons: ["fa-piggy-bank", "fa-coins", "fa-money-bill", "fa-money-bill-trend-up"] },
    { q: "Your primary financial goal is:", opts: ["Preserve my capital", "Steady income", "Balanced growth", "Maximum growth"], icons: ["fa-shield", "fa-hand-holding-dollar", "fa-scale-balanced", "fa-rocket"] },
  ];

  let step = 0, scores = [];
  const container = el("div", { class: "quiz-step" });
  const progress = el("div", { class: "quiz-progress-fill", style: "width:0%;" });

  function renderStep() {
    container.innerHTML = "";
    progress.style.width = `${(step / questions.length) * 100}%`;
    if (step >= questions.length) {
      const total = scores.reduce((a, b) => a + b, 0);
      const max = questions.length * 3;
      const pct = total / max;
      let profile, color, icon;
      if (pct < 0.25) { profile = "Conservative"; color = "var(--success)"; icon = "fa-shield-heart"; }
      else if (pct < 0.5) { profile = "Moderate"; color = "var(--warn)"; icon = "fa-scale-balanced"; }
      else if (pct < 0.75) { profile = "Balanced Growth"; color = "var(--pine-700)"; icon = "fa-chart-line"; }
      else { profile = "Aggressive"; color = "var(--danger)"; icon = "fa-rocket"; }
      container.appendChild(el("div", { class: "risk-result-badge", style: `background:${color}15;border:2px solid ${color};` }, [
        el("i", { class: `fa-solid ${icon}`, style: `color:${color};font-size:44px;display:block;margin-bottom:10px;` }),
        el("h3", { style: `color:${color};margin:0 0 6px;` }, profile),
        el("p", { class: "muted small" }, "Your investment risk tolerance profile"),
        el("button", { class: "btn btn-secondary btn-sm", style: "margin-top:12px;", onclick: () => { step = 0; scores = []; renderStep(); } }, [el("i", { class: "fa-solid fa-rotate-left" }), " Retake Quiz"])
      ]));
      return;
    }
    const q = questions[step];
    container.appendChild(el("p", { style: "font-size:14px;font-weight:600;margin-bottom:12px;" }, [el("span", { class: "muted small", style: "display:block;margin-bottom:4px;" }, `Question ${step + 1} of ${questions.length}`), q.q]));
    q.opts.forEach((opt, i) => {
      const optEl = el("div", { class: "quiz-opt", onclick: () => { scores.push(i); step++; renderStep(); } }, [
        el("i", { class: `fa-solid ${q.icons[i]}`, style: "width:20px;text-align:center;color:var(--brass-500);" }),
        el("span", {}, opt)
      ]);
      container.appendChild(optEl);
    });
  }

  renderStep();
  return toolCard("fa-brain", "Risk Profile Quiz", "Discover your investment personality", [
    el("div", { class: "quiz-progress-bar" }, [progress]),
    container
  ]);
}

/* ── F5: Financial Health Card ───────────────────────────── */
function buildHealthCard() {
  const savingsI = el("input", { type: "number", placeholder: "Your monthly savings (UGX)", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const incomeI = el("input", { type: "number", placeholder: "Your monthly income (UGX)", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const debtI = el("input", { type: "number", placeholder: "Total monthly loan payments (UGX)", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const resultEl = el("div", {});

  function analyze() {
    const savings = +savingsI.value || 0;
    const income = +incomeI.value || 1;
    const debt = +debtI.value || 0;
    const savingsRate = (savings / income) * 100;
    const dti = (debt / income) * 100;
    let score = 0;
    if (savingsRate >= 20) score += 40;
    else if (savingsRate >= 10) score += 25;
    else if (savingsRate >= 5) score += 10;
    if (dti < 20) score += 40;
    else if (dti < 35) score += 22;
    else if (dti < 50) score += 10;
    if (income > 1000000) score += 20;
    else if (income > 500000) score += 12;

    const clamp = Math.min(100, Math.max(0, score));
    let color, level;
    if (clamp >= 75) { color = "var(--success)"; level = "Excellent"; }
    else if (clamp >= 50) { color = "var(--pine-700)"; level = "Good"; }
    else if (clamp >= 30) { color = "var(--warn)"; level = "Fair"; }
    else { color = "var(--danger)"; level = "Needs Attention"; }

    // Semicircle gauge SVG
    const angle = (clamp / 100) * 180;
    const rad = angle * Math.PI / 180;
    const cx = 80, cy = 80, r = 60;
    const x = cx + r * Math.cos(Math.PI - rad);
    const y = cy - r * Math.sin(Math.PI - rad);
    const gaugeSvg = `<svg width="160" height="90" viewBox="0 0 160 90">
      <path d="M20,80 A60,60,0,0,1,140,80" fill="none" stroke="var(--line)" stroke-width="12" stroke-linecap="round"/>
      <path d="M20,80 A60,60,0,0,1,${x.toFixed(2)},${y.toFixed(2)}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" style="transition:all 0.8s ease;"/>
    </svg>`;

    resultEl.innerHTML = "";
    resultEl.appendChild(el("div", { class: "gauge-svg-wrap" }, [
      el("div", { html: gaugeSvg }),
      el("div", { class: "gauge-score-label", style: `color:${color};` }, `${clamp}`),
      el("div", { class: "gauge-level-label", style: `color:${color};` }, level)
    ]));
    const factors = [
      { label: "Savings Rate", val: savingsRate.toFixed(1) + "%", fill: Math.min(100, savingsRate * 2.5), color: savingsRate >= 20 ? "var(--success)" : savingsRate >= 10 ? "var(--warn)" : "var(--danger)", icon: "fa-piggy-bank" },
      { label: "Debt-to-Income", val: dti.toFixed(1) + "%", fill: Math.max(0, 100 - dti * 2), color: dti < 20 ? "var(--success)" : dti < 35 ? "var(--warn)" : "var(--danger)", icon: "fa-hand-holding-dollar" },
    ];
    const factorWrap = el("div", { class: "health-factors" });
    factors.forEach(f => {
      factorWrap.appendChild(el("div", { class: "health-factor" }, [
        el("i", { class: `fa-solid ${f.icon}`, style: `color:${f.color}` }),
        el("span", { style: "flex:none;min-width:110px;font-size:12px;" }, f.label),
        el("div", { class: "hf-bar" }, [el("div", { class: "hf-bar-fill", style: `width:${f.fill}%;background:${f.color};` })]),
        el("span", { class: "hf-val", style: `color:${f.color};` }, f.val)
      ]));
    });
    resultEl.appendChild(factorWrap);
  }

  [savingsI, incomeI, debtI].forEach(i => i.addEventListener("input", analyze));
  return toolCard("fa-heart-pulse", "Financial Health Card", "Score your financial wellness", [
    field("Monthly Savings (UGX)", savingsI),
    field("Monthly Income (UGX)", incomeI),
    field("Monthly Loan Payments (UGX)", debtI),
    resultEl
  ]);
}

/* ── F6: Dividends Simulator ─────────────────────────────── */
function buildDividendSimulator() {
  const principalSlider = el("input", { type: "range", min: "100000", max: "10000000", step: "100000", value: "1000000" });
  const rateSlider = el("input", { type: "range", min: "1", max: "30", step: "0.5", value: "12" });
  const yearsSlider = el("input", { type: "range", min: "1", max: "10", step: "1", value: "5" });
  const pLbl = el("span", {}), rLbl = el("span", {}), yLbl = el("span", {});
  const resultEl = el("div", { class: "dividend-result" });
  const barsEl = el("div", { class: "dividend-bars" });

  function compute() {
    const P = +principalSlider.value;
    const r = +rateSlider.value / 100;
    const n = +yearsSlider.value;
    pLbl.textContent = `UGX ${formatMoney(P)}`;
    rLbl.textContent = `${rateSlider.value}% p.a.`;
    yLbl.textContent = `${n} year${n > 1 ? "s" : ""}`;

    const final = P * Math.pow(1 + r, n);
    const gain = final - P;

    const yearlyValues = Array.from({ length: n }, (_, i) => P * Math.pow(1 + r, i + 1));
    const maxVal = yearlyValues[yearlyValues.length - 1];

    resultEl.innerHTML = `
      <div class="div-label">Projected Value after ${n} year${n > 1 ? "s" : ""}</div>
      <div class="div-main">UGX ${formatMoney(final)}</div>
      <div class="div-label" style="margin-top:6px;">Total Gain: <b style="color:var(--brass-600);">UGX ${formatMoney(gain)}</b></div>
    `;

    barsEl.innerHTML = "";
    yearlyValues.forEach((v, i) => {
      const h = (v / maxVal) * 56;
      const col = el("div", { style: "display:flex;flex-direction:column;align-items:center;flex:1;" }, [
        el("div", { class: "dividend-bar", style: `height:${h}px;` }),
        el("div", { class: "dividend-bar-label" }, `Y${i + 1}`)
      ]);
      barsEl.appendChild(col);
    });
  }

  [principalSlider, rateSlider, yearsSlider].forEach(s => s.addEventListener("input", compute));
  setTimeout(compute, 0);

  return toolCard("fa-chart-line", "Dividends Simulator", "Model compound share growth", [
    labeledSlider("Principal", principalSlider, pLbl),
    labeledSlider("Annual Return", rateSlider, rLbl),
    labeledSlider("Years", yearsSlider, yLbl),
    resultEl,
    barsEl
  ]);
}

/* ── F7: Inflation Calculator ────────────────────────────── */
function buildInflationCalc() {
  const amountI = el("input", { type: "number", placeholder: "e.g. 1000000", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const inflationSlider = el("input", { type: "range", min: "1", max: "20", step: "0.5", value: "8" });
  const yearsSlider = el("input", { type: "range", min: "1", max: "20", step: "1", value: "5" });
  const infLbl = el("span", {}), yLbl = el("span", {});
  const resultEl = el("div", {});

  function compute() {
    const amt = +amountI.value || 1000000;
    const inf = +inflationSlider.value / 100;
    const n = +yearsSlider.value;
    infLbl.textContent = `${inflationSlider.value}% p.a.`;
    yLbl.textContent = `${n} year${n > 1 ? "s" : ""}`;

    const realValue = amt / Math.pow(1 + inf, n);
    const powerLost = amt - realValue;

    const maxH = 70;
    const realPct = realValue / amt;

    resultEl.innerHTML = `
      <div style="background:var(--danger-bg);border-radius:10px;padding:14px;margin-top:10px;border:1px solid rgba(179,38,30,0.15);">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--danger);font-weight:700;">Real Purchasing Power in ${n} years</div>
        <div style="font-family:var(--font-ledger);font-size:22px;font-weight:700;color:var(--danger);">UGX ${formatMoney(realValue)}</div>
        <div style="font-size:12px;color:var(--ink-600);margin-top:4px;">Lost <b>UGX ${formatMoney(powerLost)}</b> to inflation (${((powerLost / amt) * 100).toFixed(1)}%)</div>
        <div style="display:flex;gap:4px;align-items:flex-end;height:${maxH}px;margin-top:12px;">
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:36px;background:var(--pine-700);border-radius:4px 4px 0 0;height:${maxH}px;transition:height 0.5s;"></div>
            <div style="font-size:10px;color:var(--ink-400);">Now</div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:36px;background:var(--danger);opacity:.7;border-radius:4px 4px 0 0;height:${(realPct * maxH).toFixed(1)}px;transition:height 0.5s;"></div>
            <div style="font-size:10px;color:var(--ink-400);">Year ${n}</div>
          </div>
        </div>
      </div>
    `;
  }

  amountI.addEventListener("input", compute);
  [inflationSlider, yearsSlider].forEach(s => s.addEventListener("input", compute));
  return toolCard("fa-arrow-trend-down", "Inflation Calculator", "Visualize purchasing power loss", [
    field("Current Amount (UGX)", amountI),
    labeledSlider("Inflation Rate", inflationSlider, infLbl),
    labeledSlider("Years Ahead", yearsSlider, yLbl),
    resultEl
  ]);
}

/* ── F8: Currency Converter ──────────────────────────────── */
function buildCurrencyConverter() {
  const RATES = { UGX: 1, USD: 0.000264, KES: 0.034, EUR: 0.000244, GBP: 0.000208 };
  const FLAGS = { UGX: "🇺🇬", USD: "🇺🇸", KES: "🇰🇪", EUR: "🇪🇺", GBP: "🇬🇧" };
  let fromCur = "UGX", toCur = "USD";

  const amtInput = el("input", { type: "number", placeholder: "Amount", value: "1000000", style: "width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const fromSel = el("select", { style: "padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const toSel = el("select", { style: "padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--paper);" });
  const resultEl = el("div", { class: "currency-display" });

  Object.keys(RATES).forEach(c => {
    fromSel.appendChild(el("option", { value: c, selected: c === fromCur }, `${FLAGS[c]} ${c}`));
    toSel.appendChild(el("option", { value: c, selected: c === toCur }, `${FLAGS[c]} ${c}`));
  });

  const swapBtn = el("button", { class: "currency-swap-btn", title: "Swap currencies", onclick: () => {
    const temp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = temp;
    convert();
  }}, [el("i", { class: "fa-solid fa-arrows-rotate" })]);

  function convert() {
    const amt = +amtInput.value || 0;
    const from = fromSel.value;
    const to = toSel.value;
    const inUGX = amt / RATES[from];
    const converted = inUGX * RATES[to];
    resultEl.innerHTML = `
      <div style="font-size:11px;color:var(--ink-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Converted Amount</div>
      <div style="font-family:var(--font-ledger);font-size:22px;font-weight:700;color:var(--pine-900);">${FLAGS[to]} ${to} ${converted.toLocaleString("en-UG", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
      <div class="rate-grid" style="margin-top:10px;">
        <div class="rate-item"><div style="font-size:11px;color:var(--ink-400);">1 ${from}</div><div class="rate-value">${(RATES[to] / RATES[from]).toFixed(6)} ${to}</div></div>
        <div class="rate-item"><div style="font-size:11px;color:var(--ink-400);">1 ${to}</div><div class="rate-value">${(RATES[from] / RATES[to]).toFixed(4)} ${from}</div></div>
      </div>
      <div style="font-size:10px;color:var(--ink-400);margin-top:6px;"><i class="fa-solid fa-circle-info"></i> Indicative rates — not live prices</div>
    `;
  }

  [amtInput, fromSel, toSel].forEach(el2 => el2.addEventListener("input", convert));
  setTimeout(convert, 0);

  return toolCard("fa-coins", "Currency Converter", "UGX, USD, KES, EUR, GBP", [
    field("Amount", amtInput),
    el("div", { style: "display:flex;gap:10px;align-items:center;margin-bottom:12px;" }, [fromSel, swapBtn, toSel]),
    resultEl
  ]);
}

/* ── F9: Budget Planner ──────────────────────────────────── */
function buildBudgetPlanner() {
  const incomeI = el("input", { type: "number", placeholder: "Monthly Income (UGX)", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);margin-bottom:12px;" });
  const listEl = el("div", {});
  const categories = [
    { name: "Housing & Rent", pct: 30, icon: "fa-house", color: "#1B4B43" },
    { name: "Food & Groceries", pct: 20, icon: "fa-utensils", color: "#C89B3C" },
    { name: "Transport", pct: 15, icon: "fa-bus", color: "#23685C" },
    { name: "Savings & Investments", pct: 20, icon: "fa-piggy-bank", color: "#8B7D60" },
    { name: "Healthcare", pct: 5, icon: "fa-syringe", color: "#B3261E" },
    { name: "Entertainment", pct: 10, icon: "fa-film", color: "#A97F2A" },
  ];

  function renderList() {
    const income = +incomeI.value || 0;
    listEl.innerHTML = "";
    categories.forEach(c => {
      const amt = (income * c.pct) / 100;
      listEl.appendChild(el("div", { class: "budget-category" }, [
        el("div", { class: "budget-cat-icon", style: `background:${c.color}18;color:${c.color};` }, [el("i", { class: `fa-solid ${c.icon}` })]),
        el("div", { class: "budget-cat-info" }, [
          el("div", { class: "budget-cat-name" }, c.name),
          el("div", { style: "font-size:11px;color:var(--ink-400);" }, income ? `UGX ${formatMoney(amt)}` : "Enter income above"),
          el("div", { class: "budget-bar" }, [el("div", { class: "budget-bar-fill", style: `width:${c.pct}%;background:${c.color};` })])
        ]),
        el("div", { class: "budget-cat-pct", style: `color:${c.color};` }, `${c.pct}%`)
      ]));
    });
  }

  incomeI.addEventListener("input", renderList);
  renderList();

  return toolCard("fa-chart-pie", "Budget Planner", "Visualize your income allocation", [incomeI, listEl]);
}

/* ── F10: Financial Journal ──────────────────────────────── */
function buildJournal() {
  const KEY = "sacco_journal";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function save(e) { localStorage.setItem(KEY, JSON.stringify(e)); }

  const listEl = el("div", { style: "max-height:200px;overflow-y:auto;" });
  const textarea = el("textarea", { class: "journal-textarea", placeholder: "Write a private financial note or reflection…", style: "width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);font-size:13px;resize:vertical;min-height:70px;" });

  function render() {
    const entries = load();
    listEl.innerHTML = "";
    if (!entries.length) {
      listEl.appendChild(el("p", { class: "muted small", style: "text-align:center;padding:10px 0;" }, "Your journal is empty. Start writing!"));
      return;
    }
    entries.slice().reverse().forEach((e, i) => {
      const realI = entries.length - 1 - i;
      const row = el("div", { class: "journal-entry" }, [
        el("div", { class: "journal-entry-date" }, [el("i", { class: "fa-regular fa-clock", style: "margin-right:4px;" }), new Date(e.ts).toLocaleString("en-GB")]),
        el("div", { class: "journal-entry-text" }, e.text),
        el("button", { class: "journal-delete-btn", title: "Delete", onclick: () => { const es = load(); es.splice(realI, 1); save(es); render(); } }, [el("i", { class: "fa-solid fa-trash-can" })])
      ]);
      listEl.appendChild(row);
    });
  }

  const saveBtn = el("button", { class: "btn btn-primary btn-sm", style: "margin-top:8px;", onclick: () => {
    if (!textarea.value.trim()) { showToast("Write something first.", "warn"); return; }
    const entries = load();
    entries.push({ text: textarea.value.trim(), ts: Date.now() });
    save(entries); textarea.value = ""; render();
    showToast("Journal entry saved! 📖", "success");
  }}, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "save"), " Save Entry"]);

  render();
  return toolCard("fa-book-open", "Financial Journal", "Private notes — stored locally", [listEl, textarea, saveBtn]);
}

/* ── Helpers ─────────────────────────────────────────────── */
function toolCard(iconClass, title, subtitle, children) {
  const card = el("div", { class: "tool-card" });
  card.appendChild(el("div", { class: "tool-card-header" }, [
    el("div", { class: "tool-card-icon" }, [el("i", { class: `fa-solid ${iconClass}` })]),
    el("div", {}, [
      el("h3", {}, title),
      el("p", {}, subtitle)
    ])
  ]));
  children.forEach(c => c && card.appendChild(c));
  return card;
}

function field(label, input) {
  const wrap = el("div", { style: "margin-bottom:10px;" });
  wrap.appendChild(el("div", { style: "font-size:12.5px;font-weight:600;color:var(--ink-600);margin-bottom:4px;" }, label));
  wrap.appendChild(input);
  return wrap;
}

function labeledSlider(label, slider, valueEl) {
  const row = el("div", { style: "display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--ink-600);margin-bottom:4px;" });
  row.appendChild(el("span", {}, label));
  row.appendChild(valueEl);
  const wrap = el("div", { style: "margin-bottom:12px;" });
  wrap.appendChild(row);
  wrap.appendChild(slider);
  return wrap;
}
