# Arcana Forge

**Create worlds. Write their fate. Play together.**

Arcana Forge is a playable, web-based original fantasy board-game creator. It takes inspiration from the exploration, character progression, card encounters, and concentric board paths of classic adventure board games, but it includes original worlds, characters and card text.

## Start locally

**Windows:** Install [Node.js](https://nodejs.org/) 18 or newer, then double-click `Start Arcana Forge.bat`.

**macOS / Linux:** Install Node.js 18 or newer, open a terminal in this folder and run:

```bash
node server.js
```

Visit **http://localhost:3000** in your browser. There are **no npm dependencies**, no database installation, no build commands, no user registration and no API keys.

To run on a different port:

```bash
PORT=8080 node server.js
```

On Windows PowerShell:

```powershell
$env:PORT=8080; node server.js
```

## Multiplayer online

To play over the public internet, this server **must be deployed to an internet-accessible host**. Running it on your own computer only makes it available to you and, with suitable firewall settings, devices on your local network.

You can deploy it as a regular Node.js web app on a service that supports long-lived HTTP connections, such as Render, Railway, a VPS, or a container hosting platform. There is a ready-made `Dockerfile`.

- **Start command:** `node server.js`
- **Build command:** none required
- **Port:** the hosting platform provides `PORT` automatically (or use 3000)
- **Persistent storage:** mount a persistent disk at the project's `data/` directory to preserve active rooms when your host restarts
- **HTTPS:** recommended and required for installable PWA features on public domains
- **Networking:** the host must support Server-Sent Events (SSE), which uses an ordinary long-lived HTTP connection. Disable reverse-proxy response buffering for `/api/events` if required.

On the live site, press **Host Game**, enter a nickname, select a hero, and share the invitation URL or 6-character room code. Friends can join on computers and phones. The host can edit the world while everyone is in the lobby and those changes update all connected players.

Players can refresh their own browser and reclaim their place using a locally saved session token. Party chat and game progress are kept on the server; rooms are saved in `data/rooms.json`.

## World Builder

- **Boards:** Custom names, descriptive text, world colors, artwork uploads, and adjustable art opacity.
- **Layers:** Create/delete up to 12 circular realms with independently customizable radii and colors.
- **Spaces:** Create up to 160 total spaces, edit names, symbols, narrative descriptions, images and appearance. Drag individual spaces to position them anywhere on the board; connect spaces to create branch paths, bridges, portals or shortcuts. Spaces in the same layer have automatic clockwise/counterclockwise links.
- **Actions:** Build sequential actions, such as drawing adventures, obtaining equipment or spells, gaining/losing life or stats, teleporting, visiting shops, choosing between rewards, displaying narrative text, or winning the game.
- **Characters:** Create and customize heroes, portraits, initial stats and gold.
- **Adventure cards:** Add enemies (physical or magical), treasure and events with effects or combat rewards.
- **Item cards:** Equipment with persistent Strength or Craft bonuses.
- **Spell cards:** Healing, gold, combat bonuses, movement rerolls, drawing spells, escape spells, teleportation.
- **Rules:** Select starting space, maximum player count, die sides, enemy damage, and gold lost on defeat. Define victory triggers via any space or adventure card.
- **Library:** Three sample adventures are included. Save your worlds to this browser, duplicate them, and export/import self-contained JSON worlds (including embedded artwork).

## Adventure rules

1. Choose unique heroes in the lobby and have the host begin. A single player can play solo to test a world.
2. Roll the movement die. Exactly reachable spaces are highlighted in green. Select a space to move there. Custom connections can cross between realms.
3. Resolve each landing action. Some spaces ask you to make a choice, encounter an enemy, or buy from a shop.
4. For combat, roll a die and add Strength or Craft (depending on enemy type), item bonuses, and any spell bonuses. A higher total wins; ties are draws. Enemies can reward cards or resources.
5. Spend Fate to reroll movement; use spells from your hand during your turn.
6. When life drops to zero, your hero respawns at the starting space and loses the configured percentage of gold.
7. The first player who triggers a victory action wins.

## Project structure

```text
arcana-forge/
├── server.js                 Server-authoritative gameplay and room rules
├── lib/
│   ├── realtime.js           No-dependency multiplayer transport
│   └── static.js             Secure static file delivery
├── public/
│   ├── index.html            Main app
│   ├── styles.css            Responsive fantasy theme
│   ├── app.js                World builder and game UI
│   ├── defaults.js           Three customizable sample adventures
│   ├── realtime-client.js    Browser multiplayer client
│   ├── manifest.webmanifest  Installable mobile web app
│   ├── sw.js                 Offline static asset cache
│   └── icons/                App icons
├── test/                     Automated gameplay and frontend checks
├── data/                     Persisted active rooms
└── Dockerfile                Container deployment
```

## Testing

```bash
npm test
```

The test suite starts an independent local server, creates multiple sessions, and verifies room management, permissions, character selection, movement, combat, Fate rerolls, shops, choice effects, victory, chat, live world edits, and reconnection. `node --check` can also be used on individual JavaScript files.

## Limitations and next steps

This is a functional **first version**, not a complete reimplementation of every Talisman rule or a production-grade commercial game platform. The default rules emphasize exploration, dice movement, card encounters, progression and reaching the designated objective. There is currently no integrated account system, moderation, map-asset marketplace, persistent cross-device world library, custom scripting language, trading between players, advanced quest trees, or AI opponents.

**Important:** Scenario libraries are saved in each creator's browser using local storage. Export JSON files to back up your work or move it to another device. Multiplayer session progress is saved on the host server, but must be backed by persistent hosting storage if you need it to survive server replacements. Room codes are invitation links, not strong authentication. Avoid uploading private imagery or sensitive data to a publicly accessible room.
