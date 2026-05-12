import test from "node:test";
import assert from "node:assert/strict";
import { dedupeEvents, canonicalIdentity } from "../src/canonical.js";

test("dedupe keeps the more complete duplicate", () => {
  const events = [
    {
      id: "abc123",
      title: "Boston Meetup",
      start: "2026-05-14T21:00:00.000Z",
      end: "",
      formattedAddress: "",
      externalLink: "",
      link: "",
      description: "",
      body: { type: "doc", content: [] },
      createdAt: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "abc123",
      title: "Boston Meetup",
      start: "2026-05-14T21:00:00.000Z",
      end: "2026-05-14T23:00:00.000Z",
      formattedAddress: "Boston, MA, USA",
      externalLink: "https://luma.com/meetup",
      link: "",
      description: "Full description",
      body: { type: "doc", content: [] },
      createdAt: "2026-05-02T00:00:00.000Z"
    }
  ];

  const deduped = dedupeEvents(events);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].externalLink, "https://luma.com/meetup");
  assert.equal(canonicalIdentity(deduped[0]), "markit:abc123");
});
