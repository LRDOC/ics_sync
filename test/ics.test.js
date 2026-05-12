import test from "node:test";
import assert from "node:assert/strict";
import { renderIcs } from "../src/ics.js";

test("ics output includes event link and cancelled status", () => {
  const ics = renderIcs(
    {
      generatedAt: "2026-05-11T22:00:00.000Z",
      events: [
        {
          uid: "markit:abc123",
          startsAt: "2026-05-12T21:00:00.000Z",
          endsAt: "2026-05-12T23:00:00.000Z",
          updatedAt: "2026-05-11T22:00:00.000Z",
          status: "CANCELLED",
          summary: "Boston Demo Night",
          location: "Boston, MA, USA",
          sourceUrl: "https://luma.com/demo-night",
          description: "Showcase event"
        }
      ]
    },
    {
      calendarName: "Jonathan Boston Upcoming Events"
    }
  );

  assert.match(ics, /SUMMARY:Boston Demo Night/);
  assert.match(ics, /STATUS:CANCELLED/);
  assert.match(ics, /Event Link: https:\/\/luma\.com\/demo-night/);
  assert.match(ics, /URL:https:\/\/luma\.com\/demo-night/);
});
