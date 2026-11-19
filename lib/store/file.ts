import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { MemoryStore } from "./memory";
import { emptyDatabase, type Database } from "./types";

export async function openFileStore(filePath: string): Promise<MemoryStore> {
  await mkdir(path.dirname(filePath), { recursive: true });
  let db = emptyDatabase();
  try {
    const raw = await readFile(filePath, "utf8");
    db = { ...emptyDatabase(), ...(JSON.parse(raw) as Database) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }

  let store: MemoryStore | null = null;
  let chain: Promise<void> = Promise.resolve();
  const persist = () => {
    chain = chain.then(async () => {
      if (!store) return;
      const tmp = `${filePath}.tmp`;
      await writeFile(tmp, JSON.stringify(store.snapshot(), null, 2));
      await rename(tmp, filePath);
    });
    return chain;
  };
  store = new MemoryStore(db, persist);
  return store;
}
