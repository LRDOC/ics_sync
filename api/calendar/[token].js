import { assertFeedToken, readConfig } from "../../src/config.js";
import { renderIcs } from "../../src/ics.js";
import { createStore } from "../../src/store.js";
import { loadStateOrSync } from "../../src/sync.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const config = readConfig(process.env);
    assertFeedToken(config);

    if (req.query.token !== config.feedToken) {
      res.status(404).send("Not found");
      return;
    }

    const store = createStore(config);
    const state = await loadStateOrSync(config, store);
    const ics = renderIcs(state, config);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.setHeader("Content-Disposition", 'inline; filename="jonathan-boston.ics"');
    res.status(200).send(ics);
  } catch (error) {
    res.status(500).send(error.message || "Calendar render failed");
  }
}
