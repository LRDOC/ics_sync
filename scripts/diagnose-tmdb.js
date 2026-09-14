import { readConfig } from "../src/config.js";
import { fetchUpcomingMovies } from "../src/sources/tmdb.js";

const config = readConfig(process.env);
const movies = await fetchUpcomingMovies(config);

const rows = movies
  .map((m) => ({ popularity: m.popularity, title: m.title, vote_count: m.vote_count }))
  .sort((a, b) => a.popularity - b.popularity);

console.log(`${rows.length} movies passed the current filter, sorted by popularity ascending:`);
for (const row of rows) {
  console.log(`${row.popularity.toFixed(2)}\tvotes=${row.vote_count}\t${row.title}`);
}
