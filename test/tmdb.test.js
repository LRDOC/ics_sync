import test from "node:test";
import assert from "node:assert/strict";
import {
  extractDirectors,
  extractUsTheatricalRelease,
  isRelevantSummary,
  toCanonicalReleaseEvent
} from "../src/sources/tmdb.js";

const config = {
  timezone: "America/New_York",
  tmdbApiBaseUrl: "https://api.themoviedb.org/3"
};

test("extractDirectors joins multiple directors and handles missing crew", () => {
  const withTwoDirectors = { credits: { crew: [
    { job: "Director", name: "Jane Director" },
    { job: "Writer", name: "Some Writer" },
    { job: "Director", name: "Alex Codirector" }
  ] } };
  assert.equal(extractDirectors(withTwoDirectors), "Jane Director, Alex Codirector");

  assert.equal(extractDirectors({ credits: { crew: [] } }), "");
  assert.equal(extractDirectors({}), "");
});

test("extractUsTheatricalRelease prefers wide theatrical (type 3) over limited (type 2)", () => {
  const movie = {
    release_date: "2026-10-01",
    release_dates: {
      results: [
        {
          iso_3166_1: "US",
          release_dates: [
            { type: 2, release_date: "2026-11-01T00:00:00.000Z", certification: "" },
            { type: 3, release_date: "2026-11-06T00:00:00.000Z", certification: "PG-13" }
          ]
        }
      ]
    }
  };

  const release = extractUsTheatricalRelease(movie);
  assert.equal(release.dateOnly, "2026-11-06");
  assert.equal(release.certification, "PG-13");
});

test("extractUsTheatricalRelease falls back to primary release_date when no US theatrical entry exists", () => {
  const movie = { release_date: "2026-12-25T00:00:00.000Z", release_dates: { results: [] } };
  const release = extractUsTheatricalRelease(movie);
  assert.equal(release.dateOnly, "2026-12-25");
  assert.equal(release.certification, "");
});

test("toCanonicalReleaseEvent builds an all-day event pinned to the exact release date regardless of host timezone", () => {
  const movie = {
    credits: { crew: [{ job: "Director", name: "Jane Director" }] },
    genres: [{ name: "Action" }, { name: "Sci-Fi" }],
    id: 42,
    overview: "A movie about things.",
    release_date: "2026-11-06T00:00:00.000Z",
    release_dates: {
      results: [
        {
          iso_3166_1: "US",
          release_dates: [{ type: 3, release_date: "2026-11-06T00:00:00.000Z", certification: "PG-13" }]
        }
      ]
    },
    runtime: 128,
    title: "Example Movie"
  };

  const event = toCanonicalReleaseEvent(movie, config, new Date("2026-09-14T12:00:00.000Z"));

  assert.equal(event.uid, "tmdb:42");
  assert.equal(event.allDay, true);
  assert.equal(event.startsAt.slice(0, 10), "2026-11-06");
  assert.equal(event.endsAt.slice(0, 10), "2026-11-07");
  assert.deepEqual(event.descriptionLines.slice(0, 3), [
    "Movie: Example Movie",
    "Runtime: 128 min",
    "Director: Jane Director"
  ]);
  assert.ok(event.descriptionLines.includes("Genre: Action, Sci-Fi"));
  assert.ok(event.descriptionLines.includes("Rating: PG-13"));
});

test("isRelevantSummary keeps a popular release", () => {
  assert.equal(isRelevantSummary({ popularity: 50, vote_count: 0 }), true);
});

test("isRelevantSummary drops a low-popularity, low-vote-count release", () => {
  assert.equal(isRelevantSummary({ popularity: 1, vote_count: 0 }), false);
});

test("isRelevantSummary keeps a classic on accumulated vote count alone", () => {
  // e.g. a Princess Mononoke re-release: little current buzz, huge accumulated votes
  assert.equal(isRelevantSummary({ popularity: 3, vote_count: 9000 }), true);
});

test("toCanonicalReleaseEvent returns null when no US theatrical date is available", () => {
  const movie = { id: 7, release_dates: { results: [] }, title: "No Date Movie" };
  assert.equal(toCanonicalReleaseEvent(movie, config), null);
});
