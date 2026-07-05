// In-browser editing of the whitelist source file via the File System Access
// API (Chrome only — Firefox never implemented it). The user picks the file
// once; the handle persists in IndexedDB, shared by every extension page.
// The file stays the source of truth: after a write we ask the background to
// re-sync, the same path an editor save takes.

const DB_NAME = "coach";
const STORE = "handles";
const KEY = "whitelist";

export function supportsFileEditing(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getConnectedHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDb();
  const handle = await idbRequest(
    db.transaction(STORE).objectStore(STORE).get(KEY) as IDBRequest<FileSystemFileHandle | undefined>
  );
  db.close();
  return handle ?? null;
}

// Must be called from a user gesture (a click) — the picker requires it.
export async function connectFile(): Promise<FileSystemFileHandle> {
  const [handle] = await window.showOpenFilePicker!({
    types: [{ description: "Coach whitelist", accept: { "text/plain": [".txt"] } }]
  });
  const db = await openDb();
  await idbRequest(db.transaction(STORE, "readwrite").objectStore(STORE).put(handle, KEY));
  db.close();
  return handle;
}

async function withPermission(handle: FileSystemFileHandle): Promise<boolean> {
  if ((await handle.queryPermission!({ mode: "readwrite" })) === "granted") return true;
  return (await handle.requestPermission!({ mode: "readwrite" })) === "granted";
}

async function readLines(handle: FileSystemFileHandle): Promise<string[]> {
  const file = await handle.getFile();
  return (await file.text()).split("\n");
}

async function writeLines(handle: FileSystemFileHandle, lines: string[]): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(lines.join("\n"));
  await writable.close();
  // The file changed; don't wait for the next alarm tick to show it.
  void browser.runtime.sendMessage({ type: "sync_whitelist" });
}

// Append a hostname unless a non-comment line already holds it. Comments and
// ordering are preserved — edits are line-level, never a regeneration.
export async function addSite(host: string): Promise<boolean> {
  const handle = await getConnectedHandle();
  if (!handle || !(await withPermission(handle))) return false;
  const lines = await readLines(handle);
  const present = lines.some((l) => l.trim() === host);
  if (!present) {
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
    lines.push(host, "");
    await writeLines(handle, lines);
  }
  return true;
}

export async function removeSite(host: string): Promise<boolean> {
  const handle = await getConnectedHandle();
  if (!handle || !(await withPermission(handle))) return false;
  await writeLines(handle, (await readLines(handle)).filter((l) => l.trim() !== host));
  return true;
}
