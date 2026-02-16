export interface StorageSchema {
  focusing: boolean;
  since_last_change: number;
  focus_time_left: number;
  last_update_timestamp: number;
  redirect_url: string;
  whitelist: string[];
  last_interaction: number;
  last_interaction_timestamp: number;
  connected: boolean;
}

type StorageKey = keyof StorageSchema;

type StorageResult<K extends StorageKey> = { [P in K]: StorageSchema[P] };

const DEFAULTS: StorageSchema = {
  focusing: false,
  since_last_change: 0,
  focus_time_left: 0,
  last_update_timestamp: 0,
  redirect_url: '',
  whitelist: [],
  last_interaction: 0,
  last_interaction_timestamp: 0,
  connected: false,
};

export async function getStorage<K extends StorageKey>(...keys: K[]): Promise<StorageResult<K>> {
  const raw = await browser.storage.local.get(keys);
  const result = {} as StorageResult<K>;
  for (const key of keys) {
    result[key] = (raw[key] ?? DEFAULTS[key]) as StorageSchema[K];
  }
  return result;
}

export async function setStorage(values: Partial<StorageSchema>): Promise<void> {
  await browser.storage.local.set(values);
}

export type StorageChanges = {
  [K in StorageKey]?: { newValue: StorageSchema[K]; oldValue?: StorageSchema[K] };
};

export function onStorageChanged(callback: (changes: StorageChanges) => void): () => void {
  browser.storage.local.onChanged.addListener(callback);
  return () => browser.storage.local.onChanged.removeListener(callback);
}
