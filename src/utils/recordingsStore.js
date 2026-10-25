// ---------------------------------------------------------------------------
// Aether FM - Recordings Store
// Metadata in localStorage ('aether_recordings_index')
// Audio Blobs in IndexedDB ('aether_recordings' -> 'blobs')
// ---------------------------------------------------------------------------

const INDEX_KEY = "aether_recordings_index";
const DB_NAME = "aether_recordings";
const STORE_NAME = "blobs";
const DB_VERSION = 1;

const listeners = new Set();

function notify() {
  const current = listRecordings();
  listeners.forEach((cb) => {
    try {
      cb(current);
    } catch (err) {
      console.warn("Recordings subscriber error:", err);
    }
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function setBlob(id, blob) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
      tx.objectStore(STORE_NAME).put(blob, id);
    });
  });
}

function getBlob(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function deleteBlob(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
      tx.objectStore(STORE_NAME).delete(id);
    });
  });
}

/**
 * Check if free storage is under 20MB.
 */
export async function checkStorageSpace() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (typeof estimate.quota === "number" && typeof estimate.usage === "number") {
        const free = estimate.quota - estimate.usage;
        if (free < 20 * 1024 * 1024) {
          return {
            ok: false,
            freeBytes: free,
            message: "Storage full (under 20MB free space). Please free up space to record.",
          };
        }
        return { ok: true, freeBytes: free, usage: estimate.usage };
      }
    }
  } catch (err) {
    console.warn("Could not check storage estimate:", err);
  }
  return { ok: true, freeBytes: null, usage: null };
}

/**
 * List all recordings metadata from localStorage.
 */
export function listRecordings() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read recordings index:", err);
    return [];
  }
}

/**
 * Saves a recording: audio Blob in IndexedDB, metadata in localStorage.
 * Automatically asks for persistent storage on first save.
 */
export async function saveRecording(meta, blob) {
  try {
    if (navigator.storage && navigator.storage.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        // Ignore persist rejection
      }
    }

    await setBlob(meta.id, blob);

    const list = listRecordings();
    const nextList = [meta, ...list.filter((item) => item.id !== meta.id)];
    localStorage.setItem(INDEX_KEY, JSON.stringify(nextList));
    notify();
    return true;
  } catch (err) {
    console.error("Failed to save recording:", err);
    throw err;
  }
}

/**
 * Retrieves the recorded audio Blob from IndexedDB by id.
 */
export async function getRecordingBlob(id) {
  try {
    return await getBlob(id);
  } catch (err) {
    console.error("Failed to fetch recording blob:", err);
    return null;
  }
}

/**
 * Renames an existing recording in the metadata index.
 */
export function renameRecording(id, name) {
  try {
    const list = listRecordings();
    const nextList = list.map((item) =>
      item.id === id ? { ...item, name } : item
    );
    localStorage.setItem(INDEX_KEY, JSON.stringify(nextList));
    notify();
    return true;
  } catch (err) {
    console.error("Failed to rename recording:", err);
    return false;
  }
}

/**
 * Deletes both metadata and audio Blob for a recording.
 */
export async function deleteRecording(id) {
  try {
    await deleteBlob(id);
  } catch (err) {
    console.warn("Failed to delete recording blob from IndexedDB:", err);
  }

  try {
    const list = listRecordings();
    const nextList = list.filter((item) => item.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(nextList));
    notify();
    return true;
  } catch (err) {
    console.error("Failed to delete recording metadata:", err);
    return false;
  }
}

/**
 * Subscribes to live updates when recordings are added, edited, or deleted.
 * Returns unsubscribe callback.
 */
export function subscribe(cb) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
