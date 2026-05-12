import fs from "node:fs/promises";
import path from "node:path";

async function loadBlobSdk() {
  return import("@vercel/blob");
}

function createFilesystemStore(config) {
  return {
    async loadJson(key) {
      const filePath = path.join(config.stateDir, key);
      try {
        const contents = await fs.readFile(filePath, "utf8");
        return JSON.parse(contents);
      } catch (error) {
        if (error && error.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },
    async saveJson(key, value) {
      const filePath = path.join(config.stateDir, key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(value, null, 2));
    }
  };
}

function createBlobStore(config) {
  if (!config.vercelBlobToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for blob storage.");
  }

  return {
    async loadJson(key) {
      const { head } = await loadBlobSdk();
      try {
        const metadata = await head(key, { token: config.vercelBlobToken });
        const response = await fetch(metadata.url);
        if (!response.ok) {
          throw new Error(`Blob fetch failed with ${response.status}`);
        }
        return response.json();
      } catch (error) {
        if (String(error?.message || "").includes("Blob not found")) {
          return null;
        }
        throw error;
      }
    },
    async saveJson(key, value) {
      const { put } = await loadBlobSdk();
      await put(key, JSON.stringify(value, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        token: config.vercelBlobToken
      });
    }
  };
}

export function createStore(config) {
  return config.storageMode === "vercel-blob"
    ? createBlobStore(config)
    : createFilesystemStore(config);
}
