import { readConfig } from "../src/config.js";
import { isRelevantSummary } from "../src/sources/tmdb.js";

const config = readConfig(process.env);
const now = new Date();
const startDate = now.toISOString().slice(0, 10);
const end = new Date(now);
end.setUTCDate(end.getUTCDate() + config.movieLookaheadDays);
const endDate = end.toISOString().slice(0, 10);

const url = new URL(`${config.tmdbApiBaseUrl}/discover/movie`);
url.searchParams.set("region", "US");
url.searchParams.set("with_release_type", "2|3");
url.searchParams.set("sort_by", "popularity.desc");
url.searchParams.set("primary_release_date.gte", startDate);
url.searchParams.set("primary_release_date.lte", endDate);
url.searchParams.set("page", "1");

const response = await fetch(url, {
  headers: { accept: "application/json", authorization: `Bearer ${config.tmdbReadAccessToken}` }
});

console.log("status:", response.status);
console.log("url:", url.toString());
const data = await response.json();
console.log("total_results:", data.total_results, "total_pages:", data.total_pages);
console.log(
  (data.results || []).slice(0, 15).map((s) => ({
    origin_country: s.origin_country,
    passes: isRelevantSummary(s),
    popularity: s.popularity,
    title: s.title,
    vote_count: s.vote_count
  }))
);
