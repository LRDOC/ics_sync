import fs from "node:fs/promises";
import path from "node:path";
import { readConfig } from "../src/config.js";
import { buildSiteArtifacts } from "../src/site.js";
import { createStore } from "../src/store.js";
import { loadStateOrSync } from "../src/sync.js";

const config = readConfig(process.env);
const store = createStore(config);
const state = await loadStateOrSync(config, store);
const docsDir = path.resolve(process.cwd(), "docs");
const siteBaseUrl = process.env.SITE_BASE_URL || "";

await buildSiteArtifacts(state, config, { docsDir, siteBaseUrl });

await fs.copyFile(path.resolve(process.cwd(), "CONTEXT.md"), path.join(docsDir, "context.md"));

console.log(
  JSON.stringify(
    {
      docsDir,
      feedPath: path.join(docsDir, `${config.feedName}.ics`),
      generatedAt: state.generatedAt,
      siteBaseUrl
    },
    null,
    2
  )
);
