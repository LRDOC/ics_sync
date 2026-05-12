const EXCLUDED_EVENT_TYPES = new Set([
  "Custom Product",
  "PDF",
  "Post"
]);

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

export function isBostonAreaText(value, locationKeywords) {
  const haystack = normalizeText(value);
  return locationKeywords.some((keyword) => haystack.includes(keyword));
}

export function isBostonUpcomingCandidate(event, config, now = new Date()) {
  if (!event || event.isDraft) {
    return false;
  }

  if (EXCLUDED_EVENT_TYPES.has(event.eventType)) {
    return false;
  }

  const startMs = Date.parse(event.start || "");
  if (Number.isNaN(startMs)) {
    return false;
  }

  const retentionMs = config.pastEventRetentionHours * 60 * 60 * 1000;
  if (startMs < now.getTime() - retentionMs) {
    return false;
  }

  const locationText = [
    event.formattedAddress,
    event.locationDetails,
    event.title,
    event.description
  ]
    .filter(Boolean)
    .join("\n");

  return isBostonAreaText(locationText, config.locationKeywords);
}

export function eventEndedAt(event) {
  const endMs = Date.parse(event.end || "");
  if (!Number.isNaN(endMs)) {
    return endMs;
  }

  const startMs = Date.parse(event.start || "");
  return startMs;
}
