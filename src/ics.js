function escapeText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line) {
  const limit = 75;
  if (line.length <= limit) {
    return line;
  }

  let output = "";
  let remaining = line;
  while (remaining.length > limit) {
    output += `${remaining.slice(0, limit)}\r\n `;
    remaining = remaining.slice(limit);
  }

  return output + remaining;
}

function formatUtc(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function renderDescription(event) {
  const lines = [];
  if (event.sourceUrl) {
    lines.push(`Event Link: ${event.sourceUrl}`);
  }
  if (event.description) {
    lines.push("", event.description);
  }
  return lines.join("\n").trim();
}

export function renderIcs(state, config) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ics_sync//Jonathan Boston Upcoming Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(config.calendarName)}`
  ];

  const events = [...(state.events || [])].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeText(event.uid)}`);
    lines.push(`DTSTAMP:${formatUtc(event.updatedAt || state.generatedAt)}`);
    lines.push(`DTSTART:${formatUtc(event.startsAt)}`);
    lines.push(`DTEND:${formatUtc(event.endsAt || event.startsAt)}`);
    lines.push(`SUMMARY:${escapeText(event.summary)}`);

    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }

    if (event.status === "CANCELLED") {
      lines.push("STATUS:CANCELLED");
    }

    const description = renderDescription(event);
    if (description) {
      lines.push(`DESCRIPTION:${escapeText(description)}`);
    }

    if (event.sourceUrl) {
      lines.push(`URL:${escapeText(event.sourceUrl)}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
