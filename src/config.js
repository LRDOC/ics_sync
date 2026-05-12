import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_BOSTON_LOCATION_KEYWORDS = [
  "boston",
  "cambridge",
  "somerville",
  "charlestown",
  "brookline",
  "allston",
  "brighton",
  "fenway",
  "back bay",
  "seaport",
  "kenmore",
  "south boston"
];

function readInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readConfig(env = process.env) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const feedName = env.FEED_NAME || "jonathan-boston";
  const publicProfileSlug = env.PUBLIC_PROFILE_SLUG || "jonathan";
  const feedToken = env.FEED_TOKEN || "";
  const stateDir = path.resolve(env.SYNC_STATE_DIR || path.join(projectRoot, ".data"));

  return {
    calendarName: env.CALENDAR_NAME || "Jonathan Boston Upcoming Events",
    cancelRetentionDays: readInt(env.CANCELLED_RETENTION_DAYS, 3),
    cronSecret: env.CRON_SECRET || "",
    feedName,
    feedToken,
    firestoreApiKey: env.FIRESTORE_API_KEY || "AIzaSyBflgt4mVewOljVwVZYkOkLcWyUXC9zggA",
    firestoreProjectId: env.FIRESTORE_PROJECT_ID || "markit-d5e9b",
    locationKeywords: DEFAULT_BOSTON_LOCATION_KEYWORDS,
    markitApiBaseUrl: env.MARKIT_API_BASE_URL || "https://us-central1-markit-d5e9b.cloudfunctions.net/api",
    pastEventRetentionHours: readInt(env.PAST_EVENT_RETENTION_HOURS, 24),
    profileUrl: env.MARKIT_PROFILE_URL || `https://markitai.com/u/${publicProfileSlug}`,
    publicProfileSlug,
    stateDir,
    stateKey: `state/${feedName}.json`,
    storageMode: env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "filesystem",
    timezone: "America/New_York",
    vercelBlobToken: env.BLOB_READ_WRITE_TOKEN || ""
  };
}

export function assertFeedToken(config) {
  if (!config.feedToken) {
    throw new Error("FEED_TOKEN is required.");
  }
}

export function assertCronSecret(config) {
  if (!config.cronSecret) {
    throw new Error("CRON_SECRET is required.");
  }
}
