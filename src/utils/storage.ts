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

const DEFAULT_BFA = {
  bankName: 'BFA — Banco de Fomento Angola',
  bankAgency: 'Agência Talatona (0042)',
  bankAccount: '194720090',
  iban: 'AO06 0006 0042 0001 9472 0090 1',
};

const INVENTED_EXPRESS_PHONES = new Set([
  '+244 923 456 789',
  '923 456 789',
  '+244923456789',
  '+244 923 888 777',
  '+244 923 111 222',
  '+244 923 555 666',
  '+244 923 000 000',
]);

const INVENTED_IBANS_LIST = [
  'AO06 0040 0000 1234 5678 9012 3',
  'AO06 0006 0000 9876 5432 1012 4',
  'AO06 0055 0000 4567 8901 2345 6',
  'AO06.0040.0000.1234.5678.9012.3',
  'AO06.0006.0000.9876.5432.1098.7',
];

function cleanPhotoUrl(url: string | undefined, fallback: string, blankForNewProfile: boolean): string {
  if (!url || typeof url !== 'string') return blankForNewProfile ? '' : fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes('images.unsplash.com')) {
    return blankForNewProfile ? '' : fallback;
  }
  return trimmed;
}

/**
 * Cleans Unsplash placeholders and invented banking fields from a WeddingConfig
 * while PRESERVING all couple-uploaded base64 data URIs.
 */
export function sanitizeConfigForStorage(config?: WeddingConfig): WeddingConfig | undefined {
  if (!config) return undefined;
  try {
    const sanitized: WeddingConfig = JSON.parse(JSON.stringify(config));
    const blank = Boolean(sanitized.isNewProfile);

    if (sanitized.brideGroom) {
      sanitized.brideGroom.groomPhoto = cleanPhotoUrl(sanitized.brideGroom.groomPhoto, '/assets/aistudio/noivo_cb7dee44.jpeg', blank);
      sanitized.brideGroom.bridePhoto = cleanPhotoUrl(sanitized.brideGroom.bridePhoto, '/assets/aistudio/noivaa_f3d108c5.jpeg', blank);
      sanitized.brideGroom.couplePhoto = cleanPhotoUrl(sanitized.brideGroom.couplePhoto, '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg', blank);
    }

    if (sanitized.media) {
      sanitized.media.coverImage = cleanPhotoUrl(sanitized.media.coverImage, '/assets/aistudio/capa_eeb23baf.jpeg', blank);
      sanitized.media.storyImage = cleanPhotoUrl(sanitized.media.storyImage, '/assets/aistudio/nossa_historia_0790376f.jpeg', blank);
      if (Array.isArray(sanitized.media.photos)) {
        const galleryFallbacks = [
          '/assets/aistudio/galeria_do_casal1_aefb2fb2.jpeg',
          '/assets/aistudio/galeria_do_casal_2_026437d5.jpeg',
          '/assets/aistudio/galeria_do_casal_0790376f.jpeg',
          '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',
          '/assets/aistudio/capa_eeb23baf.jpeg',
          '/assets/aistudio/nossa_historia_0790376f.jpeg'
        ];
        sanitized.media.photos = sanitized.media.photos
          .map((p, idx) => cleanPhotoUrl(p, galleryFallbacks[idx % galleryFallbacks.length], blank))
          .filter(p => Boolean(p));
      }
    }

    if (sanitized.venue?.photos && Array.isArray(sanitized.venue.photos)) {
      sanitized.venue.photos = sanitized.venue.photos
        .map((p, idx) => cleanPhotoUrl(p, idx % 2 === 0 ? '/assets/aistudio/capa_eeb23baf.jpeg' : '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg', blank))
        .filter(p => Boolean(p));
    }

    if (sanitized.giftRegistry) {
      if (INVENTED_EXPRESS_PHONES.has((sanitized.giftRegistry.multicaixaPhone || '').trim())) {
        sanitized.giftRegistry.multicaixaPhone = '';
      }
      if (INVENTED_EXPRESS_PHONES.has((sanitized.giftRegistry.pixKey || '').trim())) {
        sanitized.giftRegistry.pixKey = '';
      }
      if (!sanitized.giftRegistry.iban || INVENTED_IBANS_LIST.includes(sanitized.giftRegistry.iban.trim())) {
        sanitized.giftRegistry.iban = DEFAULT_BFA.iban;
        sanitized.giftRegistry.bankName = DEFAULT_BFA.bankName;
        sanitized.giftRegistry.bankAgency = DEFAULT_BFA.bankAgency;
        sanitized.giftRegistry.bankAccount = DEFAULT_BFA.bankAccount;
      }
      if (!sanitized.giftRegistry.bankName || sanitized.giftRegistry.bankName === 'Banco BAI / BFA' || sanitized.giftRegistry.bankName === 'Banco BFA / BAI' || sanitized.giftRegistry.bankName === 'Banco BAI / Sol' || sanitized.giftRegistry.bankName === 'BFA / BAI') {
        sanitized.giftRegistry.bankName = DEFAULT_BFA.bankName;
      }
      if (Array.isArray(sanitized.giftRegistry.registryItems)) {
        sanitized.giftRegistry.registryItems = sanitized.giftRegistry.registryItems.map(item => ({
          ...item,
          imageUrl: cleanPhotoUrl(item.imageUrl, '/assets/aistudio/capa_eeb23baf.jpeg', blank),
          contributors: Array.isArray(item.contributors)
            ? item.contributors.map(c => ({
                ...c,
                avatarUrl: c.avatarUrl && c.avatarUrl.includes('images.unsplash.com') ? '' : c.avatarUrl
              }))
            : item.contributors
        }));
      }
    }

    if (sanitized.contactInfo?.phone && INVENTED_EXPRESS_PHONES.has(sanitized.contactInfo.phone.trim())) {
      sanitized.contactInfo.phone = '';
    }

    if (Array.isArray(sanitized.muralComments)) {
      sanitized.muralComments = sanitized.muralComments.map(c => ({
        ...c,
        avatarUrl: c.avatarUrl && c.avatarUrl.includes('images.unsplash.com') ? '' : c.avatarUrl
      }));
    }

    return sanitized;
  } catch (e) {
    return config;
  }
}

