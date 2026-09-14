const vendorKey = process.env.AMC_VENDOR_KEY || "";

const attempts = [
  {
    label: "X-AMC-Vendor-Key header, theatres search",
    url: "https://api.amctheatres.com/v2/theatres?name=Boston%20Common&page-size=5",
    headers: { "X-AMC-Vendor-Key": vendorKey }
  },
  {
    label: "X-AMC-Vendor-Key + Accept + User-Agent, theatres search",
    url: "https://api.amctheatres.com/v2/theatres?name=Boston%20Common&page-size=5",
    headers: {
      "X-AMC-Vendor-Key": vendorKey,
      Accept: "application/json",
      "User-Agent": "ics_sync/1.0 (+https://github.com/LRDOC/ics_sync)"
    }
  },
  {
    label: "Authorization bearer, theatres search",
    url: "https://api.amctheatres.com/v2/theatres?name=Boston%20Common&page-size=5",
    headers: { Authorization: `Bearer ${vendorKey}` }
  },
  {
    label: "X-AMC-Vendor-Key, movies coming-soon",
    url: "https://api.amctheatres.com/v2/movies/views/coming-soon?page-size=5",
    headers: { "X-AMC-Vendor-Key": vendorKey }
  },
  {
    label: "X-AMC-Vendor-Key, list all movies (no view)",
    url: "https://api.amctheatres.com/v2/movies?page-size=5",
    headers: { "X-AMC-Vendor-Key": vendorKey }
  },
  {
    label: "No auth header at all (expect 401 for comparison)",
    url: "https://api.amctheatres.com/v2/movies?page-size=5",
    headers: {}
  }
];

for (const attempt of attempts) {
  try {
    const response = await fetch(attempt.url, { headers: attempt.headers });
    const text = await response.text();
    console.log(`\n=== ${attempt.label} ===`);
    console.log("status:", response.status);
    console.log("body (first 500 chars):", text.slice(0, 500));
  } catch (error) {
    console.log(`\n=== ${attempt.label} ===`);
    console.log("error:", error.message);
  }
}

console.log("\nvendor key length:", vendorKey.length);
