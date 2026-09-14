import { readConfig } from "../src/config.js";

const config = readConfig(process.env);
const headers = { accept: "application/json", authorization: `Bearer ${config.tmdbReadAccessToken}` };

for (const title of ["Street Fighter", "The Hunger Games: Sunrise on the Reaping", "Jumanji"]) {
  const searchUrl = new URL(`${config.tmdbApiBaseUrl}/search/movie`);
  searchUrl.searchParams.set("query", title);
  const searchData = await (await fetch(searchUrl, { headers })).json();
  const top = searchData.results?.[0];
  console.log(`\n=== ${title} -> found: ${top?.title} (id ${top?.id}) ===`);
  if (!top) continue;

  const detailUrl = new URL(`${config.tmdbApiBaseUrl}/movie/${top.id}`);
  detailUrl.searchParams.set("append_to_response", "release_dates");
  const detail = await (await fetch(detailUrl, { headers })).json();
  console.log("popularity:", detail.popularity, "vote_count:", detail.vote_count, "release_date:", detail.release_date);
  const us = detail.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  console.log("US release_dates entry:", JSON.stringify(us, null, 2));
}
