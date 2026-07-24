import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatDateTime, formatMoney, badge, showToast } from "../utils.js";
import { refreshCurrentRoute } from "../router.js";

/* Point this at whatever route your existing public sign-up page lives on.
   The referral code is appended as a query param: /register?ref=CODE */
const REGISTER_PATH = "/register";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function svgCopy() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
}
function svgCheck() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
}
function svgWhatsapp() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5s-.6-1.6-.9-2.1c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 20.2 12 8.2 8.2 0 0 1 12 20.2z"/></svg>`;
}
function svgSms() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}
function svgMail() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
}
function svgShare() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9"/></svg>`;
}
function svgTicket() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a1.5 1.5 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1.5 1.5 0 0 0 0-4z"/><path d="M9 8v8" stroke-dasharray="1.5 2.5"/></svg>`;
}

function icon(svg, cls) {
  const span = el("span", { class: `ref-icon${cls ? " " + cls : ""}` });
  span.innerHTML = svg;
  return span;
}

/* ------------------------------------------------------------------ */
/* Styles (scoped, additive — inherits your existing card/btn/grid CSS) */
/* ------------------------------------------------------------------ */

function ensureStyles() {
  if (document.getElementById("referrals-styles")) return;
  const style = el("style", { id: "referrals-styles" });
  style.textContent = `
.ref-view{
  --ref-accent: #1f9d6c;
  --ref-accent-dark: #167a54;
  --ref-gold: #cf9a3d;
  --ref-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

/* Voucher-style link card */
.ref-ticket{
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--ref-accent) 0%, var(--ref-accent-dark) 100%);
  color: #fff;
  border: none;
}
.ref-ticket::before, .ref-ticket::after{
  content:""; position:absolute; width:22px; height:22px; border-radius:50%;
  background: var(--card-bg, #fff); top:50%; transform: translateY(-50%);
}
.ref-ticket::before{ left:-11px; }
.ref-ticket::after{ right:-11px; }
.ref-ticket-top{ display:flex; align-items:center; gap:10px; margin-bottom: 4px; }
.ref-ticket-top .ref-icon{ width:20px; height:20px; opacity:.9; }
.ref-ticket-top .ref-icon svg{ width:100%; height:100%; }
.ref-ticket-title{ font-weight:700; font-size: 16px; }
.ref-ticket-sub{ opacity:.9; font-size: 13px; margin: 0 0 18px; }

.ref-code-row{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  background: rgba(255,255,255,.14); border: 1px dashed rgba(255,255,255,.55);
  border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;
}
.ref-code{ font-family: var(--ref-mono); font-size: 20px; letter-spacing: .12em; font-weight:600; }
.ref-code-label{ font-size: 10.5px; text-transform: uppercase; letter-spacing:.08em; opacity:.8; margin-bottom:3px; }

.ref-perf{
  border-top: 2px dashed rgba(255,255,255,.4);
  margin: 4px 0 16px;
  position: relative;
}

.ref-link-row{
  display:flex; align-items:center; gap:8px;
  background: rgba(255,255,255,.14); border-radius: 8px; padding: 8px 10px; margin-bottom: 16px;
}
.ref-link-text{
  flex:1; font-family: var(--ref-mono); font-size: 12.5px; overflow:hidden;
  text-overflow: ellipsis; white-space: nowrap; opacity: .95;
}

.ref-icon-btn{
  display:inline-flex; align-items:center; gap:6px;
  background: rgba(255,255,255,.2); color:#fff; border: 1px solid rgba(255,255,255,.35);
  border-radius: 7px; padding: 7px 11px; font-size: 12.5px; font-weight:600; cursor:pointer;
  transition: background .15s ease, transform .1s ease; flex:none;
}
.ref-icon-btn:hover{ background: rgba(255,255,255,.32); }
.ref-icon-btn:active{ transform: translateY(1px); }
.ref-icon-btn .ref-icon{ width:14px; height:14px; }
.ref-icon-btn .ref-icon svg{ width:100%; height:100%; }
.ref-icon-btn.ref-copied{ background: rgba(255,255,255,.95); color: var(--ref-accent-dark); }

.ref-share-row{ display:flex; gap:8px; flex-wrap:wrap; }
.ref-share-btn{
  display:flex; align-items:center; gap:7px;
  background: rgba(255,255,255,.16); color:#fff; border: 1px solid rgba(255,255,255,.3);
  border-radius: 8px; padding: 9px 13px; font-size: 13px; text-decoration:none; cursor:pointer;
  transition: background .15s ease;
}
.ref-share-btn:hover{ background: rgba(255,255,255,.3); }
.ref-share-btn .ref-icon{ width:16px; height:16px; }
.ref-share-btn .ref-icon svg{ width:100%; height:100%; }

.ref-ticket-loading, .ref-ticket-empty{ font-size: 13.5px; opacity:.95; }
.ref-ticket-empty button{
  margin-top:10px; background:#fff; color: var(--ref-accent-dark); border:none;
  border-radius: 7px; padding: 8px 14px; font-weight:600; font-size:13px; cursor:pointer;
}

/* Tabs */
.ref-tabs{ display:flex; gap:6px; margin-bottom:16px; border-bottom: 1px solid var(--border-color, #e5e5e5); }
.ref-tab{
  background:none; border:none; padding: 9px 4px; margin-right: 18px; font-size: 13.5px;
  color: var(--muted-color, #888); cursor:pointer; position:relative; font-weight:500;
}
.ref-tab[aria-selected="true"]{ color: var(--ref-accent-dark); font-weight:700; }
.ref-tab[aria-selected="true"]::after{
  content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px; background: var(--ref-accent);
}

.ref-fine-print{ font-size: 11.5px; opacity:.75; margin-top: 4px; }
`;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

async function tryEndpoints(candidates, method = "get", body) {
  for (const path of candidates) {
    try {
      const payload = method === "get" ? await api.get(path) : await api.post(path, body);
      return payload;
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }
  return null;
}

async function loadReferrals(memberId) {
  const payload = await tryEndpoints([
    `/api/v1/referrals/members/${memberId}`,
    `/api/v1/referrals?referrer_member_id=${memberId}`,
    `/api/v1/referrals?member_id=${memberId}`,
  ]);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.referrals)) return payload.referrals;
  return [];
}

