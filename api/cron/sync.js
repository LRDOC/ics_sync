import { assertCronSecret, readConfig } from "../../src/config.js";
import { createStore } from "../../src/store.js";
import { runSync } from "../../src/sync.js";

function readBearerToken(headerValue) {
  const match = /^Bearer\s+(.+)$/i.exec(headerValue || "");
  return match ? match[1] : "";
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const config = readConfig(process.env);
    assertCronSecret(config);

    const providedSecret = readBearerToken(req.headers.authorization);
    if (providedSecret !== config.cronSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const store = createStore(config);
    const summary = await runSync(config, store);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message || "Sync failed" });
  }
}
