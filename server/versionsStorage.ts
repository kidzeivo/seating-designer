import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const VERSIONS_DIR = path.join(process.cwd(), "data", "versions");

function getVersionsDir(): string {
  return VERSIONS_DIR;
}

function isValidId(id: string): boolean {
  return /^[a-f0-9-]{36}$/i.test(id);
}

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(getVersionsDir(), { recursive: true });
  } catch (err) {
    console.error("Failed to create versions directory:", err);
    throw err;
  }
}

export type VersionPayload = {
  name: string;
  guests: unknown[];
  tables: unknown[];
};

export type VersionMeta = {
  id: string;
  name: string;
  savedAt: string;
};

export type VersionFull = VersionMeta & {
  guests: unknown[];
  tables: unknown[];
};

export async function listVersions(): Promise<VersionMeta[]> {
  await ensureDir();
  const dir = getVersionsDir();
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const meta: VersionMeta[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    const id = e.name.slice(0, -5);
    if (!isValidId(id)) continue;
    try {
      const raw = await fs.readFile(path.join(dir, e.name), "utf-8");
      const data = JSON.parse(raw) as VersionFull;
      meta.push({ id: data.id, name: data.name, savedAt: data.savedAt });
    } catch {
      // skip corrupted files
    }
  }
  meta.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return meta;
}

export async function getVersion(id: string): Promise<VersionFull | null> {
  if (!isValidId(id)) return null;
  const filePath = path.join(getVersionsDir(), `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as VersionFull;
  } catch {
    return null;
  }
}

export async function saveVersion(payload: VersionPayload): Promise<VersionMeta> {
  await ensureDir();
  const id = randomUUID();
  const savedAt = new Date().toISOString();
  const full: VersionFull = {
    id,
    name: payload.name,
    savedAt,
    guests: payload.guests,
    tables: payload.tables,
  };
  const filePath = path.join(getVersionsDir(), `${id}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(full), "utf-8");
    console.log(`Saved version ${id} to ${filePath}`);
  } catch (err) {
    console.error(`Failed to save version ${id} to ${filePath}:`, err);
    throw err;
  }
  return { id, name: payload.name, savedAt };
}

export async function deleteVersion(id: string): Promise<boolean> {
  if (!isValidId(id)) return false;
  const filePath = path.join(getVersionsDir(), `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
