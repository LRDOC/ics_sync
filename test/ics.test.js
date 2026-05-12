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
          timezone: "America/New_York",
          sourceId: "abc123",
          sourceProfileUrl: "https://markitai.com/u/jonathan",
          sourceUrl: "https://luma.com/demo-night",
          eventType: "External Without Data",
          categories: ["AI", "Founder"],
          description: "Showcase event"
        }
      ]
    },
    {
      calendarName: "Jonathan Boston Upcoming Events"
    }
  );
  const unfolded = ics.replace(/\r\n /g, "");

  assert.match(unfolded, /SUMMARY:Boston Demo Night/);
  assert.match(unfolded, /STATUS:CANCELLED/);
  assert.match(unfolded, /Event Link: https:\/\/luma\.com\/demo-night/);
  assert.match(unfolded, /Markit Profile: https:\/\/markitai\.com\/u\/jonathan/);
  assert.match(unfolded, /Location: Boston\\, MA\\, USA/);
  assert.match(unfolded, /Event Type: External Without Data/);
  assert.match(unfolded, /Categories: AI\\, Founder/);
  assert.match(unfolded, /Markit Event ID: abc123/);
  assert.match(unfolded, /URL:https:\/\/luma\.com\/demo-night/);
  assert.match(unfolded, /Showcase event/);
});
