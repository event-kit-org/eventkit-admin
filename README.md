# eventkit-admin

The eventKit platform admin console. One account, which sees every event (read
only), switches an event's features on and off, and deletes events. Organisers
can't switch their own features; they ask the admin.

Built like eventkit-console: React, Vite, Tailwind and shadcn/ui, with the API's
types generated from eventkit-core's OpenAPI spec (`npm run gen:api`).

## The admin account

There is no sign-up. Create the account, or set a new password, against the
API's database:

```bash
# in eventkit-core (local)
npm run admin:create
# from an entry point on a server (eventkit-api / eventkit-serverless)
npx eventkit-admin-create
```

It asks for the email, name and password, or reads `ADMIN_EMAIL`, `ADMIN_NAME`
and `ADMIN_PASSWORD`. Running it with another email replaces the account.

Forgot password emails link to `<ADMIN_URL>/reset-password`: set `ADMIN_URL` on
the API to this app's address (and mail must be set up), or reset stays off.

## Running it

```bash
cp .env.example .env.local   # VITE_API_URL, VITE_PLATFORM_API_KEY
npm install
npm run dev                  # http://localhost:5178
```

Checks: `npm run typecheck`, `npm run lint`, `npm test` (`npm run test:coverage`
holds 90%).

Deploy as its own Vercel project with the same two `VITE_*` variables. Pages
send `X-Robots-Tag: noindex`.
