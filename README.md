# Get Ripped

A workout tracker for the phone ("Workout by Tim"): build a workout from your exercise library, see which muscles it hits on a body map, and train with a rest timer that rings when the next set is due.

**Live:** [get-ripped-tau.vercel.app](https://get-ripped-tau.vercel.app) · **Stack:** TanStack Start, React, Upstash Redis, Vercel

## What it does

- **Exercise library.** Save exercises with groups (push, legs, full body…), the muscles they target, and default sets, reps and weight. Weight can be shown as 0–5 dots or in kg.
- **Body map.** Front and back body with tappable muscles: filled when selected, light when they have exercises, dashed when none. Pick a muscle to find its exercises.
- **Presets and workout of the day.** Combine presets into today's workout, then reorder it with drag and drop.
- **Live session.** Change sets, reps and weight on the fly while you train.
- **Rest timer with alarm.** The alarm still sounds on iPhone when the screen locks or the silent switch is on, and the screen stays awake during a session.
- **Calendar.** Plan days and look back at what you did.
- **Works offline, syncs when signed in.** Everything is stored on the device. With Google sign-in the data is also saved to your account, and a second phone or an old browser tab can't overwrite newer data it didn't touch.
- **Installs like an app.** Add it to the iPhone home screen; it checks for a new version whenever you come back to it.

## How it's built

- TanStack Start and Router, React, TanStack Query, Tailwind CSS 4, Vite and TypeScript.
- Local first: all data lives on the device and works offline. Server routes add Google sign-in and per-user sync, stored in Upstash Redis.
- Sync keeps a "last changed" time per part (exercises, calendar days, day logs, presets), so the newer side always wins per part.
- iPhone details: the rest alarm uses the Audio Session API to play on silent, and the Screen Wake Lock API keeps the screen on.

```text
src/routes/          pages: workout of the day, timer, calendar, settings
src/components/      exercise cards, body map, timer, drag-and-drop lists
src/lib/gym.ts       app state and data model (local-first)
src/lib/sync.ts      account sync with per-part last-changed merging
src/lib/server/      Google sign-in and state API
```

The exercise library in `src/lib/library.ts` is my own starting set.

## Run it locally

```sh
npm install
npm run dev
```

The app works fully on the device without any setup. Account sync is optional and needs these environment variables:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client (Web application) |
| `SESSION_SECRET` | Any long random string |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work) |

Without them the app reports sync as not configured and keeps working locally. `.env` files are ignored by git, so secrets stay out of the repository.

## About

A personal project by [CyborgJungle](https://github.com/CyborgJungle), built with [Claude Code](https://claude.com/claude-code) and hosted on [Vercel](https://vercel.com). It is shared as part of my portfolio: feel free to copy it and make it your own.

## License

MIT, see [LICENSE](LICENSE).
