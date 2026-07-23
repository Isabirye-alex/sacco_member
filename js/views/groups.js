import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDate, titleCase, renderSkeleton, openModal, exportToCSV, showToast } from "../utils.js";

export async function renderGroups(root) {
  const memberId = requireMemberProfile();

  // Render shimmer loader immediately before data fetch
  renderSkeleton(root, "card");

  let memberships = [];
  try {
    memberships = await api.get(`/api/v1/groups/members/${memberId}/memberships`);
  } catch (err) {
    mount(
      root,
      el("div", { class: "card" }, [
        el("h3", {}, "Could not load group memberships"),
        el("p", { class: "muted" }, err.message || "Please check your connection and try again."),
        el("button", { class: "btn btn-primary", onclick: () => renderGroups(root) }, "Retry")
      ])
    );
    return;
  }

  if (!memberships.length) {
    mount(
      root,
      el("div", { class: "card empty-state" }, [
        el("h4", {}, "You're not part of any group yet"),
        el("p", {}, "Table-banking groups let members pool contributions and guarantee loans together."),
      ])
    );
    return;
  }

  const cards = await Promise.all(memberships.map((m) => buildGroupCard(m, memberId)));
  mount(root, cards);
}

async function buildGroupCard(membership, memberId) {
  const contributions = await api.get(`/api/v1/groups/${membership.group_id}/contributions`);
  const myContributions = contributions.filter((c) => c.member_id === memberId);
  const total = myContributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const card = el("div", {
    class: "card interactive",
    style: "display:flex; justify-content:space-between; align-items:center; cursor:pointer;",
    onclick: () => showGroupDetailsModal(membership, myContributions, total)
  }, [
    el("div", {}, [
      el("h3", {}, membership.group_name),
      el("div", { class: "muted small" }, `${titleCase(membership.role)} \u00b7 Joined ${formatDate(membership.joined_date)}`),
      el("div", { class: "muted small", style: "margin-top:6px; color:var(--brass-600)" }, "Click to view full details & contributions")
    ]),
    el("div", { class: "ledger", style: "font-size:20px; font-weight:600; color:var(--heading-color)" }, `UGX ${formatMoney(total)}`),
  ]);

  return card;
}

function showGroupDetailsModal(membership, myContributions, total) {
  openModal(`${membership.group_name} — Details`, (closeFn) => {
    const exportBtn = el("button", {
      class: "btn btn-secondary btn-sm",
      onclick: () => {
        const headers = ["Contribution Date", "Amount (UGX)"];
        const rows = myContributions.map((c) => [
          formatDate(c.contribution_date),
          c.amount
        ]);
        exportToCSV(`contributions_${membership.group_name.replace(/\s+/g, '_')}.csv`, headers, rows);
        showToast("Contributions log exported successfully", "success");
      }
    }, [el("span", { class: "material-symbols-rounded", style: "font-size:15px;vertical-align:-2px;margin-right:4px;" }, "download"), " Export CSV"]);

    const statSection = el("div", { class: "calculator-preview", style: "margin-bottom:16px;" }, [
      el("div", { class: "calc-title" }, "Group Contributions Summary"),
      el("div", { class: "calc-grid" }, [
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Your Role"),
          el("div", { class: "calc-val" }, titleCase(membership.role))
        ]),
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Total Contributed"),
          el("div", { class: "calc-val" }, `UGX ${formatMoney(total)}`)
        ]),
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Total Payments Count"),
          el("div", { class: "calc-val" }, `${myContributions.length}`)
        ]),
        el("div", { class: "calc-stat" }, [
          el("div", { class: "muted small" }, "Joined Date"),
          el("div", { class: "calc-val" }, formatDate(membership.joined_date))
        ]),
      ])
    ]);

    const headerRow = el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;" }, [
      el("h4", { style: "margin:0" }, "Contributions History"),
      exportBtn
    ]);

    if (!myContributions.length) {
      return [
        statSection,
        headerRow,
        el("p", { class: "muted empty-state", style: "padding:20px 0;" }, "No contributions recorded yet.")
      ];
    }

    const table = el("div", { class: "table-wrap" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [el("th", {}, "Date"), el("th", {}, "Amount")])),
        el(
          "tbody",
          {},
          myContributions.map((c) =>
            el("tr", {}, [
              el("td", {}, formatDate(c.contribution_date)),
              el("td", { class: "ledger" }, `UGX ${formatMoney(c.amount)}`)
            ])
          )
        ),
      ]),
    ]);

    return [statSection, headerRow, table];
  });
}
