import test from "node:test";
import assert from "node:assert/strict";
import { mergeState } from "../src/sync.js";

const config = {
  cancelRetentionDays: 3,
  feedName: "jonathan-boston",
  pastEventRetentionHours: 24
};

test("missing future events become cancelled", () => {
  const previous = {
    events: [
      {
        uid: "markit:future-event",
        startsAt: "2026-05-20T21:00:00.000Z",
        endsAt: "2026-05-20T23:00:00.000Z",
        updatedAt: "2026-05-11T22:00:00.000Z",
        status: "CONFIRMED"
      }
    ]
  };

  const merged = mergeState(previous, [], config, new Date("2026-05-12T00:00:00.000Z"));
  assert.equal(merged.events.length, 1);
  assert.equal(merged.events[0].status, "CANCELLED");
  assert.ok(merged.events[0].missingSince);
});

test("recently ended events are retained without cancellation", () => {
  const previous = {
    events: [
      {
        uid: "markit:recently-ended",
        startsAt: "2026-05-11T21:00:00.000Z",
        endsAt: "2026-05-11T23:00:00.000Z",
        updatedAt: "2026-05-11T22:00:00.000Z",
        status: "CONFIRMED"
      }
    ]
  };

  const merged = mergeState(previous, [], config, new Date("2026-05-12T12:00:00.000Z"));
  assert.equal(merged.events.length, 1);
  assert.equal(merged.events[0].status, "CONFIRMED");
});