function extractCode(payload) {
  if (!payload) return null;
  return payload.code || payload.referral_code || payload.data?.code || payload.data?.referral_code || null;
}

async function loadReferralCode(memberId) {
  const getCandidates = [
    `/api/v1/referrals/members/${memberId}/code`,
    `/api/v1/referrals/code?member_id=${memberId}`,
    `/api/v1/members/${memberId}/referral-code`,
  ];
  const existing = extractCode(await tryEndpoints(getCandidates));
  if (existing) return existing;
  const created = extractCode(await tryEndpoints([getCandidates[0]], "post", {}));
  return created;
}

/* ------------------------------------------------------------------ */
/* Referral link ticket card                                           */
/* ------------------------------------------------------------------ */

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  showToast("Copied to clipboard.", "success");
  if (btn) {
    const original = btn.innerHTML;
    btn.classList.add("ref-copied");
    mount(btn, [icon(svgCheck()), "Copied"]);
    setTimeout(() => {
      btn.classList.remove("ref-copied");
      btn.innerHTML = original;
    }, 1600);
  }
}

function populateTicket(card, memberId, { forceCreate = false } = {}) {
  mount(card, [el("div", { class: "ref-ticket-loading" }, forceCreate ? "Generating your link\u2026" : "Fetching your referral link\u2026")]);

  const codePromise = forceCreate
    ? tryEndpoints([`/api/v1/referrals/members/${memberId}/code`], "post", {}).then(extractCode)
    : loadReferralCode(memberId);

  codePromise
    .then((code) => {
      if (!code) {
        mount(card, [
          el("div", { class: "ref-ticket-top" }, [icon(svgTicket()), el("span", { class: "ref-ticket-title" }, "Your referral link")]),
          el("div", { class: "ref-ticket-empty" }, [
            el("p", {}, "You don't have a referral link yet."),
            el("button", { type: "button", onclick: () => populateTicket(card, memberId, { forceCreate: true }) }, "Generate my link"),
          ]),
        ]);
        return;
      }
      const url = `${window.location.origin}${REGISTER_PATH}?ref=${encodeURIComponent(code)}`;
      mount(card, [
        el("div", { class: "ref-ticket-top" }, [icon(svgTicket()), el("span", { class: "ref-ticket-title" }, "Your referral link")]),
        el("p", { class: "ref-ticket-sub" }, "Share this with friends and family. You earn a commission the moment they join."),

        el("div", { class: "ref-code-row" }, [
          el("div", {}, [
            el("div", { class: "ref-code-label" }, "Your code"),
            el("div", { class: "ref-code" }, code),
          ]),
          el("button", {
            type: "button",
            class: "ref-icon-btn",
            onclick: (e) => copyText(code, e.currentTarget),
          }, [icon(svgCopy()), "Copy code"]),
        ]),

        el("div", { class: "ref-link-row" }, [
          el("span", { class: "ref-link-text" }, url),
          el("button", {
            type: "button",
            class: "ref-icon-btn",
            onclick: (e) => copyText(url, e.currentTarget),
          }, [icon(svgCopy()), "Copy link"]),
        ]),

        el("div", { class: "ref-perf" }),

        buildShareRow(url),

        el("p", { class: "ref-fine-print" }, "Anyone who joins using your link is linked to you automatically \u2014 you'll be notified and credited right away."),
      ]);
    })
    .catch((err) => {
      mount(card, [
        el("div", { class: "ref-ticket-top" }, [icon(svgTicket()), el("span", { class: "ref-ticket-title" }, "Your referral link")]),
        el("p", { class: "ref-ticket-sub" }, `Couldn't load your link right now: ${err.message}`),
      ]);
    });
}

