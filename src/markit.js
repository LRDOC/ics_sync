function ensureOk(response, context) {
  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status}`);
  }
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number.parseInt(value.integerValue, 10);
  if ("doubleValue" in value) return Number.parseFloat(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    const items = value.arrayValue.values || [];
    return items.map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    return decodeFirestoreFields(value.mapValue.fields || {});
  }

  return null;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
}

async function runFirestoreQuery({ apiKey, projectId, fieldPath, fieldValue }) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents:runQuery?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "EQUAL",
            value: { stringValue: fieldValue }
          }
        },
        limit: 1
      }
    })
  });

  ensureOk(response, `Firestore query for ${fieldPath}=${fieldValue}`);
  const data = await response.json();

  for (const row of data) {
    if (!row.document?.fields) {
      continue;
    }

    return {
      id: row.document.name.split("/").pop(),
      ...decodeFirestoreFields(row.document.fields)
    };
  }

  return null;
}

export async function resolvePublicProfile(config) {
  const attempts = [
    { fieldPath: "username", fieldValue: config.publicProfileSlug },
    { fieldPath: "profileLink", fieldValue: config.publicProfileSlug }
  ];

  for (const attempt of attempts) {
    const user = await runFirestoreQuery({
      apiKey: config.firestoreApiKey,
      projectId: config.firestoreProjectId,
      ...attempt
    });

    if (user) {
      return user;
    }
  }

  throw new Error(`Could not resolve Markit profile for slug "${config.publicProfileSlug}".`);
}

export async function fetchCreatorEvents(config, uid) {
  const url = `${config.markitApiBaseUrl}/user/creatorEvents?uid=${encodeURIComponent(uid)}`;
  const response = await fetch(url);
  ensureOk(response, "Markit creatorEvents fetch");
  const data = await response.json();

  if (!Array.isArray(data.events)) {
    throw new Error("Markit creatorEvents response was missing events[].");
  }

  return data.events;
}

function collectBodyTextNode(node, output) {
  if (!node || typeof node !== "object") {
    return;
  }

  if (typeof node.text === "string" && node.text.trim()) {
    output.push(node.text.trim());
  }

  const content = node.content;
  if (Array.isArray(content)) {
    for (const child of content) {
      collectBodyTextNode(child, output);
    }
  }
}

export function bodyToText(body) {
  const output = [];
  collectBodyTextNode(body, output);
  return output.join("\n").trim();
}

export function pickEventLink(event, profileUrl) {
  const preferred = [event.externalLink, event.link].find((value) => typeof value === "string" && value.trim());
  if (preferred) {
    return preferred.trim();
  }

  if (event.id) {
    return `${profileUrl.replace(/\/$/, "")}/e/${event.id}`;
  }

  return profileUrl;
}
