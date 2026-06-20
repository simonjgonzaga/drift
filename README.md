# Drift — Habit Tracker PWA

A calm, installable Progressive Web App for tracking daily habits. Swipe right
to mark done, left to skip; tap into the checklist view for retroactive ticks
across past days. Data lives in **Supabase** and syncs across every device you
sign in on. When you finish all of today's habits, **Gemini 2.5 Flash** writes
you a short personal affirmation.

## Files

| File | Role |
|---|---|
| `index.html` | The entire app: UI, swipe deck, list view, dashboard, settings. Loads Supabase JS from a CDN, fetches runtime config from `/api/config`, gates everything behind a magic-link sign-in. |
| `manifest.json` | PWA install metadata (sage theme, standalone display, SVG icons) |
| `sw.js` | Service worker — offline-first cache of the app shell |
| `api/config.js` | Vercel serverless function — returns Supabase URL + anon key from env at runtime |
| `api/congrats.js` | Vercel serverless function — calls Gemini for the completion affirmation |
| `supabase/migration.sql` | The schema (`habits`, `completions`, `closed_days`) + RLS policies. Run once in your Supabase SQL editor. |
| `package.json` | Dependencies for the serverless functions |
| `.env.example` | The full list of required env vars |

## First-time setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Name it (`drift` works). Pick a region close to you. Save the database password somewhere safe (you won't need it for this app, but it's required when creating the project).
2. Wait for provisioning (~1 minute).

### 2. Run the schema

1. Once the project is ready, open **SQL Editor** (left sidebar) → **New query**.
2. Open [`supabase/migration.sql`](supabase/migration.sql) from this repo, paste the entire file into the SQL editor, and click **Run**.
3. You should see "Success. No rows returned." Three tables now exist: `habits`, `completions`, `closed_days` — all locked down with Row Level Security policies that scope rows to `auth.uid()`.

### 3. Configure the magic-link redirect URL

1. **Authentication** → **URL Configuration** (left sidebar).
2. Under **Site URL**, set your Vercel production URL (e.g. `https://drift-yourname.vercel.app`).
3. Under **Redirect URLs**, add the same URL. Also add `http://localhost:3000` if you'll be running `vercel dev` locally.
4. Save.

Without this step, magic-link emails arrive but clicking the link bounces with a redirect-not-allowed error.

### 4. Add env vars to Vercel

In the **Drift** project on Vercel → **Settings → Environment Variables**, add three values for **Production**, **Preview**, and **Development**:

| Key | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → **Project Settings → API** → "Project URL" |
| `SUPABASE_ANON_KEY` | Same page → "Project API keys" → **anon / public** |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

After adding env vars: **Deployments tab → ⋯ on latest deploy → Redeploy** so the new values reach the running app.

### 5. Sign in

Visit your Vercel URL. The app loads to a magic-link screen. Enter your email, click the link in the message Supabase sends, and you're in. The first sign-in seeds the database with the 16 default habits (Meditate, Read, Gym, etc.) — you can edit or delete any of them from the Habits tab.

From now on, signing in on any other device with the same email gives you the same data.

## How the data layer works

| Layer | Storage | Notes |
|---|---|---|
| Habits, completions, closed days | **Supabase** | Source of truth. Per-user via RLS. |
| In-memory cache | JS variables | Hydrated from Supabase on boot. Drives the render path (sync access for snappy UI). |
| Settings (reminder toggles, default period) | `localStorage` | Device-specific UI prefs. Don't need cross-device sync. |
| Affirmation cache | `localStorage` | One per day per device. Keeps Gemini calls cheap. |

Writes follow an **optimistic** pattern: the in-memory state updates immediately so the UI feels instant, then the Supabase write fires in the background (`fireWrite()` wrapper). If a write fails, the error logs to the console — a future iteration could surface it as a toast. Swipes, ticks, close-day, and reopen-day are all fire-and-forget. Add-habit, edit-habit, and delete-habit do await so the user sees the new row only after the server confirms.

## Running locally

```bash
npm install        # installs deps for the serverless functions
npx vercel dev     # serves the static files + /api routes on localhost:3000
```

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` in a `.env.local` file at the project root (don't commit it — it's in `.gitignore`). Add `http://localhost:3000` to your Supabase project's Redirect URLs so the magic link works in dev.

## Model & cost notes

- **Gemini 2.5 Flash** with thinking disabled (`thinkingBudget: 0`)
- ~100 input + ~60 output tokens per completion = roughly **$0.00018 per call**
- Cached per-day per device, so a single user costs ~6¢/year tops

## Privacy

- Habit data lives in **your** Supabase project. You own it; you control retention and exports.
- Row Level Security means even with the public anon key in everyone's browser, no user can read another user's data.
- The Gemini call sends only `habitCount` and `habitNames` for the day — no completion history, no streak data, no identifying info beyond what you've named your habits.
- Sign-out clears your session locally but leaves your data in Supabase untouched.
