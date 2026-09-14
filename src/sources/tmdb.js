import { mapWithConcurrency } from "../concurrency.js";
import { fetchJson } from "../httpClient.js";

const DETAIL_FETCH_CONCURRENCY = 4;
const MAX_DISCOVER_PAGES = 15;
const MIN_CLASSIC_VOTE_COUNT = 500;
const MIN_POPULARITY = 5;

export function isRelevantSummary(summary) {
  if ((summary.vote_count || 0) >= MIN_CLASSIC_VOTE_COUNT) {
    return true;
  }

  const isUsOrigin = (summary.origin_country || []).includes("US");
  return isUsOrigin && (summary.popularity || 0) >= MIN_POPULARITY;
}

function toDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function addDaysDateOnly(dateOnly, days) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function authHeaders(config) {
  return {
    accept: "application/json",
    authorization: `Bearer ${config.tmdbReadAccessToken}`
  };
}

export async function fetchUpcomingMovieSummaries(config, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || new Date();
  const startDate = toDateOnly(now.toISOString());
  const endDate = addDaysDateOnly(startDate, config.movieLookaheadDays);

  const summaries = [];
  for (let page = 1; page <= MAX_DISCOVER_PAGES; page += 1) {
    const url = new URL(`${config.tmdbApiBaseUrl}/discover/movie`);
    url.searchParams.set("region", "US");
    url.searchParams.set("with_release_type", "2|3");
    url.searchParams.set("sort_by", "popularity.desc");
    url.searchParams.set("primary_release_date.gte", startDate);
    url.searchParams.set("primary_release_date.lte", endDate);
    url.searchParams.set("page", String(page));

    const data = await fetchJson(url, { headers: authHeaders(config) }, { fetchImpl });
    summaries.push(...(data.results || []));

    if (page >= (data.total_pages || 1)) {
      break;
    }
  }

  return summaries;
}

export async function fetchMovieDetails(config, movieId, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const url = new URL(`${config.tmdbApiBaseUrl}/movie/${movieId}`);
  url.searchParams.set("append_to_response", "credits,release_dates");
  return fetchJson(url, { headers: authHeaders(config) }, { fetchImpl });
}

export async function fetchUpcomingMovies(config, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const summaries = await fetchUpcomingMovieSummaries(config, options);
  const movies = await mapWithConcurrency(summaries, DETAIL_FETCH_CONCURRENCY, (summary) =>
    fetchMovieDetails(config, summary.id, { fetchImpl })
  );
  // origin_country isn't present on /discover/movie's lightweight results,
  // only on the full movie object, so relevance is checked here.
  return movies.filter(isRelevantSummary);
}

export function extractDirectors(movie) {
  const crew = movie?.credits?.crew || [];
  const directors = crew.filter((member) => member.job === "Director").map((member) => member.name);
  return directors.join(", ");
}

export function extractUsTheatricalRelease(movie) {
  const usEntry = (movie?.release_dates?.results || []).find((entry) => entry.iso_3166_1 === "US");
  const releaseDates = usEntry?.release_dates || [];

  const wide = releaseDates.find((entry) => entry.type === 3);
  const limited = releaseDates.find((entry) => entry.type === 2);
  const chosen = wide || limited;

  if (chosen) {
    return { certification: chosen.certification || "", dateOnly: toDateOnly(chosen.release_date) };
  }

  if (movie?.release_date) {
    return { certification: "", dateOnly: toDateOnly(movie.release_date) };
  }

  return null;
}

export function toCanonicalReleaseEvent(movie, config, now = new Date()) {
  const release = extractUsTheatricalRelease(movie);
  if (!release) {
    return null;
  }

  const runtimeText = Number.isFinite(movie.runtime) && movie.runtime > 0 ? `${movie.runtime} min` : "Unknown";
  const directors = extractDirectors(movie) || "Unknown";
  const genres = (movie.genres || []).map((genre) => genre.name).join(", ");

  const descriptionLines = [
    `Movie: ${movie.title}`,
    `Runtime: ${runtimeText}`,
    `Director: ${directors}`
  ];
  if (genres) {
    descriptionLines.push(`Genre: ${genres}`);
  }
  if (release.certification) {
    descriptionLines.push(`Rating: ${release.certification}`);
  }
  if (movie.overview) {
    descriptionLines.push("", movie.overview);
  }

  const [year, month, day] = release.dateOnly.split("-").map(Number);
  const startsAt = new Date(Date.UTC(year, month - 1, day)).toISOString();
  const endsAt = new Date(Date.UTC(year, month - 1, day + 1)).toISOString();

  return {
    allDay: true,
    descriptionLines,
    endsAt,
    firstSeenAt: now.toISOString(),
    kind: "release",
    lastSeenAt: now.toISOString(),
    missingSince: null,
    sourceId: String(movie.id),
    sourcePlatform: "tmdb",
    sourceUrl: movie.homepage || `https://www.themoviedb.org/movie/${movie.id}`,
    startsAt,
    status: "CONFIRMED",
    summary: `${movie.title} — In Theatres`,
    timezone: config.timezone,
    uid: `tmdb:${movie.id}`,
    updatedAt: now.toISOString()
  };
}
