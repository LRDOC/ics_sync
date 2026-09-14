import fs from "node:fs/promises";
import path from "node:path";
import { readConfig } from "../src/config.js";
import { renderIcs } from "../src/ics.js";
import { loadMovieStateOrSync } from "../src/movieSync.js";
import { createStore } from "../src/store.js";

const config = readConfig(process.env);
const store = createStore(config);
const state = await loadMovieStateOrSync(config, store);
const docsDir = path.resolve(process.cwd(), "docs");
const feedPath = path.join(docsDir, `${config.feedName}.ics`);

await fs.mkdir(docsDir, { recursive: true });
await fs.writeFile(feedPath, renderIcs(state, config));

console.log(
  JSON.stringify(
    {
      docsDir,
      feedPath,
      generatedAt: state.generatedAt
    },
    null,
    2
  )
);
