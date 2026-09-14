import test from "node:test";
import assert from "node:assert/strict";
import { fetchOnSaleResult, runMovieSync } from "../src/movieSync.js";

const config = {
  amcApiBaseUrl: "https://api.amctheatres.com",
  amcTheatreIds: ["1000"],
  amcVendorKey: "test-vendor-key",
  cancelRetentionDays: 3,
  feedName: "movie-releases",
  pastEventRetentionHours: 24,
  timezone: "America/New_York",
  tmdbReadAccessToken: ""
};

function jsonResponse(status, body) {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status
  };
}

function createFetchStub({ candidates, showtimesByMovieId, theatre }) {
  return async (url) => {
    const href = url.toString();

    if (href.includes("/v2/movies/views/coming-soon")) {
      return jsonResponse(200, { _embedded: { movies: candidates } });
    }
    if (href.includes("/v2/movies/views/advance")) {
      return jsonResponse(200, { _embedded: { movies: [] } });
    }
    if (href.match(/\/v2\/theatres\/\d+$/)) {
      return jsonResponse(200, theatre);
    }
    const showtimeMatch = href.match(/\/v2\/theatres\/\d+\/movies\/(\d+)\/earliest-showtime/);
    if (showtimeMatch) {
      const showtime = showtimesByMovieId[showtimeMatch[1]];
      return showtime ? jsonResponse(200, showtime) : jsonResponse(404, {});
    }

    throw new Error(`Unexpected URL in test fetch stub: ${href}`);
  };
}

const theatre = { id: 1000, name: "AMC Test Theatre" };
const movieA = { directors: "Dir A", id: 1, name: "Movie A", runTime: 100, synopsis: "Synopsis A" };
const movieB = { directors: "Dir B", id: 2, name: "Movie B", runTime: 110, synopsis: "Synopsis B" };
const showtime = { purchaseUrl: "https://example.com/tickets", showDateTimeLocal: "2026-11-05T19:00:00-05:00" };

test("cold start records a baseline but emits zero on-sale alerts", async () => {
  const fetchImpl = createFetchStub({
    candidates: [movieA],
    showtimesByMovieId: { 1: showtime },
    theatre
  });

  const result = await fetchOnSaleResult(config, {}, new Date("2026-09-14T12:00:00.000Z"), console, fetchImpl);

  assert.deepEqual(result.events, []);
  assert.deepEqual(result.baseline, ["1000:1"]);
});

test("a movie already in the baseline does not fire again", async () => {
  const fetchImpl = createFetchStub({
    candidates: [movieA],
    showtimesByMovieId: { 1: showtime },
    theatre
  });

  const previousState = { amcOnSaleBaseline: ["1000:1"] };
  const result = await fetchOnSaleResult(config, previousState, new Date("2026-09-15T12:00:00.000Z"), console, fetchImpl);

  assert.deepEqual(result.events, []);
  assert.deepEqual(result.baseline, ["1000:1"]);
});

test("a newly observed advance movie (not in baseline, not cold start) fires exactly one alert", async () => {
  const fetchImpl = createFetchStub({
    candidates: [movieA, movieB],
    showtimesByMovieId: { 1: showtime, 2: showtime },
    theatre
  });

  const previousState = { amcOnSaleBaseline: ["1000:1"] };
  const result = await fetchOnSaleResult(config, previousState, new Date("2026-09-16T12:00:00.000Z"), console, fetchImpl);

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].uid, "amc:onsale:1000:2");
  assert.deepEqual(result.baseline.sort(), ["1000:1", "1000:2"]);
});

test("runMovieSync persists the baseline across two syncs so a stable movie never duplicates", async () => {
  const saved = new Map();
  const store = {
    async loadJson(key) {
      return saved.has(key) ? saved.get(key) : null;
    },
    async saveJson(key, value) {
      saved.set(key, value);
    }
  };

  const fetchImpl = createFetchStub({
    candidates: [movieA],
    showtimesByMovieId: { 1: showtime },
    theatre
  });

  const firstRun = await runMovieSync(config, store, { fetchImpl, now: new Date("2026-09-14T12:00:00.000Z") });
  assert.equal(firstRun.onSaleAlertsCount, 0);

  const secondRun = await runMovieSync(config, store, { fetchImpl, now: new Date("2026-09-15T12:00:00.000Z") });
  assert.equal(secondRun.onSaleAlertsCount, 0);
  assert.equal(secondRun.publishedCount, 0);
});
