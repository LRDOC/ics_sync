import test from "node:test";
import assert from "node:assert/strict";
import { toCanonicalOnSaleEvent } from "../src/sources/amc.js";

const config = { timezone: "America/New_York" };

const movie = {
  directors: "Jane Director",
  genre: "Action",
  id: 501,
  mpaaRating: "PG-13",
  name: "Example Movie",
  runTime: 128,
  showtimesUrl: "https://www.amctheatres.com/movies/example-movie",
  synopsis: "A movie about things."
};

const theatre = { id: 1234, name: "AMC Boston Common 19" };

test("toCanonicalOnSaleEvent labels a Thursday earliest showtime as a preview", () => {
  const showtime = {
    purchaseUrl: "https://www.amctheatres.com/showtimes/12345",
    showDateTimeLocal: "2026-11-05T19:00:00-05:00"
  };

  const event = toCanonicalOnSaleEvent(movie, theatre, showtime, config, new Date("2026-09-14T12:00:00.000Z"));

  assert.equal(event.uid, "amc:onsale:1234:501");
  assert.equal(event.kind, "onsale");
  assert.equal(event.pinStartToFirstSeen, true);
  assert.equal(event.allDay, false);
  assert.match(event.summary, /\(Thu preview\)$/);
  assert.equal(event.sourceUrl, showtime.purchaseUrl);
});

test("toCanonicalOnSaleEvent does not label a non-Thursday earliest showtime as a preview", () => {
  const showtime = { showDateTimeLocal: "2026-11-06T19:00:00-05:00" };
  const event = toCanonicalOnSaleEvent(movie, theatre, showtime, config, new Date("2026-09-14T12:00:00.000Z"));
  assert.doesNotMatch(event.summary, /Thu preview/);
  assert.equal(event.summary, "Example Movie tickets on sale — AMC Boston Common 19");
});

test("toCanonicalOnSaleEvent includes Movie/Runtime/Director first in that order", () => {
  const showtime = { showDateTimeLocal: "2026-11-05T19:00:00-05:00" };
  const event = toCanonicalOnSaleEvent(movie, theatre, showtime, config, new Date("2026-09-14T12:00:00.000Z"));
  assert.deepEqual(event.descriptionLines.slice(0, 3), [
    "Movie: Example Movie",
    "Runtime: 128 min",
    "Director: Jane Director"
  ]);
});
