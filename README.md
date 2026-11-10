<!-- squeekchain-project: <project-id> -->

# Squeek: Extraction Survival

A pixel-art extraction game about a hamster in a mine. You go down, fight what lives on the floor, and you only keep what you carry back out.

## How Squeek uses Squeekchain

The delve polls the public status feed. It does not invent wheel work.

`src/extract/boot.ts` calls `pollWheel()` on load and again every 12 seconds. Each poll is a `GET` to [https://api.squeekchain.com/v1/status](https://api.squeekchain.com/v1/status) with credentials omitted and no cache. The body is passed to `applyWheelBody()` in `src/arena/wheel.ts`.

Credit is the increase in `cumulativeWorkUnits` since the last accepted reading, and only when `provenance` is `hardware`. A simulated, replayed, or derived reading is rejected and adds nothing. The first reading from an installation only sets a baseline, so older work is not counted. A stale reading, a clock skew, a counter fault, or a counter that moves backwards is ignored. One poll can add at most 12 units. Those units go into the Hold reserve (`save.support`, capped at 100) through `addSupport()`. Spending 24 of that reserve is a field heal. If the request fails, times out, or the tab is hidden, the saved reserve is left as it is. Hiding the tab also clears the baseline so a later poll cannot treat the gap as new work.

There is no token and no on-chain reward. The Hold reserve is a local number in the save.

Signing in is optional. A wallet signature (`personal_sign`) opens a session for the leaderboard and cloud save. No transaction is sent. Guest play stays on this device. When a wallet is connected, a Cloudflare Worker is the authority for the run: it checks loot, coin bands, caps, and minimum time before an extract is ranked. A rejected run does not become a score.

## How to play

Every run starts at depth 1. Clear that floor’s boss to open the stairs, or stand in the green exit until the channel finishes. Extracting banks what you carried and ends the run. Dying drops what you brought out of the stash. One item can be insured before you leave. Coin, the Workshop, and the merchant are the base between runs.

The phone layout is landscape. A portrait screen asks you to turn the device and does not wipe the save.

**ID | EN** on the title, the base, and in settings switches the language immediately. The choice is stored locally. English is the default unless the browser language is Indonesian.

## Controls

Touch, in landscape:

- Move: drag on the left side of the screen.
- Attack, dodge, block, and items: the buttons on the right.
- The attack button follows the one weapon you brought (sword or the weapon you equipped at base).

Keyboard:

- Move: WASD or arrow keys.
- Attack: `J`.
- Block: hold `F`.
- Dodge: `K`.
- Interact, extract, or open: `E`.
- Pick up: `G`.
- Bandage: `R`.
- Soul Melter: `Q`.
- Bag: `I` or Tab.

Leave the green exit, or take a hit, and the extract channel cancels. The stairs to the next depth stay shut until that floor’s boss is dead.

## Features

- Seven depths, each with its own theme, foes, boss, and floor hazard.
- An extraction loop: loot is only yours if you leave with it.
- A base with a stash, a merchant, and a Workshop for the sword, the shield, and bag slots.
- One weapon slot. You bring the sword or one stashed weapon, not both.
- Optional nickname, leaderboard, and cloud save after a wallet signature.

## Tech stack

TypeScript and Vite. The delve is drawn on a canvas in pixel art, with procedural audio. Signed-in accounts are a Cloudflare Worker and D1. There is no token contract.

## Build and test

Node.js 22.

```bash
npm ci
npm test
npm run dev
```

Dev server: http://127.0.0.1:47331/

```bash
npm run build
npm run preview
```

`npm run build` typechecks, then builds with Vite. Sourcemaps are off. Asset URLs are relative, so `dist/` can be served from a subpath such as `/squeek/`. Preview: http://127.0.0.1:47332/

Guest saves stay in the browser under `npcs-burrow-pixel-extract.save.v1`. The arena, the small RPG, and the older extraction page use their own keys.

## Live

[https://squeekextract.xyz/](https://squeekextract.xyz/)

Press images: [og.png](https://squeekextract.xyz/press/og.png) (1200×630) and [headline.png](https://squeekextract.xyz/press/headline.png) (1280×720).

## Credits

Original pixel art and procedural audio by Dadapy04 / DevSES.

## License

Source code is [MIT](LICENSE). Pixel art, sprites, audio, names, and branding are not included in that grant. They are © 2026 Dadapy04, all rights reserved. See [ASSETS-LICENSE](ASSETS-LICENSE).
