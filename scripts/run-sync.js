import { readConfig } from "../src/config.js";
import { createStore } from "../src/store.js";
import { runSync } from "../src/sync.js";

const config = readConfig(process.env);
const store = createStore(config);
const result = await runSync(config, store);

console.log(JSON.stringify(result, null, 2));
