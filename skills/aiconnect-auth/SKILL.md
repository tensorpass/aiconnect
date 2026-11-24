---
name: aiconnect-auth
description: Harden a website's login before its MCP server serves signed in or staff tools to the visitor's own AI through AI Connect, and move live users to it without logging them out. Covers access tokens kept in localStorage, refresh tokens stored in clear, never rotated or checked apart from their expiry, sessions with no revocation, roles trusted from the browser, cookies without SameSite and routes open to cross site posts, and how the MCP route reads the session for each level of tools. Use before adding tools on a visitor's own data or a back office to an AI Connect MCP server, when reviewing or fixing a site's login, sessions, JWT, refresh tokens, logout or roles, or when the user mentions session security, token storage, refresh rotation, CSRF, Better Auth or McpToolSource's fetch option.
metadata:
  author: TensorPass
  version: "0.1.2"
---

# Harden a site's login for signed in tools

An AI Connect MCP server can serve three levels of tools: public tools any visitor calls, tools on the signed in
visitor's own data, and staff tools on the back office. The two last levels are only as safe as the site's login. A
login is fragile when one stolen value keeps working: an access token any script on the page can read, a refresh token
that renews forever, a session nobody can end. This skill brings the site to one model, fixes each weakness in the
site's own auth code, and moves live users to it without logging them out.

The `aiconnect-mcp-tools` skill builds the tools and the `aiconnect-hardening` skill guards the chat. This skill comes
before both when the MCP server will serve anything beyond public tools.

## 1. Inventory

Read the code before changing it, and write down one table for the site:

| Question | Where to look |
| --- | --- |
| How a user signs in (password, magic link, OAuth, passkey) | the auth routes and services |
| What the server issues (session id, JWT, refresh token) and each lifetime | the login and refresh handlers, the JWT sign options |
| Where the browser keeps each value (`localStorage`, `sessionStorage`, memory, cookie) and the cookie flags | the client's auth store, every `Set-Cookie` |
| How a refresh works: what it checks, whether it rotates, what happens to the old token | the refresh handler and the session model |
| How a session ends: logout, password change, role change, account deletion | those handlers |
| Where roles come from on each request | the auth middleware |
| Which origins CORS allows with credentials, and which routes change state | the CORS setup and the routes |
| Which routes the AI feature adds | `/api/mcp` and its relay |

Each finding names its file and line, checked by reading the code path from the request to the database query.

## 2. The target model

1. **A session the page cannot read.** On a site and API sharing one site (same registrable domain), the session is an
   `httpOnly`, `Secure`, `SameSite=Lax` cookie. A single page app whose API lives on another site keeps its access token
   in memory only, and its refresh token in an `httpOnly` cookie scoped to the refresh path (`Path=/api/auth`).
   `localStorage` holds no token: any script injected in the page reads it, and with AI Connect the page also runs the
   visitor's conversation.
2. **Short access, long refresh.** An access token or session check lives 5 to 15 minutes. A refresh token lives days
   or weeks and renews the session.
3. **Refresh tokens stored as hashes.** A refresh token is 32 random bytes from the platform's secure random source. The
   database stores its SHA-256 only, so a leaked table renews no session. The lookup matches the hash, the expiry and
   the revocation in one query: `{ tokenHash, expiresAt: { $gt: now }, revokedAt: null }`, or its SQL equivalent.
   Checking the expiry in a second step, after a lookup by user, lets an expired token through as soon as the user holds
   another live one.
4. **Rotation on every use.** A refresh returns a new refresh token and marks the old one used, inside one atomic update
   (`findOneAndUpdate` on the unused token, or `UPDATE ... WHERE used_at IS NULL RETURNING`), so two parallel refreshes
   cannot both succeed.
5. **Reuse ends the family.** Each sign in starts a family (one device). A used token presented again means a copy was
   stolen: the server revokes every token of that family and the user signs in again on that device.
6. **Revocation.** Logout revokes the family. A password change, a role change, a disabled account and an account
   deletion revoke every family of the user. A JWT access token stays valid until its short expiry; a site that needs an
   instant cut checks a session version on the user at each request.
7. **Expired rows leave.** A TTL index on `expiresAt` (MongoDB) or a scheduled delete removes expired and long revoked
   tokens.
8. **Roles from the server.** The middleware reads the role from the database or from a short lived token the server
   signed; the browser's copy of the user only draws the interface.
