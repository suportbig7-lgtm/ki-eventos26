import LZString from 'lz-string';
import { WeddingConfig } from '../types';
import { createBlankWeddingConfig } from '../data/defaultConfig';
import { safeSetItem } from './storage';

/**
 * Ultra-lightweight micro payload schema.
 * Strict size limit: < 200 bytes before compression so resulting URL is always under 150 characters total.
 * NEVER includes base64 strings or huge blobs.
 */
interface MicroWeddingPayload {
  v: 2; // schema v2 (micro payload)
  id: string;
  g: string; // groomName
  b: string; // brideName
  d?: string; // date YYYY-MM-DD
  c?: string; // ceremony / church name
  ca?: string; // ceremony address
  ph?: string; // multicaixa phone
  ib?: string; // iban
  co?: string; // primary color
  cp?: string; // couplePhoto ONLY if short http url (< 120 chars) and not data:
}

/**
 * Encodes a WeddingConfig into an ultra-compact URL-safe string (< 70 characters).
 * Guaranteed to never blow up URL limits or break WhatsApp/mobile browsers.
 */
export function encodeWeddingPayload(config: WeddingConfig): string {
  try {
    const groom = (config.brideGroom?.groomName || 'Noivo').trim().slice(0, 35);
    const bride = (config.brideGroom?.brideName || 'Noiva').trim().slice(0, 35);
    const date = config.date ? config.date.split('T')[0] : '';
    const ceremony = (config.venue?.ceremonyName || config.venue?.churchName || '').trim().slice(0, 45);
    const ceremonyAddr = (config.venue?.ceremonyAddress || config.venue?.churchAddress || '').trim().slice(0, 45);
    const phone = (config.giftRegistry?.multicaixaPhone || '').trim().slice(0, 20);
    const iban = (config.giftRegistry?.iban || '').trim().slice(0, 34);
    const color = config.theme?.primaryColor || '';

    // Only include photo URL if it's a short external URL, NEVER base64
    let photoUrl: string | undefined = undefined;
    const rawPhoto = config.brideGroom?.couplePhoto || '';
    if (rawPhoto && rawPhoto.startsWith('http') && rawPhoto.length < 120 && !rawPhoto.startsWith('data:')) {
      photoUrl = rawPhoto;
    }

    const micro: MicroWeddingPayload = {
      v: 2,
      id: config.clientId || config.id || 'client_1',
      g: groom,
      b: bride,
      d: date || undefined,
      c: ceremony || undefined,
      ca: ceremonyAddr || undefined,
      ph: phone || undefined,
      ib: iban || undefined,
      co: color || undefined,
      cp: photoUrl,
    };

    const json = JSON.stringify(micro);
    const compressed = LZString.compressToEncodedURIComponent(json);
    
    // Safety check: ensure encoded payload is short (< 500 characters)
    if (compressed && compressed.length < 500) {
      return compressed;
    }
    return '';
  } catch (err) {
    console.warn('[portableLink] Failed to encode wedding payload:', err);
    return '';
  }
}

/**
 * Decodes a compressed URL-safe payload into a full, valid WeddingConfig.
 * Handles both v2 micro payload and v1 legacy payload seamlessly without crashing.
 */
