# Drift — Habit Tracker PWA

A calm, installable Progressive Web App for tracking daily habits.
Local-first, offline-ready, no accounts. Swipe right to mark done,
left to skip. When you finish all of your habits for the day, Claude
writes you a short personal congratulations.

## Files

| File | Role |
|---|---|
| `index.html` | The entire app: UI, state, swipe deck, dashboard, settings, localStorage |
| `manifest.json` | PWA install metadata (sage theme, standalone display, SVG icons) |
| `sw.js` | Service worker — offline-first cache of the app shell |
| `api/congrats.js` | Vercel serverless function — calls Claude Haiku for the personalized completion message |
| `package.json` | Dependencies for the serverless function |

## Deploying to Vercel

The static files (`index.html`, `manifest.json`, `sw.js`) work on any HTTPS host. The personalized congratulations message requires the serverless function in `api/congrats.js`, which needs Vercel (or any platform that supports Node serverless functions and reads `package.json` automatically).

### 1. Push to GitHub

The repo is already on GitHub at `simonjgonzaga/drift`. Vercel installs from there directly.

### 2. Import the repo in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** and select `simonjgonzaga/drift`
3. Framework Preset: **Other** (Vercel auto-detects the static files + `api/` folder)
4. Click **Deploy** — leave everything else at defaults

The first deploy will succeed but the congratulations message will return a 500 until you add the API key (next step).

### 3. Add the Anthropic API key as an environment variable

1. In your Vercel dashboard, open the **drift** project
2. **Settings** → **Environment Variables** (left sidebar)
3. Add a new variable:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: your Anthropic API key (starts with `sk-ant-...`) — get one from [console.anthropic.com](https://console.anthropic.com)
   - **Environments**: check **Production**, **Preview**, and **Development**
4. Click **Save**

### 4. Redeploy

Environment variables only take effect on new deployments:

- **Deployments** tab → click the **⋯** menu on the latest deploy → **Redeploy**
- Or push any small commit (e.g. a README change) to trigger a fresh build

That's it. The PWA is live, installable, and the completion screen will now show a personalized Claude-generated message the first time you finish all your habits each day.

## How the congratulations message works

When you complete all habits for the day, the app sends `habitCount` and `habitNames` to `/api/congrats`. The serverless function (running on Vercel, never in the browser) holds `ANTHROPIC_API_KEY` and calls **Claude Haiku 4.5** for a calm, ≤2-sentence acknowledgment. The result is cached in `localStorage` keyed by date, so the API is hit at most once per day per user — even if you reopen the completion screen.

If the API key is missing, the user is offline, or anything fails, the screen falls back to the original static subtitle without complaint.

## Running locally

```bash
# Install dependencies (only needed for the serverless function)
npm install

# Run with Vercel CLI to get the serverless function working locally
npx vercel dev
# → http://localhost:3000

# Or just open index.html directly to test the UI
# (the congratulations message will silently fall back to the static text)
open index.html
```

Set `ANTHROPIC_API_KEY` in a local `.env` (or `.env.local`) file if you want the message to work under `vercel dev`.

## Model & cost notes

- Model: `claude-haiku-4-5`
- Per call: ~100 input tokens + ~60 output tokens
- At Haiku pricing ($1/M input, $5/M output) that's roughly **$0.0004 per completion** — cached per day per user
- A free Anthropic tier with $5 credit will cover ≈12,500 daily completions

## Privacy

- All habit data stays in your browser's `localStorage`. Nothing leaves the device except a count and habit name list when you trigger the congratulations message.
- The API key is never sent to the browser — it lives only in Vercel's environment variables.
