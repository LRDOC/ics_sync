import crypto from "node:crypto";
import { bodyToText, pickEventLink } from "./markit.js";

function compactText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeUrl(value) {
  const raw = compactText(value);
  if (!raw) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";
    return url.toString();
  } catch {
    return raw.toLowerCase();
  }
}

function fallbackFingerprint(event) {
  const input = [
    compactText(event.title).toLowerCase(),
    event.start || "",
    compactText(event.formattedAddress || event.locationDetails).toLowerCase()
  ].join("|");

  return crypto.createHash("sha1").update(input).digest("hex");
}

export function canonicalIdentity(event) {
  if (event.id) {
    return `markit:${event.id}`;
  }

  const normalizedUrl = normalizeUrl(event.externalLink || event.link);
  if (normalizedUrl) {
    return `url:${normalizedUrl}`;
  }

  return `fingerprint:${fallbackFingerprint(event)}`;
}

function duplicateScore(event) {
  let score = 0;
  if (compactText(event.externalLink || event.link)) score += 8;
  if (compactText(event.formattedAddress || event.locationDetails)) score += 4;
  if (compactText(event.end)) score += 2;
  if (compactText(event.description) || bodyToText(event.body)) score += 1;
  return score;
}

export function dedupeEvents(events) {
  const winners = new Map();

  for (const event of events) {
    const identity = canonicalIdentity(event);
    const previous = winners.get(identity);

    if (!previous) {
      winners.set(identity, event);
      continue;
    }

    const previousScore = duplicateScore(previous);
    const nextScore = duplicateScore(event);

    if (nextScore > previousScore) {
      winners.set(identity, event);
      continue;
    }

    if (nextScore === previousScore) {
      const previousUpdated = Date.parse(previous.updatedAt || previous.createdAt || "") || 0;
      const nextUpdated = Date.parse(event.updatedAt || event.createdAt || "") || 0;
      if (nextUpdated > previousUpdated) {
        winners.set(identity, event);
      }
    }
  }

  return [...winners.values()];
}

export function toCanonicalEvent(event, config, now = new Date()) {
  const startsAt = new Date(event.start).toISOString();
  const endCandidate = Date.parse(event.end || "");
  const endsAt = Number.isNaN(endCandidate) ? startsAt : new Date(endCandidate).toISOString();
  const sourceUrl = pickEventLink(event, config.profileUrl);
  const descriptionParts = [compactText(event.description), bodyToText(event.body)].filter(Boolean);
  const categories = Array.isArray(event.categories)
    ? event.categories.map(compactText).filter(Boolean)
    : [];

  return {
    categories,
    eventType: compactText(event.eventType),
    endsAt,
    firstSeenAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    location: compactText(event.formattedAddress || event.locationDetails),
    missingSince: null,
    sourceId: event.id || "",
    sourcePlatform: "markit",
    sourceProfileUrl: config.profileUrl,
    sourceUrl,
    startsAt,
    status: "CONFIRMED",
    summary: compactText(event.title),
    timezone: event.timezone || config.timezone,
    uid: canonicalIdentity(event),
    updatedAt: now.toISOString(),
    description: descriptionParts.join("\n\n")
  };
}