function buildTicket(memberId) {
  const card = el("div", { class: "card ref-ticket" });
  populateTicket(card, memberId);
  return card;
}

function buildShareRow(url) {
  const text = encodeURIComponent(`Join SACCO PRO using my referral link: ${url}`);
  const buttons = [
    el("a", { class: "ref-share-btn", href: `https://wa.me/?text=${text}`, target: "_blank", rel: "noopener" }, [icon(svgWhatsapp()), "WhatsApp"]),
    el("a", { class: "ref-share-btn", href: `sms:?body=${text}` }, [icon(svgSms()), "SMS"]),
    el("a", { class: "ref-share-btn", href: `mailto:?subject=${encodeURIComponent("Join me on SACCO PRO")}&body=${text}` }, [icon(svgMail()), "Email"]),
  ];
  if (navigator.share) {
    buttons.unshift(
      el("button", {
        type: "button",
        class: "ref-share-btn",
        onclick: () => navigator.share({ title: "Join SACCO PRO", text: "Join SACCO PRO using my referral link", url }).catch(() => {}),
      }, [icon(svgShare()), "Share"])
    );
  }
  return el("div", { class: "ref-share-row" }, buttons);
}

/* ------------------------------------------------------------------ */
/* Direct invite form (unchanged behavior, restyled)                   */
/* ------------------------------------------------------------------ */

