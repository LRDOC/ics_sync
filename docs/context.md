# Context

This project continuously regenerates a public ICS feed for Jonathan Chang's Boston-area upcoming events from Markit.

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

- Source code lives in a private GitHub repository.
- GitHub Actions runs every 10 minutes.
- The action:
  - runs the sync
  - regenerates `docs/jonathan-boston.ics`
  - rebuilds the Pages site
  - commits updated state and docs back to `main`
  - mirrors only the public artifacts into a separate public GitHub Pages repository
- GitHub Pages serves the public repo, not the private code repo.
- The public repo only needs the ICS artifact and a minimal README.

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
- The public deployment repo contains only the ICS artifact plus a minimal landing readme; source code, visual docs, and private workflow state remain in the private repo.
