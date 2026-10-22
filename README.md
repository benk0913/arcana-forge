# Talismaker v1.2 — game-style menus and guided World Workshop

Talismaker is a browser-based customizable fantasy board-adventure for friends and bot players. It is an original game toolkit, not an official adaptation of Talisman.

## Update your existing Render website (no Node.js installation)

1. **Back up** important worlds: on your existing website, export their JSON files before updating.
2. Extract `Talismaker_v1.2.zip`. Upload the **contents of its `Talismaker/` folder** (not the outer folder) into your existing GitHub repository. Keep `public/`, `lib/`, `server.js`, `package.json`, and other subfolders in their original locations.
3. Commit the changes. Render should deploy the new commit automatically. Otherwise, use **Manual Deploy → Deploy latest commit**.
4. Refresh the original Render website, optionally using Ctrl+Shift+R. The web app cache name is bumped to v3 so previous code is replaced.

Keep your existing Render settings: **Build Command** `npm install` and **Start Command** `node server.js`. You do not need Node.js on your own PC; Render runs it for you. There are no third-party npm dependencies.

> Your existing worlds are still read from the original browser storage key `arcana-forge-worlds-v1`, so this update does **not** reset your world library on the same browser and same site domain. Export/import JSON to transfer worlds between browsers or sites.

## New game menu flow

The main screen is now a game-style menu, not a website dashboard:

- **Play Adventure** → Choose a saved world → Host Room → Select Hero/Add Bots → Begin Adventure.
- **World Workshop** → Select an existing world, create a blank world, import a world, or generate one with AI.
- **Join a Friend** → Enter invitation code → Select Hero → Play.
- **How to Play** → Read the controls.

You cannot edit or create worlds while in a multiplayer room (even as host). The server rejects attempts to change a room's world after room creation, including in the lobby. **Finish and save your world first**; after leaving your current room you may edit it in the Workshop and host a new session.

### World Workshop wizard

Six steps: **World** (title, art, map shape, tile size) → **Realms** → **Spaces** (links and action effects) → **Heroes** → **Cards** → **Rules**. Use **Previous/Next**, or select a named step directly. Choose **Save Draft** at any time or **Save & Finish** at the last step. Saving returns you to your World Workshop library. To play, go back to the Main Menu → Play Adventure.

**Map shape:** On Step 1, select **Sphere / Round** for concentric circular paths, or **Square** for square-loop paths. Adjust **Default tile size (%)** (4–18). To override the size of an individual space, open **Step 3 – Spaces** and set its **Tile size (%)** (0 uses the board default). Shapes and sizes persist in saved/exported world JSON and display for all players.

## AI Studio: where to put the Gemini API key

**You no longer have to configure `AI_ADMIN_PASSWORD` on Render when using your own Gemini key.** The error about setting a server password came from the old version's mandatory server-side authentication check.

1. Get a **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey). This is separate from your site password.
2. Open **World Workshop** → **Create with AI**, or create/open a world and press **AI World Studio** in Step 1.
3. Paste your Gemini API key into the new **Gemini API key** box in the AI Studio window.
4. Select **Create an entirely new adventure** or **Edit this existing adventure**.
5. Write your world prompt and select **Generate World**. An option also asks Gemini to generate an illustrated board background. You can later create standalone illustrations for the board, selected spaces, heroes or cards.
6. Close AI Studio, review the world in the six-step editor, and **Save Draft** or **Save & Finish**.

The key is held **only in this open page's memory**, not localStorage, source code, server rooms or JSON exports. The key is sent to your own hosting server over HTTPS as a request header and forwarded to Google's Gemini API, **without being stored or logged by Talismaker**. Reloading the page clears it. Only paste an API key into your own trusted deployment, and never paste it into a publicly shared chat or commit it to GitHub.

**Alternative for a shared site:** The site owner can set `GEMINI_API_KEY` and `AI_ADMIN_PASSWORD` (8+ characters) in Render → Web Service → Environment. With this mode, leave the per-session key field empty and enter the creator password inside **Or use a server-configured Gemini key**. The password is required only for requests funded through the hosting owner's key. Keep it secret. If you have previously disclosed that password, change it in Render.

AI world writing uses `gemini-2.5-flash` by default; illustrations use `gemini-2.5-flash-image` (override through `GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL` in the environment if appropriate). Actual model access, availability, quotas and billing are controlled by Google; **image generation may incur fees**. The built-in AI endpoint tests use simulated provider responses and never charge API credits. World-generation instructions now explicitly respect a requested 4-layer adventure instead of forcing only 2–3 layers.

## Other gameplay features

- Custom boards, up to 12 realm layers and 160 spaces, draggable placement and extra route links.
- Heroes, character statistics, adventure encounters, custom items and spells, shop and choice events.
- Server-controlled bot players automatically take turns, fight and resolve encounters; no Gemini key required for bots.
- Six-character rooms, real-time updates, friend invitations and in-game chat.
- Three starter adventures and browser JSON import/export.
- Responsive desktop/mobile interface and an installable web app.

## Data persistence warning

On **Render Free**, local server files are ephemeral; saved rooms in `data/rooms.json` may be lost after server sleeping, restarting or redeploying. A future persistent database would be needed for long-lived online games. World designs are saved in the local browser; export JSON files as backups. The app does not yet include accounts or cloud world libraries.

## Run locally (optional)

If you have Node.js 18+ installed, run `node server.js` inside the folder, or double-click **Start Talismaker.bat** on Windows, then open `http://localhost:3000`. `npm test` runs frontend, multiplayer, bot and simulated AI API tests.

### Project layout

```text
Talismaker/
  server.js                  Multiplayer game server and bots
  lib/ai.js                  Gemini proxy, per-session keys or protected server key
  lib/realtime.js            Live game room protocol
  lib/static.js              Static file server
  public/app.js              Game UI and guided editor
  public/styles.css          Styles and mobile layouts
  public/defaults.js         Starter worlds
  public/index.html          Entry point
  public/realtime-client.js  Room state synchronization
  public/sw.js               Versioned app cache
  test/                      Automated tests
  data/.gitkeep              Empty data directory placeholder
  package.json
  Start Talismaker.bat
```
