# Drift — Habit Tracker PWA

A calm, installable Progressive Web App for tracking daily habits.
Local-first, offline-ready, no accounts. Swipe right to mark done,
left to skip. When you finish all of your habits for the day, the
completion screen fades in with a short personal affirmation written
by Gemini, in your own voice.

## Files

| File | Role |
|---|---|
| `index.html` | The entire app: UI, state, swipe deck, dashboard, settings, localStorage |
| `manifest.json` | PWA install metadata (sage theme, standalone display, SVG icons) |
| `sw.js` | Service worker — offline-first cache of the app shell |
| `api/congrats.js` | Vercel serverless function — calls Gemini 2.5 Flash for the personalized completion message |
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

### 3. Add the Gemini API key as an environment variable

1. Get a free API key from [aistudio.google.com](https://aistudio.google.com/apikey) — it starts with `AIza...`
2. In your Vercel dashboard, open the **drift** project
3. **Settings** → **Environment Variables** (left sidebar)
4. Add a new variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: your Gemini API key
   - **Environments**: check **Production**, **Preview**, and **Development**
5. Click **Save**

If you previously had `ANTHROPIC_API_KEY` set from an earlier version of this app, you can remove it — it's no longer used.

### 4. Redeploy

Environment variables only take effect on new deployments:

- **Deployments** tab → click the **⋯** menu on the latest deploy → **Redeploy**
- Or push any small commit (e.g. a README change) to trigger a fresh build

That's it. The PWA is live, installable, and the completion screen will now show a personalized Gemini-generated message the first time you finish all your habits each day.

## How the affirmation works

When you complete all habits for the day, the app sends `habitCount` and `habitNames` to `/api/congrats`. The serverless function (running on Vercel, never in the browser) holds `GEMINI_API_KEY` and calls **Gemini 2.5 Flash** for a calm, first-person, ≤2-sentence affirmation — written as if you'd written it to yourself in a journal. Thinking is disabled (`thinkingBudget: 0`) — for a 2-sentence generation it would just add latency and cost.

The screen waits briefly on the pulsing orb while the affirmation generates, then fades the text up into place with a smooth 800ms ease. The pills follow 250ms later. The result is cached in `localStorage` keyed by date so the API is hit at most once per user per day; the entrance animation still plays each time the screen opens.

If the API takes longer than 4.5s, the key is missing, the user is offline, or anything fails, a generated first-person fallback (e.g. *"I completed all 5 of my habits for today."*) takes its place — with the same animation.

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

Set `GEMINI_API_KEY` in a local `.env` (or `.env.local`) file if you want the message to work under `vercel dev`.

## Model & cost notes

- Model: `gemini-2.5-flash` with thinking disabled (`thinkingBudget: 0`)
- Per call: ~100 input tokens + ~60 output tokens
- Gemini 2.5 Flash pricing without thinking is ~$0.30/M input + $2.50/M output, so roughly **$0.00018 per completion** — and the result is cached per day per user
- Google AI Studio also offers a free tier that covers most personal-use volumes outright

## Privacy

- All habit data stays in your browser's `localStorage`. Nothing leaves the device except a count and habit name list when you trigger the congratulations message.
- The API key is never sent to the browser — it lives only in Vercel's environment variables.
