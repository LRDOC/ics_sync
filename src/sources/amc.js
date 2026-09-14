import { mapWithConcurrency } from "../concurrency.js";
import { fetchJson } from "../httpClient.js";

const CANDIDATE_FETCH_CONCURRENCY = 5;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

function authHeaders(config) {
  return { "x-amc-vendor-key": config.amcVendorKey };
}

async function fetchAllPages(config, path, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const items = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL(`${config.amcApiBaseUrl}${path}`);
    url.searchParams.set("page-number", String(page));
    url.searchParams.set("page-size", String(PAGE_SIZE));

    const data = await fetchJson(url, { headers: authHeaders(config) }, { fetchImpl });
    const pageItems = data?._embedded?.movies || data?._embedded?.theatres || [];
    items.push(...pageItems);

    if (pageItems.length < PAGE_SIZE) {
      break;
    }
  }

  return items;
}

export async function fetchMovieCandidates(config, options = {}) {
  const [comingSoon, advance] = await Promise.all([
    fetchAllPages(config, "/v2/movies/views/coming-soon", options),
    fetchAllPages(config, "/v2/movies/views/advance", options)
  ]);

  const byId = new Map();
  for (const movie of [...comingSoon, ...advance]) {
    byId.set(movie.id, movie);
  }

  return [...byId.values()];
}

export async function resolveTheatreByName(config, name, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const url = new URL(`${config.amcApiBaseUrl}/v2/theatres`);
  url.searchParams.set("name", name);
  url.searchParams.set("page-size", "10");

  const data = await fetchJson(url, { headers: authHeaders(config) }, { fetchImpl });
  return data?._embedded?.theatres || [];
}

export async function fetchTheatreById(config, theatreId, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const url = `${config.amcApiBaseUrl}/v2/theatres/${theatreId}`;
  return fetchJson(url, { headers: authHeaders(config) }, { fetchImpl, notFoundReturnsNull: true });
}

export async function fetchEarliestShowtime(config, theatreId, movieId, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const url = `${config.amcApiBaseUrl}/v2/theatres/${theatreId}/movies/${movieId}/earliest-showtime`;
  return fetchJson(url, { headers: authHeaders(config) }, { fetchImpl, notFoundReturnsNull: true });
}

export async function fetchEarliestShowtimesForCandidates(config, theatreId, candidates, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const results = await mapWithConcurrency(candidates, CANDIDATE_FETCH_CONCURRENCY, async (movie) => {
    const showtime = await fetchEarliestShowtime(config, theatreId, movie.id, { fetchImpl });
    return { movie, showtime };
  });

  return results.filter((result) => result.showtime);
}

function isThursdayLocal(dateOnly) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 4;
}

function formatShowtimeDisplay(dateOnly) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export function toCanonicalOnSaleEvent(movie, theatre, showtime, config, now = new Date()) {
  const dateOnly = String(showtime.showDateTimeLocal || showtime.showDateTimeUtc || "").slice(0, 10);
  const thursdayPreview = dateOnly && isThursdayLocal(dateOnly);
  const theatreName = theatre?.name || `Theatre ${theatre?.id ?? ""}`.trim();

  const descriptionLines = [
    `Movie: ${movie.name}`,
    `Runtime: ${Number.isFinite(movie.runTime) && movie.runTime > 0 ? `${movie.runTime} min` : "Unknown"}`,
    `Director: ${movie.directors || "Unknown"}`
  ];
  if (movie.genre) {
    descriptionLines.push(`Genre: ${movie.genre}`);
  }
  if (movie.mpaaRating) {
    descriptionLines.push(`Rating: ${movie.mpaaRating}`);
  }
  if (movie.synopsis) {
    descriptionLines.push("", movie.synopsis);
  }
  descriptionLines.push("", `Theatre: ${theatreName}`);
  if (dateOnly) {
    descriptionLines.push(`Earliest showtime: ${formatShowtimeDisplay(dateOnly)}`);
  }

  const summary = thursdayPreview
    ? `${movie.name} tickets on sale — ${theatreName} (Thu preview)`
    : `${movie.name} tickets on sale — ${theatreName}`;

  return {
    allDay: false,
    descriptionLines,
    endsAt: now.toISOString(),
    firstSeenAt: now.toISOString(),
    kind: "onsale",
    lastSeenAt: now.toISOString(),
    missingSince: null,
    pinStartToFirstSeen: true,
    sourceId: String(movie.id),
    sourcePlatform: "amc",
    sourceUrl: showtime.purchaseUrl || movie.showtimesUrl || theatre?.websiteUrl || "",
    startsAt: now.toISOString(),
    status: "CONFIRMED",
    summary,
    timezone: config.timezone,
    uid: `amc:onsale:${theatre.id}:${movie.id}`,
    updatedAt: now.toISOString()
  };
}
