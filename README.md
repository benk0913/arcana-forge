# Talismaker

**Create any fantasy adventure board. Invite friends. Play with or against bots.**

Talismaker is an original, browser-based, customizable fantasy board-adventure game inspired by classic Talisman-style exploration. It includes visual world editing, editable cards and heroes, multiplayer rooms, automated opponents and an optional AI Studio for generating worlds and illustrations.

## Already hosting the old version on Render? Update it

You do **not** need Node.js on your computer.

1. Download `Talismaker_Multiplayer_v1.1.zip` and extract it.
2. Open the GitHub repository already connected to your Render Web Service.
3. Replace the existing project files with the **contents of the `Talismaker/` directory** from the extracted download. Keep the same GitHub repository; there is no need to create another Render service. Upload all files, including the `lib/` and `public/` folders. Commit the changes.
4. In the Render dashboard, check **Events** to see that the new commit automatically deployed. If auto-deploy is disabled, select **Manual Deploy → Deploy latest commit**.
5. Open the existing public Render URL. Refresh the page (on desktop try Ctrl+Shift+R). The service worker has been versioned so older assets can be replaced.

Render's usual values are: **Runtime:** Node, **Build:** `npm install`, **Start:** `node server.js`, **Instance type:** Free. No additional npm dependencies or build system is required. Render installs Node itself.

**Important:** Export any particularly valuable worlds to JSON as a backup before updating. The new app deliberately retains the old browser-storage key (`arcana-forge-worlds-v1`) so worlds you created on the same origin/browser continue to appear after the rename. If you switch domains or browsers, use Export/Import to move your worlds.

## What changed in version 1.1

- Renamed all visible branding and the PWA to **Talismaker**.
- Fixed **Create Room / Join Room** not submitting: clicking within the dialog was previously intercepted as a backdrop click and its default form action was cancelled.
- Room creation/join responses now include the initial room state, so the lobby opens even if a real-time update is delayed. Active rooms also have a low-frequency state synchronization fallback.
- Hosts can **Add Bot Player / Remove bot** in a lobby. Bots reserve character slots and automatically roll, choose destinations, fight, resolve shops and rewards, and end turns. They are controlled on the server and can play even when the host tab is closed, provided the hosted service is running. Bot decisions are rule-based (not paid LLM calls).
- Added **AI Studio**: create a world from a written prompt, edit the existing world with instructions, optionally auto-generate the world backdrop, and generate individual illustrations for the selected space, hero or card.

## Enable AI Studio on Render

AI Studio is an **optional** feature. The ordinary world builder, multiplayer, and bots work without an API key.

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Availability, billing and rate limits are determined by Google. **Image generation may cost money** and is not guaranteed to be included in the free API tier.
2. Open **Render Dashboard → your Talismaker Web Service → Environment**.
3. Add the following **environment variables** (do not put them in `app.js`, GitHub, or `.env` files committed to your repo):

   | Name | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | Your Google Gemini API key |
   | `AI_ADMIN_PASSWORD` | A private, strong password of at least 8 characters |

4. Save/redeploy your service.
5. On your live site, click **Create with AI** on the home screen, or open **World Builder → AI Studio**. Enter the AI Studio password set above.
6. Write a prompt such as: *“Create a four-hero gothic vampire adventure with cursed villages, rival vampire lords, enchanted relics, and an inner throne that wins the game.”* Click **Generate World**. Leave **Also generate a matching board illustration** checked if desired.
7. To **edit** your existing adventure, open that world's editor, click AI Studio, choose **Edit this existing adventure**, and describe the changes. The editor preserves existing artwork when retained objects have the same IDs. Edit results are drafts until you click **Save** or **Apply to Lobby**.
8. For individual images, select a particular space, hero or card in the editor, open AI Studio, choose its target in **Illustration generator**, and enter the art direction. It will be placed into the world as an embedded image.

### Optional AI configuration

The following are available as Render environment variables if you need different compatible Gemini models:

- `GEMINI_TEXT_MODEL` — default `gemini-2.5-flash` (world writing/editing)
- `GEMINI_IMAGE_MODEL` — default `gemini-2.5-flash-image` (original illustrations)

Google can rename/deprecate models; check [Gemini API docs](https://ai.google.dev/gemini-api/docs/image-generation). AI calls require server access to Google's API. Talismaker does not ship API credits or a bundled model. The app enforces a creator password, a request-size limit and an AI concurrency limit to reduce unauthorized cost exposure. Never share your Render environment values or AI Studio password with visitors who should not be generating images. AI output is checked and normalized into Talismaker's supported game format; review generated worlds before publishing.

## Play with bots

1. Host any adventure and enter the **lobby**.
2. Under **The Party**, click **+ Add Bot Player**. The server chooses an available hero. You can add bots up to the configured player cap and the number of characters.
3. Remove a bot before starting if desired. Bot addition/removal is host-only and available before a game starts.
4. Click **Begin Adventure**. Once a bot's turn arrives, it plays automatically, with short pauses so human players can observe its actions.

Bots use deterministic rules with basic objective-seeking and resource preferences, not a third-party AI model. Humans and bots follow the same movement, combat, shop, choice and victory systems.

## Other features

- Edit board identities, backgrounds, colors and world descriptions.
- Create up to 12 realms and 160 spaces; drag spaces, connect links, assign actions.
- Edit heroes and their starting stats, names, colors, icons and portraits.
- Build custom adventure, item and spell decks (up to 150 cards per type).
- Turn-based movement, combat, spell use, Fate rerolls, equipment, shop encounters, branching choices, and victory effects.
- Private 6-character invite codes, links, lobby chat, live turns and reconnecting.
- Three included starter worlds, JSON import/export, responsive phone and desktop layout, and an installable web app.

## Free hosting and persistence

Talismaker can run on Render's free Node Web Service, and you don't need Node installed on your own PC. However, **Render Free uses an ephemeral filesystem**. Server-room progress stored in `data/rooms.json` can disappear on restart, spin-down or redeployment. Your world **library** is stored in that browser's localStorage; export world JSON for durable backups and cross-device sharing. A long-lived public service needs an external persistent database and account system as a later feature.

As in the earlier release, this is an original fantasy game creator, **not official Talisman software**. It is a functioning first version, not a full commercial game platform with accounts, moderation, trading, cloud asset storage or extensive scripting.

## Run locally (optional)

If you *do* have Node.js 18 or newer, double-click **Start Talismaker.bat** on Windows or run `node server.js` from the project directory. Then open `http://localhost:3000`. To test, run `npm test`. No npm dependencies are needed.

## Project files

```text
Talismaker/
├── server.js                  Multiplayer gameplay, bot turns and room sync
├── lib/
│   ├── ai.js                  Authenticated AI generation via Gemini (server-side)
│   ├── realtime.js            Live room updates and commands (SSE/HTTP)
│   └── static.js              Static asset server
├── public/
│   ├── index.html             Web app
│   ├── app.js                 Editor, game UI, AI Studio UI
│   ├── styles.css             Responsive styling
│   ├── defaults.js            Sample worlds
│   ├── realtime-client.js     Live updates + room-sync fallback
│   ├── manifest.webmanifest   Installable mobile app metadata
│   └── sw.js                  Service worker
├── test/                      Gameplay, bots, AI adapter and frontend tests
├── data/                      Active rooms (ephemeral on Render Free)
├── Start Talismaker.bat       Optional local launcher
├── Dockerfile
└── package.json
```