function buildInviteForm(memberId) {
  const errorEl = el("p", { class: "form-error", hidden: true });
  const channelSelect = el("select", { id: "ref-channel" }, [
    el("option", { value: "sms" }, "SMS"),
    el("option", { value: "email" }, "Email"),
  ]);
  const contactInput = el("input", { id: "ref-contact", placeholder: "Phone number", required: true });

  channelSelect.addEventListener("change", () => {
    contactInput.placeholder = channelSelect.value === "sms" ? "Phone number" : "Email address";
    contactInput.type = channelSelect.value === "sms" ? "tel" : "email";
  });

  const form = el("form", {}, [
    el("div", { class: "field-row" }, [
      el("div", { class: "field" }, [el("label", {}, "Their name"), el("input", { id: "ref-name", required: true })]),
      el("div", { class: "field" }, [el("label", {}, "Invite via"), channelSelect]),
    ]),
    el("div", { class: "field" }, [el("label", {}, "Contact"), contactInput]),
    errorEl,
    el("button", { type: "submit", class: "btn btn-primary" }, "Send invitation"),
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    try {
      await api.post("/api/v1/referrals", {
        referrer_member_id: memberId,
        referred_name: form.querySelector("#ref-name").value,
        referred_contact: contactInput.value,
        channel: channelSelect.value,
      });
      showToast("Invitation sent!", "success");
      refreshCurrentRoute();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });

  return form;
}

/* ------------------------------------------------------------------ */
/* Main render                                                         */
/* ------------------------------------------------------------------ */

export async function renderReferrals(root) {
  ensureStyles();

  const memberId = requireMemberProfile();
  const referrals = await loadReferrals(memberId);

  const paidCount = referrals.filter((r) => r.status === "commission_paid").length;
  const pendingCount = referrals.length - paidCount;
  const totalEarned = referrals
    .filter((r) => r.commission_amount)
    .reduce((sum, r) => sum + Number(r.commission_amount), 0);

  const summary = el("div", { class: "grid grid-2" }, [
    el("div", { class: "card stat-card" }, [
      el("div", { class: "label" }, "People you've invited"),
      el("div", { class: "value ledger" }, `${referrals.length}`),
      el("div", { class: "sub" }, `${paidCount} became members \u00b7 ${pendingCount} pending`),
    ]),
    el("div", { class: "card stat-card" }, [
      el("div", { class: "label" }, "Commission earned"),
      el("div", { class: "value ledger" }, `UGX ${formatMoney(totalEarned)}`),
      el("div", { class: "sub" }, "Credited to your savings account"),
    ]),
  ]);

  const ticket = buildTicket(memberId);

  const tabLink = el("button", { type: "button", class: "ref-tab", "aria-selected": "true" }, "Share your link");
  const tabInvite = el("button", { type: "button", class: "ref-tab", "aria-selected": "false" }, "Send a direct invite");
  const panelHolder = el("div", {}, [ticket]);

  tabLink.addEventListener("click", () => {
    tabLink.setAttribute("aria-selected", "true");
    tabInvite.setAttribute("aria-selected", "false");
    mount(panelHolder, [ticket]);
  });
  tabInvite.addEventListener("click", () => {
    tabLink.setAttribute("aria-selected", "false");
    tabInvite.setAttribute("aria-selected", "true");
    mount(panelHolder, [buildInviteForm(memberId)]);
  });

  const inviteCard = el("div", { class: "card" }, [
    el("h3", {}, "Invite someone to join"),
    el("p", { class: "muted" }, "Know someone who'd benefit from being a member? Share your link or send them a direct invite \u2014 you'll earn a commission once they join."),
    el("div", { class: "ref-tabs" }, [tabLink, tabInvite]),
    panelHolder,
  ]);

  const listCard = el("div", { class: "card" }, [
    el("h3", {}, "Your invitations"),
    referrals.length
      ? el("div", { class: "table-wrap" }, [
          el("table", {}, [
            el("thead", {}, el("tr", {}, [
              el("th", {}, "Name"),
              el("th", {}, "Sent via"),
              el("th", {}, "Date"),
              el("th", {}, "Status"),
              el("th", {}, "Commission"),
            ])),
            el("tbody", {}, referrals.map((r) => el("tr", {}, [
              el("td", {}, r.referred_name),
              el("td", {}, r.channel === "sms" ? "SMS" : r.channel === "link" ? "Referral link" : "Email"),
              el("td", {}, formatDateTime(r.invited_at)),
              el("td", {}, badge(r.status)),
              el("td", { class: "ledger" }, r.commission_amount ? `UGX ${formatMoney(r.commission_amount)}` : "\u2014"),
            ]))),
          ]),
        ])
      : el("div", { class: "empty-state" }, [
          el("h4", {}, "No invitations yet"),
          el("p", {}, "Share your referral link above or use the direct invite form to invite your first person."),
        ]),
  ]);

  mount(root, [el("div", { class: "ref-view" }, [summary, inviteCard, listCard])]);
}