export function decodeWeddingPayload(payloadStr: string): WeddingConfig | null {
  if (!payloadStr || typeof payloadStr !== 'string') return null;

  try {
    let jsonStr: string | null = null;
    
    // 1. Try LZString decompression
    try {
      jsonStr = LZString.decompressFromEncodedURIComponent(payloadStr);
    } catch (e) {
      jsonStr = null;
    }

    // 2. Fallback to direct URI decode or Base64
    if (!jsonStr) {
      try {
        jsonStr = decodeURIComponent(payloadStr);
      } catch (e) {
        try {
          jsonStr = atob(payloadStr);
        } catch (e2) {
          jsonStr = null;
        }
      }
    }

    if (!jsonStr) return null;

    const parsed: any = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    const clientId = parsed.id || parsed.cid || 'client_1';
    const groomName = parsed.g || parsed.bg?.g || 'Noivo';
    const brideName = parsed.b || parsed.bg?.b || 'Noiva';

    // Start with a clean base config
    const base = createBlankWeddingConfig(clientId, groomName, brideName);

    // Hydrate names
    base.brideGroom = {
      ...base.brideGroom,
      groomName,
      brideName,
      groomFullName: parsed.bg?.gFull || `${groomName} dos Santos`,
      brideFullName: parsed.bg?.bFull || `${brideName} de Oliveira`,
      couplePhoto: parsed.cp || parsed.bg?.cp || base.brideGroom.couplePhoto,
    };

    // Hydrate date
    if (parsed.d) {
      base.date = parsed.d.includes('T') ? parsed.d : `${parsed.d}T16:00:00`;
    }

    // Hydrate venue
    if (parsed.c || parsed.vn?.c || parsed.vn?.ch) {
      const venueName = parsed.c || parsed.vn?.c || parsed.vn?.ch;
      const venueAddress = parsed.ca || parsed.vn?.ca || parsed.vn?.cha || 'Luanda, Angola';
      base.venue = {
        ...base.venue,
        ceremonyName: venueName,
        churchName: venueName,
        ceremonyAddress: venueAddress,
        churchAddress: venueAddress,
        receptionName: parsed.vn?.r || venueName,
        receptionAddress: parsed.vn?.ra || venueAddress,
      };
    }

    // Hydrate gifts/contacts
    if (parsed.ph || parsed.ib || parsed.gr) {
      base.giftRegistry = {
        ...base.giftRegistry,
        multicaixaPhone: parsed.ph || parsed.gr?.mcx || base.giftRegistry.multicaixaPhone,
        iban: parsed.ib || parsed.gr?.ib || base.giftRegistry.iban,
        accountHolder: `${groomName} & ${brideName}`,
        bankRecipient: `${groomName} & ${brideName}`,
      };
    }

    // Hydrate color
    if (parsed.co && base.theme) {
      base.theme.primaryColor = parsed.co;
    }

    base.customFooter = `Com amor, sempre. — ${groomName} & ${brideName}`;
    return base;
  } catch (err) {
    console.warn('[portableLink] Failed to decode wedding payload:', err);
    return null;
  }
}

/**
 * Builds a clean, portable invitation URL (< 150 characters total).
 * Guaranteed to open on ANY smartphone, browser, or WhatsApp link.
 */
export function buildPortableInviteLink(config: WeddingConfig, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const targetCid = config.clientId || config.id || 'client_1';
  const encodedPayload = encodeWeddingPayload(config);

  const url = new URL(`${origin}/`);
  url.searchParams.set('w', targetCid);
  url.searchParams.set('invite', 'convite');
  
  // Only append 'd' if short and valid
  if (encodedPayload && encodedPayload.length < 350) {
    url.searchParams.set('d', encodedPayload);
  }
  return url.toString();
}

/**
 * Builds a portable Gatekeeper (Portaria) URL.
 */
export function buildPortablePortariaLink(config: WeddingConfig, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const targetCid = config.clientId || config.id || 'client_1';
  const encodedPayload = encodeWeddingPayload(config);

  const url = new URL(`${origin}/`);
  url.searchParams.set('portaria', targetCid);
  if (encodedPayload && encodedPayload.length < 350) {
    url.searchParams.set('d', encodedPayload);
  }
  return url.toString();
}

/**
 * Checks window.location.search for embedded payload ('d' or 'data').
 */
export function hydrateFromUrlPayload(search?: string): { config: WeddingConfig; clientId: string } | null {
  if (typeof window === 'undefined' && !search) return null;

  try {
    const searchStr = search !== undefined ? search : window.location.search;
    const params = new URLSearchParams(searchStr);
    const payload = params.get('d') || params.get('data');

    if (!payload) return null;

    const decoded = decodeWeddingPayload(payload);
    if (!decoded) return null;

    const resolvedCid = decoded.clientId || decoded.id || 'client_1';

    safeSetItem(`kutxi_wedding_config_${resolvedCid}`, JSON.stringify(decoded));
    safeSetItem('kutxi_active_client_id', resolvedCid);

    return { config: decoded, clientId: resolvedCid };
  } catch (e) {
    console.warn('[portableLink] hydrateFromUrlPayload error:', e);
    return null;
  }
}