9. **No session token in a response body.** The cookie's value never reaches the page in JSON. Better Auth 1.7 returns
   it in `/get-session` (`session.token`) and in the body of each sign in route (`token`), which gives an injected
   script the value of the httpOnly cookie. On a Better Auth site, return the session through the `customSession`
   plugin without `token`, strip `token` from the sign in bodies in a `hooks.after` middleware
   (`createAuthMiddleware`), keep the `bearer` plugin off, and test that no auth response body carries it.
10. **Better Auth sites.** Section 7 lists what to close and check before and after the move: the routes to disable,
    the exact path limit of `disabledPaths`, the absolute session lifetime, suspended accounts, second factor enrollment
    and the migration traps found on seven production sites.

## 3. Cookies, CSRF and CORS

1. A cookie session needs a check on every route that changes state, the MCP route included, since another site can
   send a form or a `fetch` that carries the cookie: the `Origin` header (or `Referer` when `Origin` is absent) must be
   one of the site's own origins. `SameSite=Lax` blocks most cross site posts, and the `Origin` check covers the rest.
2. CORS with `credentials: true` lists the site's own origins by name. A reflected origin or `*` with credentials opens
   every signed in route to every site.
3. Cookie names carry the `__Host-` prefix when the cookie needs no domain attribute, so a subdomain cannot overwrite it.

## 4. The MCP route

The page reads the site's MCP server on its own origin, so its requests carry the site's cookies.

1. The MCP route reads the session as the site's other routes do, then builds the server for that request with only the
   tools of the caller's level, so `tools/list` shows a visitor what they may call.

   ```ts
   export async function POST(request: Request) {
     if (!isOwnOrigin(request.headers.get('origin'))) {
       return new Response('Forbidden', { status: 403 });
     }
     const session = await readSession(request); // the site's own session reader
     const server = new McpServer({ name: 'shop', version: '1.0.0' });
     registerPublicTools(server);
     if (session) {
       registerAccountTools(server, session.userId);
     }
     if (session?.permissions.includes('backoffice')) {
       registerStaffTools(server, session);
     }
     // transport and response as in the aiconnect-mcp-tools skill
   }
   ```

2. A tool takes the user from the session, never from its arguments: `list_my_orders` has no `userId` field.
3. A site that keeps a bearer token passes it through `McpToolSource`'s `fetch` option (AI Connect 0.1.5 and later),
   reading the current token at each request. Moving the site to the model of section 2 removes the need.

   ```ts
   const tools = new McpToolSource('/api/mcp', 'Shop', {
     fetch: (url, init) => {
       const headers = new Headers(init?.headers);
       headers.set('authorization', `Bearer ${currentAccessToken()}`);
       return fetch(url, { ...init, headers });
     },
   });
   ```

4. A tool that acts returns a proposal the page shows as a card; the user's click sends it through the site's own route,
   with that route's checks.
5. Staff tools return records to the staff member's own AI account. Return fields by name, mask emails and phone
   numbers, and keep out of the server any tool on health data, payments or people who never asked to be contacted.

## 5. Migrate live users

1. **Clear refresh tokens to hashes.** SHA-256 is deterministic, so a script hashes every stored token in place and
   removes the clear field, and the server looks tokens up by hash from then on. Ship it with the code in one release,
   once, and count the rows before and after.
2. **`localStorage` to cookie.** For one access token lifetime the server accepts both the header and the cookie. The
   new client stops writing the key and deletes it on load. After that window, remove the header path.
3. **New lifetimes or rotation.** Existing tokens keep their expiry; the new rules apply from their next refresh.
4. A migration that would log everyone out is the owner's decision: report it with the number of active sessions.

## 6. Tests

Replace any test that locks in the old behaviour, and add one test per rule against the database layer the site's tests
use:

1. A refresh with a valid token returns a new pair, and the old refresh token is refused afterwards.
2. An expired token is refused, also while the user holds another live token.
3. A reused token is refused and revokes its family; the user's other devices keep working.
4. Two parallel refreshes with one token: one succeeds.
5. Logout, password change and role change end the sessions they should.
6. The session cookie has `HttpOnly`, `Secure`, `SameSite` and the expected path.
7. A state changing request with a foreign `Origin` is refused, on the MCP route too.
8. `tools/list` returns the public tools to a signed out caller, the account tools to a signed in one and the staff
   tools to staff only.
