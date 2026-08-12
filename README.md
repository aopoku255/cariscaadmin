# carisca-admin

The internal administration console for CARISCA staff. Next.js App Router,
TypeScript, runs on **:3001**.

It is a separate application from the public site but talks to the **same API**
— one backend, two frontends. Nothing here has its own data store or its own
notion of who may do what.

## Running it

```bash
cp .env.local.example .env.local
npm install
npm run dev          # :3001
```

Requires `carisca-api` on :4000. The public site (`carisca-web`, :3000) is
independent — either can run without the other.

| Variable | Purpose |
|---|---|
| `API_URL` | API base for server components; may be an internal address |
| `NEXT_PUBLIC_API_URL` | API base the browser uses (CSV downloads) |
| `NEXT_PUBLIC_SITE_URL` | Where "View the public site" points |

## Why it is separate

The console and the public site have almost nothing in common beyond the API.
Different audiences, different risk profile, different release cadence — and
splitting them means the console can be put behind a VPN, a different domain,
or an IP allowlist without touching the participant-facing site. It is also
`noindex, nofollow` at the header level, which a shared app cannot be.

The cost is duplication: `lib/api`, `lib/auth`, `components/ui` and the design
tokens exist in both repositories. That is a deliberate trade for two
independent deployables. **If those copies drift, the fix is a shared package
rather than hand-syncing** — the API contract types should be generated from
OpenAPI into both apps regardless.

## Structure

```
src/app/
├── login/            staff sign-in — no self-registration
├── not-staff/        signed in, but not staff
└── (console)/        everything behind the staff guard
    ├── layout.tsx    sidebar, role-aware nav
    ├── page.tsx      overview
    ├── cpd/          list, create, edit, lifecycle, questions, attendance
    └── registrations/
```

The `(console)` route group carries the shell and the guard, so sign-in and
error pages render without a sidebar they have no business showing.

## Authorization

`requireStaff()` in the console layout redirects anyone who is not signed-in
staff, and `can(user, 'cpd.publish')` decides which controls render.

**Neither is a security boundary.** Both exist so staff are not shown buttons
that will fail. Every action is refused independently by the API on its own
permission check — verified by tests there, including that a Manager pressing
Publish gets a 403.

Where a transition is possible at the current stage but out of reach for the
signed-in role, it is **named rather than hidden**, so a Manager knows to ask a
Director instead of assuming the system is broken.
