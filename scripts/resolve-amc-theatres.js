import { readConfig } from "../src/config.js";
import { resolveTheatreByName } from "../src/sources/amc.js";

const config = readConfig(process.env);
const names = process.argv.slice(2);

if (names.length === 0) {
  console.error("Usage: node scripts/resolve-amc-theatres.js \"AMC Boston Common 19\" \"AMC Assembly Row 12\"");
  process.exit(1);
}

for (const name of names) {
  const matches = await resolveTheatreByName(config, name);
  console.log(
    JSON.stringify(
      {
        matches: matches.map((theatre) => ({ id: theatre.id, name: theatre.name, slug: theatre.slug })),
        query: name
      },
      null,
      2
    )
  );
}