9. The database holds no clear token after the migration.
10. No sign in or session response body carries the session token.

## 7. Better Auth: what to close and check

Lessons from seven production sites moved to Better Auth 1.7 on 21 and 22 November 2026, each found by a pen test or a
security review after the move. Apply all of them when a site adopts Better Auth, and keep their tests.

### Tokens in response bodies

1. Better Auth 1.7 returns the session token in the JSON body of `/get-session` (`session.token`), of each sign in route
   (`token`), of `/update-session` and `/change-password`, and of `/list-sessions`, which answers an array of sessions,
   each with its raw `token`. The token is the value inside the httpOnly session cookie, so a script injected in the
   page reads it from the response.
2. There is no option to keep it out. Return the session through the `customSession` plugin without `token`, and strip
   `token` and `session.token` in a `hooks.after` middleware (`createAuthMiddleware`), arrays included. Keep the
   `bearer` plugin off: the page and the MCP route read the cookie.
3. Disable the routes the client never calls rather than cleaning their answers: the session list and revoke routes,
   `/update-session`, `/change-password` when the product has another flow.

### Routes the product does not offer

1. Every route Better Auth mounts is live unless disabled. A route the product never offers is an unreviewed way in:
   `/update-user` stored names that skipped the app's own validation and reached emails unescaped; `/sign-in/email`
   skipped the per account lockout the username sign in had; a Google `id_token` posted to `/sign-in/social` opened a
   14 day session for whoever held a stolen token.
2. Disable through `disabledPaths` each route the product does not use: sign up on a closed site, `/update-user`,
   `/change-email`, `/delete-user`, `/link-social`, `/unlink-account`, the session list and revoke routes, sign in
   methods the site does not show, `id_token` sign in when the site uses the redirect flow.
3. `disabledPaths` matches exact paths. A route with a parameter, such as `/reset-password/:token`, cannot be disabled
   there: review what it does, and close it at the plugin or the handler when it must go.
4. Keep a unit test that lists the routes left on, read from the auth instance's router, and fails when a plugin or a
   Better Auth upgrade adds one, until someone reviews it.
5. Apply the lockout, rate limit and account checks to every sign in route left on, in one hook, not per route.

### Sessions

1. `expiresIn` with `updateAge` renews a session at each use, so an active session never ends. Cap it with a database
   hook on session update: `expiresAt` never later than the session's `createdAt` plus the site's absolute lifetime
   (30 days on our sites), with a test.
2. A suspended, banned or deleted account must get no session: check the account's state in a
   `databaseHooks.session.create.before` hook, and end its sessions (and its open sockets) at the moment it changes.
3. Staff with a second factor: an account moved without its factor must not enroll one with the password alone. Open
   enrollment only through a window an operator starts, and alert the staff channel at each enrollment.

### Migration

1. Keep each user's password: `emailAndPassword.password.hash` and `verify` use the project's existing algorithm, and a
   script creates one `credential` account per user from the existing hash. Count users and accounts before and after,
   run it once, back up the hashes first.
2. Read the existing indexes before Better Auth creates its own: a unique index with other options on `users.email`, or
   two indexes with one name, logs errors or stops the API at boot.
3. Remove the old JWT and refresh token code, variables and collections in the same release.

### Tests

1. No body of an auth route, object or array, carries a session token.
2. The list of enabled routes equals the reviewed list.
3. A session ends at its absolute lifetime even when used every hour.
4. A suspended account gets no session, and its open sockets close.
5. Each sign in route left on applies the lockout.

## Rules

1. Fix each weakness in the site's auth code, where the token is issued, stored or checked.
2. Keep the site's stack and libraries; add a dependency only for what the platform lacks.
3. Never print, log or commit a token, a secret or a hash of a live token.
4. A change to login ships with its migration and its tests in one release.

## Check it works

After the deploy, on a test account:

1. Sign in in the browser and reload after the access token's lifetime: the session renews.
2. With `curl`, refresh twice with the same token: the second answers 401 and that device's session ends.
3. Sign out, then call a signed in route with the old cookie: 401.
4. In the browser's storage panel, no token in `localStorage` or `sessionStorage`.
5. In the site's chat, signed out, ask for an account task: the answer names the sign in page. Signed in, the account
   tool runs and returns only that user's records.
