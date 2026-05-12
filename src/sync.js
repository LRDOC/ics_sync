import { toCanonicalEvent, dedupeEvents } from "./canonical.js";
import { eventEndedAt, isBostonUpcomingCandidate } from "./filters.js";
import { fetchCreatorEvents, resolvePublicProfile } from "./markit.js";

function createEmptyState(config) {
  return {
    events: [],
    feedName: config.feedName,
    generatedAt: "",
    profile: null,
    version: 1
  };
}

function retainMissingConfirmedEvent(event, nowMs, retentionMs) {
  const endMs = Date.parse(event.endsAt || event.startsAt || "");
  return !Number.isNaN(endMs) && endMs < nowMs && endMs >= nowMs - retentionMs;
}

export function mergeState(previousState, observedEvents, config, now = new Date()) {
  const retentionMs = config.pastEventRetentionHours * 60 * 60 * 1000;
  const cancelRetentionMs = config.cancelRetentionDays * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  const previousByUid = new Map((previousState.events || []).map((event) => [event.uid, event]));
  const nextEvents = [];

  for (const observedEvent of observedEvents) {
    const previous = previousByUid.get(observedEvent.uid);
    nextEvents.push({
      ...previous,
      ...observedEvent,
      firstSeenAt: previous?.firstSeenAt || observedEvent.firstSeenAt,
      lastSeenAt: now.toISOString(),
      missingSince: null,
      status: "CONFIRMED",
      updatedAt: now.toISOString()
    });
    previousByUid.delete(observedEvent.uid);
  }

  for (const leftover of previousByUid.values()) {
    const endedRecently = retainMissingConfirmedEvent(leftover, nowMs, retentionMs);
    if (leftover.status === "CANCELLED") {
      const missingSinceMs = Date.parse(leftover.missingSince || leftover.updatedAt || "");
      if (!Number.isNaN(missingSinceMs) && missingSinceMs + cancelRetentionMs > nowMs) {
        nextEvents.push(leftover);
      }
      continue;
    }

    if (endedRecently) {
      nextEvents.push(leftover);
      continue;
    }

    const startMs = Date.parse(leftover.startsAt || "");
    if (!Number.isNaN(startMs) && startMs >= nowMs - retentionMs) {
      nextEvents.push({
        ...leftover,
        missingSince: leftover.missingSince || now.toISOString(),
        status: "CANCELLED",
        updatedAt: now.toISOString()
      });
    }
  }

  return {
    ...previousState,
    events: nextEvents.sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    generatedAt: now.toISOString(),
    version: 1
  };
}

export async function runSync(config, store, options = {}) {
  const now = options.now || new Date();
  const logger = options.logger || console;

  const profile = await resolvePublicProfile(config);
  const rawEvents = await fetchCreatorEvents(config, profile.uid);
  const filteredEvents = rawEvents.filter((event) => isBostonUpcomingCandidate(event, config, now));
  const dedupedEvents = dedupeEvents(filteredEvents);
  const canonicalEvents = dedupedEvents.map((event) => toCanonicalEvent(event, config, now));

  const previousState = (await store.loadJson(config.stateKey)) || createEmptyState(config);
  const nextState = mergeState(previousState, canonicalEvents, config, now);
  nextState.profile = {
    fullName: profile.fullName || "",
    profileUrl: config.profileUrl,
    slug: config.publicProfileSlug,
    uid: profile.uid
  };

  await store.saveJson(config.stateKey, nextState);

  const cancelledCount = nextState.events.filter((event) => event.status === "CANCELLED").length;
  const summary = {
    cancelledCount,
    feedName: config.feedName,
    generatedAt: nextState.generatedAt,
    observedCount: rawEvents.length,
    profileUid: profile.uid,
    publishedCount: nextState.events.length,
    upcomingCount: canonicalEvents.length
  };

  logger.info?.("Sync complete", summary);
  return summary;
}

export async function loadStateOrSync(config, store, options = {}) {
  let state = await store.loadJson(config.stateKey);
  if (state) {
    return state;
  }

  await runSync(config, store, options);
  state = await store.loadJson(config.stateKey);
  if (!state) {
    throw new Error("State was not available after sync.");
  }

  return state;
}
