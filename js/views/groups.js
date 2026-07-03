import { api } from "../api.js";
import { requireMemberProfile } from "../auth.js";
import { el, mount, formatMoney, formatDate, titleCase } from "../utils.js";

export async function renderGroups(root) {
  const memberId = requireMemberProfile();
  const memberships = await api.get(`/api/v1/groups/members/${memberId}/memberships`);

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

  const card = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("div", {}, [
        el("h3", {}, membership.group_name),
        el("div", { class: "muted small" }, `${titleCase(membership.role)} \u00b7 Joined ${formatDate(membership.joined_date)}`),
      ]),
      el("div", { class: "ledger", style: "font-weight:600;color:var(--pine-900)" }, `UGX ${formatMoney(total)}`),
    ]),
  ]);

  if (!myContributions.length) {
    card.appendChild(el("p", { class: "muted" }, "No contributions recorded yet."));
    return card;
  }

  card.appendChild(
    el("div", { class: "table-wrap" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [el("th", {}, "Date"), el("th", {}, "Amount")])),
        el(
          "tbody",
          {},
          myContributions.map((c) =>
            el("tr", {}, [el("td", {}, formatDate(c.contribution_date)), el("td", { class: "ledger" }, formatMoney(c.amount))])
          )
        ),
      ]),
    ])
  );

  return card;
}
