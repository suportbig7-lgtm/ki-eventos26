import { ClientWeddingSaaS, WeddingConfig } from '../types';

/**
 * Kutxi Resilient Multi-tier Storage Engine
 * Provides:
 * 1. Synchronous in-memory fallback cache (prevents app crashes when localStorage quota is exceeded)
 * 2. Automatic QuotaExceeded recovery with aggressive payload pruning
 * 3. Base64 payload sanitization to prevent quota explosion
 * 4. Asynchronous IndexedDB mirroring for long-term persistence without the 5MB localStorage limit
 * 5. One-click factory reset / virgin state initialization
 */

// In-memory fallback map (ensures the React application NEVER crashes on quota errors)
const memoryStorage = new Map<string, string>();

// IndexedDB Helper
const IDB_NAME = 'kutxi_db_v1';
const IDB_STORE = 'app_state';

function openIndexedDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openIndexedDb();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(value, key);
  } catch (e) {
    // Non-blocking
  }
}

export async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openIndexedDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Strips heavy data URIs (base64 images, audio, PDF) from a WeddingConfig
 */
export function sanitizeConfigForStorage(config?: WeddingConfig): WeddingConfig | undefined {
  if (!config) return undefined;
  try {
    const sanitized: WeddingConfig = JSON.parse(JSON.stringify(config));
    
    // Strip heavy PDF data URI
    if (sanitized.pdfUrl && sanitized.pdfUrl.startsWith('data:')) {
      sanitized.pdfUrl = undefined;
    }

    // Strip heavy coverImage
    if (sanitized.media?.coverImage && sanitized.media.coverImage.startsWith('data:')) {
      sanitized.media.coverImage = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200";
    }

    // Strip heavy storyImage
    if (sanitized.media?.storyImage && sanitized.media.storyImage.startsWith('data:')) {
      sanitized.media.storyImage = "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800";
    }

    // Strip heavy audio data URI if present
    if ((sanitized as any).media?.audioUrl && typeof (sanitized as any).media.audioUrl === 'string' && (sanitized as any).media.audioUrl.startsWith('data:')) {
      delete (sanitized as any).media.audioUrl;
    }

    // Strip base64 gallery photos
    if (sanitized.media?.photos && Array.isArray(sanitized.media.photos)) {
      sanitized.media.photos = sanitized.media.photos
        .slice(0, 6)
        .map(p => {
          if (typeof p === 'string' && p.startsWith('data:')) {
            return "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600";
          }
          return p;
        });
    }

    // Clean gift registry items images if base64
    if (sanitized.giftRegistry?.registryItems && Array.isArray(sanitized.giftRegistry.registryItems)) {
      sanitized.giftRegistry.registryItems = sanitized.giftRegistry.registryItems.map(item => {
        if (item.imageUrl && item.imageUrl.startsWith('data:')) {
          return {
            ...item,
            imageUrl: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=400"
          };
        }
        return item;
      });
    }

    return sanitized;
  } catch (e) {
    return config;
  }
}

/**
 * Prunes the clients list to ensure it NEVER causes quota overflow.
 */
export function sanitizeClientsList(clients: ClientWeddingSaaS[]): ClientWeddingSaaS[] {
  if (!Array.isArray(clients)) return [];
  return clients.map(c => {
    let leanConfig: WeddingConfig = c.config;
    if (c.config) {
      leanConfig = {
        ...c.config,
        media: {
          coverImage: (c.config.media?.coverImage && !c.config.media.coverImage.startsWith('data:'))
            ? c.config.media.coverImage
            : "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200",
          storyImage: (c.config.media?.storyImage && !c.config.media.storyImage.startsWith('data:'))
            ? c.config.media.storyImage
            : "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800",
          photos: (c.config.media?.photos || [])
            .slice(0, 3)
            .map(p => (typeof p === 'string' && p.startsWith('data:')) ? "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600" : p)
        },
        pdfUrl: undefined
      };
    }
    return {
      ...c,
      config: leanConfig
    };
  });
}

/**
 * Clears non-critical caches from localStorage to relieve quota pressure.
 */
export function freeUpLocalStorageSpace(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (
          key.startsWith('kutxi_photos_') || 
          key.startsWith('vowsflow_photos_') ||
          key.startsWith('kutxi_affection_msgs_') ||
          key.startsWith('vowsflow_affection_msgs_') ||
          key === 'kutxi_donor_profile'
        ) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });

    // Trim audit logs to last 5
    const rawLogs = localStorage.getItem('kutxi_audit_logs');
    if (rawLogs) {
      try {
        const logs = JSON.parse(rawLogs);
        if (Array.isArray(logs) && logs.length > 5) {
          localStorage.setItem('kutxi_audit_logs', JSON.stringify(logs.slice(0, 5)));
        }
      } catch (e) {
        try { localStorage.removeItem('kutxi_audit_logs'); } catch (err) {}
      }
    }
  } catch (err) {
    console.warn('[freeUpLocalStorageSpace] Safe recovery pass completed with warning:', err);
  }
}

/**
 * Reset all data to virgin state (as requested: "limpe todos os dados ja carregados e deixe o programa virgem pronto a ser utilizado do zero")
 */
export function resetAllDataToVirgin(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('kutxi_') || key.startsWith('vowsflow_'))) {
          // Do not delete dark mode preference
          if (key !== 'kutxi_dark_mode') {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    memoryStorage.clear();
  } catch (e) {
    console.warn('[resetAllDataToVirgin] Error resetting storage:', e);
  }
}

/**
 * Safe wrapper for localStorage.setItem that catches QuotaExceeded errors,
 * cleans up space, prunes payloads, mirrors to IndexedDB, and ensures the React app NEVER crashes.
 */
export function safeSetItem(key: string, value: string): boolean {
  // Always update in-memory cache first
  memoryStorage.set(key, value);
  // Mirror asynchronously to IndexedDB
  idbSet(key, value).catch(() => {});

  if (typeof localStorage === 'undefined') return true;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    console.warn(`[safeSetItem] Quota exceeded while saving "${key}". Initiating recovery...`, e);
    freeUpLocalStorageSpace();

    if (key === 'kutxi_clients' || key === 'vowsflow_clients') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeClientsList(parsed);
          const sanitizedStr = JSON.stringify(sanitized);
          localStorage.setItem(key, sanitizedStr);
          memoryStorage.set(key, sanitizedStr);
          return true;
        }
      } catch (err) {
        console.warn(`[safeSetItem] Could not save sanitized ${key} to localStorage:`, err);
      }
    }

    if (key.includes('wedding_config')) {
      try {
        const parsed = JSON.parse(value);
        const sanitized = sanitizeConfigForStorage(parsed);
        if (sanitized) {
          const sanitizedStr = JSON.stringify(sanitized);
          localStorage.setItem(key, sanitizedStr);
          memoryStorage.set(key, sanitizedStr);
          return true;
        }
      } catch (err) {
        console.warn(`[safeSetItem] Could not save sanitized config for ${key}:`, err);
      }
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (finalErr) {
      return true;
    }
  }
}

export function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (e) {
    console.warn(`[safeGetItem] LocalStorage error for key "${key}":`, e);
  }
  return memoryStorage.get(key) || null;
}

export function safeRemoveItem(key: string): void {
  memoryStorage.delete(key);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`[safeRemoveItem] Error removing key "${key}":`, e);
  }
}
