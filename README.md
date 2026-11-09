# Squeek: Extraction Survival

A 2D pixel-art extraction roguelite. You play a hamster who delves a mine, fights what lives there, and has to walk back out alive.

Every run starts at depth 1. Clear a floor’s boss to open the stairs, or step into the green exit on base to bank what you are carrying and end the run. Death drops whatever you brought with you. One item can be insured. Coin, the workshop, and the merchant stay on this device. Nothing here is a wallet, a token, or an online account.

## Play

Hosted build: [https://dadapy04.github.io/squeek/](https://dadapy04.github.io/squeek/)

The other pages are the wave arena (`arena.html`), a small RPG (`rpg.html`), and an older extraction build (`legacy.html`).

**ID | EN** on the title screen, the base, and in settings switches the whole delve immediately. The choice is stored in `localStorage` under `npcs-burrow-lang`. English is the default unless the browser language is Indonesian. Progress keys are not translated and do not change when you switch language.

## Controls

Landscape on a phone. A portrait screen asks you to turn it sideways and does not wipe the save.

- Move: drag the left side of the screen, or WASD / arrow keys.
- Sword or spear: the attack button, or `J`.
- Block: hold the block button, or `F`.
- Dodge: dodge button, or `K`.
- Interact / extract / open: `E`.
- Pick up: `G`.
- Bandage: `R`.
- Soul Melter: `Q`.
- Bag: `I` or Tab.

Stay inside the green exit circle to extract. Leaving it, or getting hit, cancels the channel. The nest stairs stay shut until that floor’s boss is dead.

## Build, run, test

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

`npm run build` typechecks, then builds with Vite. Sourcemaps are off. The site uses relative asset URLs, so `dist/` can be served from a subpath such as `/squeek/`. Preview: http://127.0.0.1:47332/

Saves stay in the browser: `npcs-burrow-pixel-extract.save.v1` for the delve, plus separate keys for the arena, the RPG, and the older extraction page.
