# Put Squeek online

The game on GitHub Pages already runs with no server. Wallets, cloud saves, and the rank board stay hidden until you set an API address. Nothing in this folder spends money. Cloudflare Workers and D1 have a free tier. WalletConnect’s project id is free. You do not need a custom domain.

Do these steps on your own computer, in order. Commands are typed in a terminal. The game folder is the one that contains `package.json` and the `server` folder.

## 1. Create a Cloudflare account

1. Open https://dash.cloudflare.com/sign-up
2. Use an email you can read. The free plan is enough. Do not add a credit card unless Cloudflare asks and you are sure you want the paid plan. The steps below stay on the free plan.
3. Confirm the email.

## 2. Install the Cloudflare command line

You need Node.js 22 or newer (`node -v`).

```bash
cd server
npm install
npx wrangler login
```

A browser window opens. Approve it. `npx wrangler whoami` should print your email.

## 3. Create the database

The production database is already created. `server/wrangler.toml` points at D1 database `squeek` with id `21def8b0-69c6-499d-8e04-3ec4c64346ed`. Do not replace that id.

If you ever have to create it again, from the `server` folder:

```bash
npx wrangler d1 create squeek
```

The output includes a `database_id` line. Put that id in `server/wrangler.toml` and leave `database_name = "squeek"` and `binding = "DB"` as they are.

Create the tables:

```bash
npx wrangler d1 migrations apply squeek --remote
```

Confirm with `y` when it asks. This only creates empty tables. It does not upload anyone’s save.

## 4. Set the run secret

The server stamps each delve with this secret so a player cannot invent a finished run. Pick a long random string (a password manager is fine). It is not a wallet key.

```bash
npx wrangler secret put RUN_SECRET
```

Paste the secret when asked. It is stored by Cloudflare, not in the git repo.

For trying the API on your laptop only, copy the example file and put a different throwaway value in it:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` if you want. Do not commit that file.

## 5. Check the site address the wallet message uses

In `server/wrangler.toml`:

- `SIWE_DOMAIN` is `dadapy04.github.io` (no `https://`).
- `SIWE_URI` is `https://dadapy04.github.io/squeek`.
- `CORS_ORIGIN` lists the Pages site and the local game (`http://127.0.0.1:47331`).

If the public site later moves, change those three and deploy again. The signed-in message must show the same domain the player is looking at, or the signature check fails.

## 6. Deploy the worker

The production Worker is already deployed:

```text
https://squeek-api.dadapy04.workers.dev
```

Health check (open it in a browser):

```text
https://squeek-api.dadapy04.workers.dev/v1/health
```

You should see `{"ok":true}`. The API address is that URL with no `/v1/health` on the end.

To publish a later change to the same Worker, from the `server` folder:

```bash
npx wrangler deploy
```

Do not run it from the game folder. Do not turn on paid Workers features. The public game stays guest-only until someone builds Pages with `VITE_API_URL` set.

## 7. WalletConnect project id (phones)

Injected wallets (MetaMask, Rabby, Bitget in a desktop browser) do not need this. iPhone Safari has no injected wallet, so WalletConnect shows a QR code or a deep link. That relay needs a free project id.

1. Open https://cloud.walletconnect.com and create a free account.
2. Create a project. Copy the project id.
3. In the project settings, allow the origin `https://dadapy04.github.io`.

You will paste the id in the next step. Leave it blank if you only care about desktop wallets. The WalletConnect button then says it is not configured, and the rest of the game still works.

## 8. Point the game at the API

In the game folder (the parent of `server`), create `.env.local`:

```bash
cd ..
cp .env.example .env.local
```

Edit `.env.local`:

```bash
VITE_API_URL=https://squeek-api.dadapy04.workers.dev
VITE_WALLETCONNECT_PROJECT_ID=
```

Put the WalletConnect id on the second line if you have one. No quotes. No slash at the end of the API address.

`.env.local` is not committed. The public site build reads the committed `.env.production`, which sets `VITE_API_URL` to `https://squeek-api.dadapy04.workers.dev`. WalletConnect stays unset there, so a phone with no injected wallet shows “Mobile wallet login coming soon” and guest play still works.

To try it on your laptop:

```bash
npm install
npm run dev
```

Open http://127.0.0.1:47331 . On the base screen you should see Connect wallet. Play still works if you never connect.

## 9. Publish a Pages build

`npm run build` in the game folder picks up `.env.production`, so the public bundle already knows the Worker URL. Publish `dist` plus an empty `.nojekyll` to the `gh-pages` branch. A phone still cannot connect until a WalletConnect project id is added to that file and the site is built again.

## What the player can do

- Guest play never talks to the server. The save stays in the browser under the same key as before.
- Connect wallet asks for a signature only. There is no transaction, no token approval, and no chain switch from the game. The signature proves the address.
- Disconnect forgets the session in this browser. It does not delete the local save.
- Cloud save uploads the same save blob. If the phone and the laptop both changed, the game keeps the copy on this device and asks before replacing it.
- A ranked clear needs a run token from the server at the start. The server checks the time, the loot log, and coin caps. A failed check does not delete the local extract. It only refuses the rank board.
- The board has best haul and deepest floor, for this week and for all time. Flagged runs are stored and are not shown.

## If something fails

| What you see | What to check |
| --- | --- |
| `database_id` error on deploy | Step 3. `wrangler.toml` should still say `21def8b0-69c6-499d-8e04-3ec4c64346ed`. |
| Health URL is 404 | Production is `https://squeek-api.dadapy04.workers.dev/v1/health`. `npx wrangler deployments list` shows the URL. |
| Connect wallet does nothing | `.env.local` is in the game folder, the dev server was restarted after editing it, and `VITE_API_URL` has no trailing slash. |
| Signature rejected | `SIWE_DOMAIN` and `SIWE_URI` match the site in the address bar. Redeploy the worker after changing them. |
| WalletConnect button complains | Step 7. The id is in `.env.local`, and the Pages origin is allowed in the WalletConnect project. |
| Ranks stay empty | The clear has to start while signed in, and it has to pass the time and loot checks. A guest clear is local only. |

## Local API tests

From the `server` folder, with Node 22:

```bash
npm test
```

That signs a test key, checks the signature, rejects an impossibly fast clear, and checks that an old cloud revision cannot overwrite a newer save.
