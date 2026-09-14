import {
  fetchEarliestShowtimesForCandidates,
  fetchMovieCandidates,
  fetchTheatreById,
  toCanonicalOnSaleEvent
} from "./sources/amc.js";
import { fetchUpcomingMovies, toCanonicalReleaseEvent } from "./sources/tmdb.js";
import { mergeState } from "./sync.js";

function createEmptyMovieState(config) {
  return {
    events: [],
    feedName: config.feedName,
    generatedAt: "",
    version: 1
  };
}

export async function fetchReleaseEvents(config, now, logger, fetchImpl) {
  if (!config.tmdbReadAccessToken) {
    return [];
  }

  try {
    const movies = await fetchUpcomingMovies(config, { fetchImpl, now });
    return movies.map((movie) => toCanonicalReleaseEvent(movie, config, now)).filter(Boolean);
  } catch (error) {
    logger.error?.("TMDB release sync failed", error);
    return [];
  }
}

export async function fetchOnSaleResult(config, previousState, now, logger, fetchImpl) {
  const baselineList = previousState.amcOnSaleBaseline;
  const isColdStart = !Array.isArray(baselineList);
  const baselineSet = new Set(baselineList || []);

  if (!config.amcVendorKey || config.amcTheatreIds.length === 0) {
    return { baseline: [...baselineSet], events: [] };
  }

  try {
    const candidates = await fetchMovieCandidates(config, { fetchImpl });
    const nextBaseline = new Set(baselineSet);
    const events = [];

    for (const theatreId of config.amcTheatreIds) {
      const theatre = await fetchTheatreById(config, theatreId, { fetchImpl });
      if (!theatre) {
        logger.error?.(`AMC theatre ${theatreId} not found`);
        continue;
      }

      const uncheckedCandidates = candidates.filter((movie) => !baselineSet.has(`${theatreId}:${movie.id}`));
      const onSaleAtTheatre = await fetchEarliestShowtimesForCandidates(config, theatreId, uncheckedCandidates, {
        fetchImpl
      });

      for (const { movie, showtime } of onSaleAtTheatre) {
        const key = `${theatreId}:${movie.id}`;
        if (!isColdStart) {
          events.push(toCanonicalOnSaleEvent(movie, theatre, showtime, config, now));
        }
        nextBaseline.add(key);
      }
    }

    return { baseline: [...nextBaseline], events };
  } catch (error) {
    logger.error?.("AMC on-sale sync failed", error);
    return { baseline: [...baselineSet], events: [] };
  }
}

export async function runMovieSync(config, store, options = {}) {
  const now = options.now || new Date();
  const logger = options.logger || console;
  const fetchImpl = options.fetchImpl || fetch;

  const previousState = (await store.loadJson(config.stateKey)) || createEmptyMovieState(config);

  const releaseEvents = await fetchReleaseEvents(config, now, logger, fetchImpl);
  const { baseline, events: onSaleEvents } = await fetchOnSaleResult(config, previousState, now, logger, fetchImpl);

  const observedEvents = [...releaseEvents, ...onSaleEvents];
  const nextState = mergeState(previousState, observedEvents, config, now);
  nextState.amcOnSaleBaseline = baseline;

  await store.saveJson(config.stateKey, nextState);

  const summary = {
    feedName: config.feedName,
    generatedAt: nextState.generatedAt,
    onSaleAlertsCount: onSaleEvents.length,
    publishedCount: nextState.events.length,
    releaseCount: releaseEvents.length
  };

  logger.info?.("Movie sync complete", summary);
  return summary;
}

export async function loadMovieStateOrSync(config, store, options = {}) {
  let state = await store.loadJson(config.stateKey);
  if (state) {
    return state;
  }

  await runMovieSync(config, store, options);
  state = await store.loadJson(config.stateKey);
  if (!state) {
    throw new Error("Movie state was not available after sync.");
  }

  return state;
}