/**
 * Prunes oversized base64 blobs ONLY when localStorage throws QuotaExceeded.
 * Uses local /assets/aistudio/ assets (or empty for virgin profiles) — never Unsplash.
 */
function pruneConfigForLocalStorage(config?: WeddingConfig): WeddingConfig | undefined {
  const sanitized = sanitizeConfigForStorage(config);
  if (!sanitized) return undefined;
  try {
    const pruned: WeddingConfig = JSON.parse(JSON.stringify(sanitized));
    const blank = Boolean(pruned.isNewProfile);

    if (pruned.pdfUrl && pruned.pdfUrl.startsWith('data:')) {
      pruned.pdfUrl = undefined;
    }
    if ((pruned as any).media?.audioUrl && typeof (pruned as any).media.audioUrl === 'string' && (pruned as any).media.audioUrl.startsWith('data:')) {
      delete (pruned as any).media.audioUrl;
    }
    if (pruned.brideGroom) {
      if (pruned.brideGroom.groomPhoto?.startsWith('data:')) pruned.brideGroom.groomPhoto = blank ? '' : '/assets/aistudio/noivo_cb7dee44.jpeg';
      if (pruned.brideGroom.bridePhoto?.startsWith('data:')) pruned.brideGroom.bridePhoto = blank ? '' : '/assets/aistudio/noivaa_f3d108c5.jpeg';
      if (pruned.brideGroom.couplePhoto?.startsWith('data:')) pruned.brideGroom.couplePhoto = blank ? '' : '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg';
    }
    if (pruned.media) {
      if (pruned.media.coverImage?.startsWith('data:')) pruned.media.coverImage = blank ? '' : '/assets/aistudio/capa_eeb23baf.jpeg';
      if (pruned.media.storyImage?.startsWith('data:')) pruned.media.storyImage = blank ? '' : '/assets/aistudio/nossa_historia_0790376f.jpeg';
      if (Array.isArray(pruned.media.photos)) {
        const galleryFallbacks = [
          '/assets/aistudio/galeria_do_casal1_aefb2fb2.jpeg',
          '/assets/aistudio/galeria_do_casal_2_026437d5.jpeg',
          '/assets/aistudio/galeria_do_casal_0790376f.jpeg',
        ];
        pruned.media.photos = pruned.media.photos
          .slice(0, 6)
          .map((p, idx) => (typeof p === 'string' && p.startsWith('data:')) ? (blank ? '' : galleryFallbacks[idx % galleryFallbacks.length]) : p)
          .filter(Boolean);
      }
    }
    if (pruned.giftRegistry?.registryItems) {
      pruned.giftRegistry.registryItems = pruned.giftRegistry.registryItems.map(item =>
        item.imageUrl?.startsWith('data:')
          ? { ...item, imageUrl: blank ? '' : '/assets/aistudio/capa_eeb23baf.jpeg' }
          : item
      );
    }
    return pruned;
  } catch (e) {
    return sanitized;
  }
}

/**
 * Deduplicates and cleans clients list while preserving couple-uploaded photos.
 */
export function sanitizeClientsList(clients: ClientWeddingSaaS[]): ClientWeddingSaaS[] {
  if (!Array.isArray(clients)) return [];
  const seenIds = new Set<string>();
  const uniqueClients: ClientWeddingSaaS[] = [];

  for (const c of clients) {
    if (!c || !c.id) continue;
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      uniqueClients.push(c);
    }
  }

  return uniqueClients.map(c => ({
    ...c,
    config: c.config ? (sanitizeConfigForStorage(c.config) || c.config) : c.config
  }));
}

function pruneClientsForLocalStorage(clients: ClientWeddingSaaS[]): ClientWeddingSaaS[] {
  return sanitizeClientsList(clients).map(c => ({
    ...c,
    config: c.config ? (pruneConfigForLocalStorage(c.config) || c.config) : c.config
  }));
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
          const pruned = pruneClientsForLocalStorage(parsed);
          const prunedStr = JSON.stringify(pruned);
          localStorage.setItem(key, prunedStr);
          return true;
        }
      } catch (err) {
        console.warn(`[safeSetItem] Could not save pruned ${key} to localStorage:`, err);
      }
    }

    if (key.includes('wedding_config')) {
      try {
        const parsed = JSON.parse(value);
        const pruned = pruneConfigForLocalStorage(parsed);
        if (pruned) {
          const prunedStr = JSON.stringify(pruned);
          localStorage.setItem(key, prunedStr);
          return true;
        }
      } catch (err) {
        console.warn(`[safeSetItem] Could not save pruned config for ${key}:`, err);
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
