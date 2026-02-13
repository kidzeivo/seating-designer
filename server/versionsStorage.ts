import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Use a writable directory - try project root first, fallback to /tmp for Replit
function getVersionsDirPath(): string {
  const projectDir = process.cwd();
  const dataDir = path.join(projectDir, "data", "versions");
  
  // In Replit, we can write to the project directory
  // But if that fails, we'll catch and try /tmp as fallback
  return dataDir;
}

const VERSIONS_DIR = getVersionsDirPath();

function getVersionsDir(): string {
  return VERSIONS_DIR;
}

function isValidId(id: string): boolean {
  return /^[a-f0-9-]{36}$/i.test(id);
}

async function ensureDir(): Promise<void> {
  const dir = getVersionsDir();
  try {
    await fs.mkdir(dir, { recursive: true });
    // Test write permissions
    const testFile = path.join(dir, ".test-write");
    await fs.writeFile(testFile, "test", "utf-8");
    await fs.unlink(testFile);
    console.log(`Versions directory ready: ${dir}`);
  } catch (err: any) {
    console.error(`Failed to create/access versions directory ${dir}:`, err);
    console.error(`Error code: ${err?.code}, Error message: ${err?.message}`);
    throw new Error(`Cannot write to ${dir}: ${err?.message || String(err)}`);
  }
}

export type VersionPayload = {
  name: string;
  guests: unknown[];
  tables: unknown[];
  stageSize?: { w: number; h: number };
  pan?: { x: number; y: number };
};

export type VersionMeta = {
  id: string;
  name: string;
  savedAt: string;
};

export type VersionFull = VersionMeta & {
  guests: unknown[];
  tables: unknown[];
  stageSize?: { w: number; h: number };
  pan?: { x: number; y: number };
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
