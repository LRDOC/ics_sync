import fs from "node:fs/promises";
import path from "node:path";
import { renderIcs } from "./ics.js";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York"
  }).format(new Date(value));
}

function eventCard(event) {
  const location = event.location ? `<p class="meta">${escapeHtml(event.location)}</p>` : "";
  const status = event.status === "CANCELLED" ? `<span class="pill pill-cancelled">cancelled</span>` : "";
  return `
    <article class="event-card">
      <div class="event-card-top">
        <p class="eyebrow">${escapeHtml(formatDate(event.startsAt))}</p>
        ${status}
      </div>
      <h3>${escapeHtml(event.summary)}</h3>
      ${location}
      <a href="${escapeHtml(event.sourceUrl || "#")}" target="_blank" rel="noreferrer">Open source event link</a>
    </article>
  `;
}

export function renderLandingPage(state, config, options = {}) {
  const siteBaseUrl = options.siteBaseUrl || "";
  const subscribeUrl = siteBaseUrl ? `${siteBaseUrl}/${config.feedName}.ics` : `${config.feedName}.ics`;
  const nextEvents = state.events.slice(0, 12).map(eventCard).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(config.calendarName)}</title>
  <style>
    :root {
      --paper: #f6f0e6;
      --ink: #13110f;
      --muted: #5d564e;
      --accent: #b84f24;
      --accent-soft: #e8c8ae;
      --line: rgba(19,17,15,0.14);
      --card: rgba(255,255,255,0.68);
      --shadow: 0 24px 70px rgba(41, 28, 18, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(184,79,36,0.14), transparent 32rem),
        linear-gradient(180deg, #f8f3ea 0%, var(--paper) 100%);
    }
    a { color: var(--ink); }
    .page {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 20px 64px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 28px;
      align-items: start;
      margin-top: 18px;
    }
    .hero-copy h1 {
      margin: 0 0 16px;
      font-size: clamp(2.8rem, 7vw, 5.5rem);
      line-height: 0.95;
      letter-spacing: -0.05em;
    }
    .hero-copy p {
      max-width: 40rem;
      font-size: 1.08rem;
      line-height: 1.6;
      color: var(--muted);
    }
    .hero-panel, .section-panel {
      background: var(--card);
      backdrop-filter: blur(8px);
      border: 1px solid var(--line);
      border-radius: 28px;
      box-shadow: var(--shadow);
    }
    .hero-panel {
      padding: 24px;
      transform: rotate(1.2deg);
    }
    .section-panel {
      padding: 28px;
      margin-top: 28px;
    }
    .eyebrow {
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.76rem;
      color: var(--muted);
    }
    .subscribe-link {
      display: block;
      margin: 16px 0 0;
      padding: 14px 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.88rem;
      border-radius: 16px;
      text-decoration: none;
      background: #fff;
      border: 1px solid var(--line);
      overflow-wrap: anywhere;
    }
    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 18px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 13px 18px;
      border-radius: 999px;
      text-decoration: none;
      border: 1px solid var(--ink);
    }
    .button.primary {
      background: var(--ink);
      color: #fff;
      border-color: var(--ink);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 18px;
    }
    .stat {
      padding: 16px;
      border-radius: 18px;
      background: rgba(255,255,255,0.72);
      border: 1px solid var(--line);
    }
    .stat strong {
      display: block;
      font-size: 1.6rem;
      line-height: 1;
      margin-bottom: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 18px;
    }
    .event-card {
      padding: 18px;
      border-radius: 22px;
      background: rgba(255,255,255,0.78);
      border: 1px solid var(--line);
      min-height: 100%;
    }
    .event-card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 10px;
    }
    .event-card h3 {
      margin: 0 0 10px;
      font-size: 1.16rem;
      line-height: 1.25;
    }
    .meta {
      margin: 0 0 12px;
      color: var(--muted);
      line-height: 1.5;
    }
    .pill {
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      border: 1px solid var(--line);
      background: #fff;
    }
    .pill-cancelled {
      color: #7d220b;
      background: #f8ddd5;
      border-color: #e5b4a4;
    }
    .small {
      color: var(--muted);
      font-size: 0.94rem;
      line-height: 1.6;
    }
    .footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 14px;
    }
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; }
      .grid { grid-template-columns: 1fr; }
      .stats { grid-template-columns: 1fr; }
      .hero-panel { transform: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Auto-regenerated calendar feed</p>
        <h1>Jonathan’s Boston upcoming events, now as a clean calendar subscription.</h1>
        <p>
          This feed is generated from Jonathan Chang’s public Markit event stream, filtered to timed Boston-area events,
          deduplicated, and re-published as an ICS file for Google Calendar, Apple Calendar, and any other standards-based calendar client.
        </p>
        <div class="button-row">
          <a class="button primary" href="${escapeHtml(subscribeUrl)}">Open ICS feed</a>
          <a class="button" href="visual-explainer.html">See visual explainer</a>
          <a class="button" href="context.md">Read maintainer context</a>
        </div>
      </div>
      <aside class="hero-panel">
        <p class="eyebrow">Subscribe URL</p>
        <a class="subscribe-link" href="${escapeHtml(subscribeUrl)}">${escapeHtml(subscribeUrl)}</a>
        <div class="stats">
          <div class="stat">
            <strong>${state.events.length}</strong>
            <span>published events</span>
          </div>
          <div class="stat">
            <strong>${escapeHtml(formatDate(state.generatedAt))}</strong>
            <span>last regeneration</span>
          </div>
          <div class="stat">
            <strong>10 min</strong>
            <span>scheduled sync cadence</span>
          </div>
        </div>
      </aside>
    </section>

    <section class="section-panel">
      <p class="eyebrow">How it works</p>
      <p class="small">
        The code resolves Jonathan’s public Markit profile, fetches public creator events, filters for Boston-area upcoming timed events,
        retains stable UIDs for update-in-place behavior, and emits a standards-compliant ICS feed.
        Google Calendar will poll this URL on its own schedule after you subscribe.
      </p>
    </section>

    <section class="section-panel">
      <p class="eyebrow">Next events</p>
      <div class="grid">
        ${nextEvents}
      </div>
    </section>

    <section class="section-panel">
      <p class="eyebrow">Project assets</p>
      <div class="footer-links">
        <a href="architecture.svg">Architecture diagram</a>
        <a href="visual-explainer.html">Visual explainer</a>
        <a href="context.md">Context document</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export function renderVisualExplainer(state, config, options = {}) {
  const siteBaseUrl = options.siteBaseUrl || "";
  const subscribeUrl = siteBaseUrl ? `${siteBaseUrl}/${config.feedName}.ics` : `${config.feedName}.ics`;
  const ideas = [
    "Add more Markit public profiles as separate calendars or a combined city calendar.",
    "Add Luma, Partiful, Eventbrite, and Posh adapters directly instead of depending on Markit as the aggregator.",
    "Split output into themed feeds like AI, climate, robotics, fintech, or student founder events.",
    "Generate Slack or email digests from the same normalized event pipeline.",
    "Add a JSON feed and lightweight API alongside the ICS output.",
    "Track source reliability and prefer richer adapters when duplicate events appear across platforms."
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Visual Explainer</title>
  <style>
    :root {
      --bg: #0f1114;
      --panel: #171c21;
      --panel-2: #1f262d;
      --text: #f5efe6;
      --muted: #b5aba0;
      --accent: #f18a4b;
      --accent-2: #69d2c0;
      --line: rgba(255,255,255,0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
      background:
        radial-gradient(circle at top right, rgba(241,138,75,0.16), transparent 28rem),
        radial-gradient(circle at bottom left, rgba(105,210,192,0.12), transparent 24rem),
        var(--bg);
    }
    .page {
      max-width: 1140px;
      margin: 0 auto;
      padding: 28px 20px 72px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: clamp(2.6rem, 6vw, 4.8rem);
      letter-spacing: -0.05em;
      line-height: 0.95;
    }
    .lede {
      max-width: 50rem;
      color: var(--muted);
      line-height: 1.7;
      font-size: 1.05rem;
    }
    .stack {
      display: grid;
      gap: 18px;
      margin-top: 28px;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 26px;
      padding: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
    }
    .pipeline {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .step {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 18px;
      position: relative;
      min-height: 170px;
    }
    .step:after {
      content: "→";
      position: absolute;
      right: -11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--accent);
      font-size: 1.5rem;
    }
    .step:last-child:after { display: none; }
    .step strong {
      display: block;
      margin-bottom: 10px;
      font-size: 1rem;
      color: var(--accent);
    }
    .step p, li {
      color: var(--muted);
      line-height: 1.55;
    }
    .columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    ul { margin: 0; padding-left: 1.1rem; }
    .cta {
      display: inline-block;
      margin-top: 14px;
      padding: 12px 16px;
      border-radius: 999px;
      text-decoration: none;
      color: var(--bg);
      background: var(--accent);
      font-weight: 700;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: var(--accent-2);
    }
    @media (max-width: 960px) {
      .pipeline, .columns { grid-template-columns: 1fr; }
      .step:after { display: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section>
      <h1>From public event stream to subscription-grade calendar.</h1>
      <p class="lede">
        This project turns Jonathan’s public Markit event inventory into a durable calendar feed. It keeps event identities stable,
        surfaces the final outbound event link on every item, and is designed so the same normalization pipeline can ingest more platforms later.
      </p>
      <a class="cta" href="${escapeHtml(subscribeUrl)}">Open the live ICS feed</a>
    </section>

    <section class="panel stack">
      <div>
        <strong>Pipeline</strong>
      </div>
      <div class="pipeline">
        <div class="step">
          <strong>1. Resolve profile</strong>
          <p>Query public Firestore for <code>username=jonathan</code> and recover the public Markit user id.</p>
        </div>
        <div class="step">
          <strong>2. Fetch public events</strong>
          <p>Call Markit’s public <code>creatorEvents</code> endpoint and retrieve Jonathan’s visible event inventory.</p>
        </div>
        <div class="step">
          <strong>3. Filter and dedupe</strong>
          <p>Keep only timed Boston-area events, drop products/posts, and collapse duplicates into one canonical event.</p>
        </div>
        <div class="step">
          <strong>4. Persist state</strong>
          <p>Carry forward stable UIDs, cancellations, and short-lived tombstones so subscriber calendars update cleanly.</p>
        </div>
        <div class="step">
          <strong>5. Publish site + ICS</strong>
          <p>Write <code>docs/jonathan-boston.ics</code>, publish it through GitHub Pages, and rebuild the human docs alongside it.</p>
        </div>
      </div>
    </section>

    <section class="columns" style="margin-top: 18px;">
      <article class="panel">
        <strong>What is guaranteed today</strong>
        <ul>
          <li>Stable event UIDs based on the Markit event id when available.</li>
          <li>Final event link included in the description and the ICS <code>URL</code> field.</li>
          <li>Missing future events flip to <code>CANCELLED</code> before deletion.</li>
          <li>GitHub-hosted public subscribe URL with stateful update and cancellation handling.</li>
        </ul>
      </article>
      <article class="panel">
        <strong>Ideas to pull in later</strong>
        <ul>
          ${ideas.map((idea) => `<li>${escapeHtml(idea)}</li>`).join("")}
        </ul>
      </article>
    </section>

    <section class="panel" style="margin-top: 18px;">
      <strong>Current snapshot</strong>
      <p class="lede">
        The latest successful generation published <code>${state.events.length}</code> events and last refreshed at
        <code>${escapeHtml(formatDate(state.generatedAt))}</code>.
      </p>
    </section>
  </main>
</body>
</html>`;
}

export function renderArchitectureSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" fill="none">
  <rect width="1200" height="760" rx="32" fill="#F6F0E6"/>
  <rect x="48" y="48" width="1104" height="664" rx="28" fill="#FFF9F1" stroke="#D8C7B2"/>
  <text x="80" y="108" fill="#181410" font-family="Georgia, serif" font-size="42" font-weight="700">ICS Sync</text>
  <text x="80" y="142" fill="#5D564E" font-family="Arial, sans-serif" font-size="20">GitHub-hosted subscribe URL, cron-regenerated feed</text>

  <rect x="80" y="200" width="190" height="126" rx="22" fill="#161616"/>
  <text x="104" y="238" fill="#F6F0E6" font-family="Arial, sans-serif" font-size="18" font-weight="700">Public Firestore</text>
  <text x="104" y="268" fill="#D8C7B2" font-family="Arial, sans-serif" font-size="16">resolve username</text>
  <text x="104" y="292" fill="#D8C7B2" font-family="Arial, sans-serif" font-size="16">→ Jonathan UID</text>

  <rect x="320" y="200" width="220" height="126" rx="22" fill="#B84F24"/>
  <text x="344" y="238" fill="#FFF9F1" font-family="Arial, sans-serif" font-size="18" font-weight="700">Markit creatorEvents</text>
  <text x="344" y="268" fill="#F8D9C6" font-family="Arial, sans-serif" font-size="16">public timed event inventory</text>
  <text x="344" y="292" fill="#F8D9C6" font-family="Arial, sans-serif" font-size="16">Luma / Partiful / direct links</text>

  <rect x="600" y="176" width="250" height="174" rx="22" fill="#F3E4D2" stroke="#D8C7B2"/>
  <text x="624" y="214" fill="#181410" font-family="Arial, sans-serif" font-size="18" font-weight="700">Sync Core</text>
  <text x="624" y="246" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">• Boston-area filter</text>
  <text x="624" y="272" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">• exclude posts/products</text>
  <text x="624" y="298" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">• dedupe and stable UIDs</text>
  <text x="624" y="324" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">• cancelled for 3 days</text>

  <rect x="910" y="200" width="190" height="126" rx="22" fill="#102F2B"/>
  <text x="934" y="238" fill="#E8FFFB" font-family="Arial, sans-serif" font-size="18" font-weight="700">Tracked State</text>
  <text x="934" y="268" fill="#B9E7DF" font-family="Arial, sans-serif" font-size="16">state/state</text>
  <text x="934" y="292" fill="#B9E7DF" font-family="Arial, sans-serif" font-size="16">jonathan-boston.json</text>

  <rect x="158" y="470" width="280" height="130" rx="22" fill="#FFFFFF" stroke="#D8C7B2"/>
  <text x="182" y="510" fill="#181410" font-family="Arial, sans-serif" font-size="18" font-weight="700">GitHub Actions</text>
  <text x="182" y="540" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">runs every 10 minutes</text>
  <text x="182" y="564" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">regenerates docs and ICS</text>

  <rect x="488" y="470" width="280" height="130" rx="22" fill="#FFFFFF" stroke="#D8C7B2"/>
  <text x="512" y="510" fill="#181410" font-family="Arial, sans-serif" font-size="18" font-weight="700">docs/ output</text>
  <text x="512" y="540" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">jonathan-boston.ics</text>
  <text x="512" y="564" fill="#5D564E" font-family="Arial, sans-serif" font-size="16">index.html + explainer + diagram</text>

  <rect x="818" y="470" width="240" height="130" rx="22" fill="#181410"/>
  <text x="842" y="510" fill="#FFF9F1" font-family="Arial, sans-serif" font-size="18" font-weight="700">GitHub Pages</text>
  <text x="842" y="540" fill="#D8C7B2" font-family="Arial, sans-serif" font-size="16">public subscribe URL</text>
  <text x="842" y="564" fill="#D8C7B2" font-family="Arial, sans-serif" font-size="16">calendar clients poll it</text>

  <path d="M270 262H320" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
  <path d="M540 262H600" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
  <path d="M850 262H910" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
  <path d="M298 470V356" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
  <path d="M628 470V356" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
  <path d="M938 470V356" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
  <path d="M438 535H488" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
  <path d="M768 535H818" stroke="#B84F24" stroke-width="5" stroke-linecap="round"/>
</svg>`;
}

export async function buildSiteArtifacts(state, config, options = {}) {
  const docsDir = path.resolve(options.docsDir || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "docs"));
  const siteBaseUrl = options.siteBaseUrl || "";

  await fs.mkdir(docsDir, { recursive: true });
  await fs.writeFile(path.join(docsDir, `${config.feedName}.ics`), renderIcs(state, config));
  await fs.writeFile(path.join(docsDir, "index.html"), renderLandingPage(state, config, { siteBaseUrl }));
  await fs.writeFile(path.join(docsDir, "visual-explainer.html"), renderVisualExplainer(state, config, { siteBaseUrl }));
  await fs.writeFile(path.join(docsDir, "architecture.svg"), renderArchitectureSvg());
  await fs.writeFile(path.join(docsDir, ".nojekyll"), "");
}
