# Context

This project continuously regenerates public ICS feeds. It started with one feed for Jonathan Chang's Boston-area upcoming events from Markit, and now also publishes a second, independent feed for movie release dates and AMC ticket on-sale alerts.

## Why this exists

- Google Calendar can subscribe to ICS feeds, but it cannot pull directly from Markit's profile view.
- Markit's public profile is JS-rendered, so the feed is reverse-engineered from public backend endpoints instead of HTML scraping.
- The project is designed so more public sources can be added later behind the same normalization and feed-generation pipeline.

## Current production path

- Profile resolution:
  - public Firestore query against `markit-d5e9b`
  - resolves `username=jonathan` to Jonathan's public user document
- Event fetch:
  - public Markit Cloud Function `user/creatorEvents?uid=<uid>`
- Filtering:
  - only timed, non-draft, Boston-area upcoming events
  - excludes `Post`, `PDF`, and `Custom Product`
- Output:
  - ICS file
  - human-facing Pages site
  - visual explainer HTML

## State and cancellation model

- Stable UIDs come from the Markit event id when present.
- On each sync:
  - matching events are refreshed in place
  - missing future events become `CANCELLED`
  - cancelled events are retained for 3 days
  - recently ended events remain visible for 24 hours
- State persistence is stored in `state/state/jonathan-boston.json` for the GitHub Pages deployment path.

## Deployment model

- Source code lives in the `ics_sync` GitHub repository.
- GitHub Actions runs every 10 minutes.
- The action:
  - runs the sync
  - regenerates `docs/jonathan-boston.ics`
  - rebuilds the Pages site assets
  - publishes generated `.ics` files and state snapshots to the `gh-pages` branch
- GitHub Pages serves the `gh-pages` branch from the same repository.

## Movie release feed (`movie-releases`)

- Profile resolution: none needed; both sources are queried directly.
- Event fetch:
  - TMDB `/discover/movie` (release types 2|3, popularity-sorted) + `/movie/{id}?append_to_response=credits,release_dates` for upcoming US theatrical releases, filtered post-fetch to US-origin movies with popularity ≥ 5 or ≥ 500 accumulated votes (`src/sources/tmdb.js`, `isRelevantSummary`)
  - AMC `/v2/movies/views/coming-soon` + `/v2/movies/views/advance` for candidate titles, then `/v2/theatres/{id}/movies/{id}/earliest-showtime` per tracked theatre to detect the first on-sale showtime (`src/sources/amc.js`)
- Orchestration: `src/movieSync.js` merges both sources' canonical events through the same `mergeState` used by the Markit feed.
- Tracked AMC theatres: AMC Boston Common 19, AMC Assembly Row 12 (`AMC_THEATRE_IDS`).
- On-sale alerts fire once per movie+theatre, anchored to the sync run that first observed them (`pinStartToFirstSeen`), and are suppressed entirely on the feed's very first-ever sync (cold-start baseline) so pre-existing on-sale movies don't flood the calendar.
- AMC endpoints are confirmed live (real 403/400 responses from the actual API, not 404s). The vendor key itself is inactive until AMC's weekly Thursday production deploy; `AMC_THEATRE_IDS` is also still unset. Until both are done, the AMC half contributes zero events and fails soft.

## Future source ideas

- additional Markit profiles
- Luma source adapter
- Partiful source adapter
- Eventbrite organizer feeds
- Posh organizer feeds
- direct newsletter archive parsing
- category-specific calendars like AI, fintech, climate, robotics
- add IMDb + Rotten Tomatoes scores to movie event descriptions via OMDb API (free, 1000 req/day, keyed by TMDB's `imdb_id`, no scraping needed). Deliberately skipping Letterboxd's rating for this — no public API for it, only their request-only official API or scraping their public film pages, which is fragile and likely against their ToS. Decided not to build any of this for now.
- personalized taste-based filtering from a Letterboxd watch/ratings history, replacing the global popularity heuristic (see "Movie feed known limitations" above) — not started

## Known tradeoffs

- Google Calendar refresh timing is outside our control.
- Boston filtering is geographic text matching over public event fields, not the exact private client UI state.
- GitHub Actions cron timing is best effort and may drift by a few minutes.
- With the current GitHub Pages setup, repository privacy depends on the account plan that owns the repo.

## Movie feed known limitations

- **No personal-taste signal, and no clean fix available from TMDB alone.** Filtering is global popularity/vote count, which has no idea who's subscribed. Confirmed empirically: at typical multi-month lead times, wanted franchise titles and unwanted small releases land on identical scores (e.g. "The Angry Birds Movie 3" and "Wicker" both scored popularity 6.51 in one real sync). No threshold can separate them because the underlying data doesn't carry that distinction yet — it only sharpens closer to release. Some noise (small US indie titles) is an accepted cost of also catching real franchise films this early.
  - Considered next step: ingest a Letterboxd watch/ratings history (official API is request-only via `api@letterboxd.com`, uncertain approval; the practical path is a manual `diary.csv` export, which requires Letterboxd Pro and periodic re-upload since there's no live sync) and score candidates against actual watched directors/genres/franchises instead of global popularity. Not built yet.
  - A manual denylist (always-exclude specific titles) was considered as a lighter stopgap; also not built yet.
- **AMC on-sale half is currently inert.** `AMC_THEATRE_IDS` is unset and the AMC vendor key isn't authorized in production yet (AMC deploys new keys weekly). The AMC-sourced half of this feed contributes zero events until both are resolved, but fails soft rather than breaking the TMDB half.
- **Google Calendar doesn't hide `STATUS:CANCELLED` events in month view** — confirmed live, cancelled titles rendered as normal-looking entries. Mitigated for this feed by setting `CANCELLED_RETENTION_DAYS=0` so cancelled movies drop out of the file almost immediately rather than lingering for days, but Google's own poll timing still governs when a subscribed calendar actually reflects that.
- **Google Calendar also appears to cache subscribed feed content server-side by URL**, independent of client-side re-polling — a full remove-and-re-subscribe didn't clear stale data once. The only confirmed fix was publishing under a new URL; there's no known way to force-invalidate the old one from our side.
