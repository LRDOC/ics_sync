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
  - TMDB `/discover/movie` + `/movie/{id}?append_to_response=credits,release_dates` for upcoming US theatrical releases (`src/sources/tmdb.js`)
  - AMC `/v2/movies/views/coming-soon` + `/v2/movies/views/advance` for candidate titles, then `/v2/theatres/{id}/movies/{id}/earliest-showtime` per tracked theatre to detect the first on-sale showtime (`src/sources/amc.js`)
- Orchestration: `src/movieSync.js` merges both sources' canonical events through the same `mergeState` used by the Markit feed.
- Tracked AMC theatres: AMC Boston Common 19, AMC Assembly Row 12 (`AMC_THEATRE_IDS`).
- On-sale alerts fire once per movie+theatre, anchored to the sync run that first observed them (`pinStartToFirstSeen`), and are suppressed entirely on the feed's very first-ever sync (cold-start baseline) so pre-existing on-sale movies don't flood the calendar.
- AMC's developer portal blocks automated doc retrieval; the endpoint paths used here come from reconstructed public documentation and are unverified against every AMC API surface until confirmed by real production sync runs.

## Future source ideas

- additional Markit profiles
- Luma source adapter
- Partiful source adapter
- Eventbrite organizer feeds
- Posh organizer feeds
- direct newsletter archive parsing
- category-specific calendars like AI, fintech, climate, robotics

## Known tradeoffs

- Google Calendar refresh timing is outside our control.
- Boston filtering is geographic text matching over public event fields, not the exact private client UI state.
- GitHub Actions cron timing is best effort and may drift by a few minutes.
- With the current GitHub Pages setup, repository privacy depends on the account plan that owns the repo.
