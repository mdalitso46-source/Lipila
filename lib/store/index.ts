import path from "path";
import { openFileStore } from "./file";
import { MemoryStore } from "./memory";
import { emptyDatabase, type Store } from "./types";

let singleton: Promise<Store> | null = null;

export function getStore(): Promise<Store> {
  if (!singleton) singleton = openStore();
  return singleton;
}

export function resetStoreForTests(): void {
  singleton = null;
}

async function openStore(): Promise<Store> {
  const external = process.env.DATABASE_URL?.trim();
  const netlify = process.env.NETLIFY_DB_URL?.trim();
  if (external) {
    const { PostgresStore } = await import("./postgres");
    return PostgresStore.connect(external, { autoMigrate: true });
  }
  if (netlify) {
    const { PostgresStore } = await import("./postgres");
    return PostgresStore.connect(netlify, { autoMigrate: false });
  }
  if (process.env.NETLIFY === "true") {
    throw new Error(
      "Lipila needs a database on Netlify. Install is set up for Netlify Database (NETLIFY_DB_URL), or set DATABASE_URL to hosted Postgres. Local JSON storage is only for demo on a writable disk.",
    );
  }
  if (process.env.LIPILA_STORE === "memory") return new MemoryStore(emptyDatabase());
  const filePath = process.env.LIPILA_DATA_PATH || path.join(process.cwd(), ".data", "lipila.json");
  return openFileStore(filePath);
}

export type { Store } from "./types";
export { MemoryStore } from "./memory";
export { emptyDatabase } from "./types";
