# SACCO Member Portal

A plain HTML / CSS / JavaScript (no build step, no frameworks) client portal
for SACCO members, talking directly to the FastAPI backend.

## Running it

You just need a static file server, since this uses ES modules (`import`),
which browsers block from `file://` URLs for security reasons.

```bash
cd member-portal
python3 -m http.server 5173
# then open http://localhost:5173
```

Any static server works equally well (`npx serve`, VS Code's "Live Server"
extension, nginx, etc).

## Configure the API URL

Edit `js/config.js`:

```js
export const API_BASE_URL = "http://localhost:8000";
```

Point it at wherever your `sacco_fastapi_backend` is running.

## Project layout

```
index.html            Single-page shell: login screen + app shell with sidebar nav
css/style.css          Design system (CSS custom properties, components)
js/config.js           API base URL
js/api.js              fetch wrapper: JWT header injection, 401 -> refresh -> retry
js/auth.js             login/logout, current user + member profile cache
js/router.js           Minimal hash router (#/dashboard, #/savings, ...)
js/utils.js            DOM builder helper (el()), formatters, toast, modal
js/views/*.js          One file per screen (dashboard, savings, loans, shares,
                        groups, notifications, profile)
```

There's no bundler and no npm dependencies — everything is native browser
ES modules, so any modern browser can run it by just serving the folder.

## How pages are built

Every view module exports a single `render(root)` async function. It fetches
whatever it needs from the API and builds DOM nodes with the tiny `el()`
helper in `js/utils.js` (`el(tag, attrs, children)` — no JSX, no virtual DOM,
just direct DOM construction). The router (`js/router.js`) calls the active
view's `render()` function whenever the URL hash changes and swaps the
`#view-root` contents.

## What members can do

- **Dashboard** — savings/loans/shares summary at a glance
- **Savings** — view accounts and transaction history (deposits/withdrawals
  are staff-only by design — see the backend's RBAC rules)
- **Loans** — apply for a loan (with guarantors), view application status
  and repayment schedule, respond to guarantee requests from other members
- **Shares** — view holdings and transaction history (read-only; share
  transactions are staff-only, matching the backend)
- **Groups** — view group memberships and personal contribution history
- **Notifications** — view messages sent to you
- **Profile** — view your member details, next of kin, trusted contacts;
  change your password

## Note on backend compatibility

This portal expects the `member_id` field on `GET /api/v1/auth/me`, plus
two small read-only endpoints that weren't in the original backend delivery:

- `GET /api/v1/loans/guarantors/by-member/{member_id}` — guarantee requests directed at a member
- `GET /api/v1/groups/members/{member_id}/memberships` — a member's group memberships

These are already included in the `sacco_fastapi_backend.zip` in this
delivery — if you're running an older copy of the backend, re-download it or
apply the same additions.

## Known gaps

- No password-reset ("forgot password") flow — only in-session password
  change is wired up, matching what the backend currently exposes.
- Guarantor lookup during loan application matches by exact member number;
  for a large membership base you'd want a proper member picker/autocomplete.
- No offline support / service worker — this assumes a live connection to
  the API.
