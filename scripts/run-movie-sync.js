import { readConfig } from "../src/config.js";
import { runMovieSync } from "../src/movieSync.js";
import { createStore } from "../src/store.js";

const config = readConfig(process.env);
const store = createStore(config);
const result = await runMovieSync(config, store);

console.log(JSON.stringify(result, null, 2));
