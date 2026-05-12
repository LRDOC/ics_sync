import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildSiteArtifacts } from "../src/site.js";

test("site build writes html, svg, and ics artifacts", async () => {
  const docsDir = await fs.mkdtemp(path.join(os.tmpdir(), "ics-sync-site-"));
  const state = {
    generatedAt: "2026-05-12T03:41:31.881Z",
    events: [
      {
        uid: "markit:abc",
        startsAt: "2026-05-12T21:00:00.000Z",
        endsAt: "2026-05-12T23:00:00.000Z",
        updatedAt: "2026-05-12T03:41:31.881Z",
        status: "CONFIRMED",
        summary: "Boston Demo Night",
        location: "Boston, MA, USA",
        sourceUrl: "https://luma.com/demo",
        description: "Demo event"
      }
    ]
  };
  const config = {
    calendarName: "Jonathan Boston Upcoming Events",
    feedName: "jonathan-boston"
  };

  await buildSiteArtifacts(state, config, {
    docsDir,
    siteBaseUrl: "https://example.com/calendar"
  });

  const files = await fs.readdir(docsDir);
  assert.ok(files.includes("index.html"));
  assert.ok(files.includes("visual-explainer.html"));
  assert.ok(files.includes("architecture.svg"));
  assert.ok(files.includes("jonathan-boston.ics"));

  const html = await fs.readFile(path.join(docsDir, "index.html"), "utf8");
  assert.match(html, /https:\/\/example\.com\/calendar\/jonathan-boston\.ics/);
});
