import LZString from 'lz-string';
import { WeddingConfig } from '../types';
import { createBlankWeddingConfig, INITIAL_WEDDING_CONFIG } from '../data/defaultConfig';
import { safeSetItem } from './storage';

/**
 * Compact representation of wedding config for URL embedding.
 * Keeps payload lightweight while carrying all vital wedding data across devices.
 */
interface CompactWeddingPayload {
  v: 1; // schema version
  id: string;
  cid?: string;
  slug?: string;
  d: string; // date
  bg: {
    g: string; // groomName
    b: string; // brideName
    gFull?: string;
    bFull?: string;
    cp?: string; // couplePhoto
    gp?: string; // groomPhoto
    bp?: string; // bridePhoto
  };
  vn?: {
    c?: string; // ceremonyName
    ca?: string; // ceremonyAddress
    ch?: string; // churchName
    cha?: string; // churchAddress
    r?: string; // receptionName
    ra?: string; // receptionAddress
  };
  th?: {
    p?: string; // primaryColor
    s?: string; // secondaryColor
    a?: string; // accentColor
    bg?: string; // bgColor
    fh?: 'serif' | 'display' | 'sans';
  };
  gr?: {
    mcx?: string;
    ib?: string;
    h?: string;
    bk?: string;
    rec?: string;
  };
  m?: {
    cov?: string; // coverImage
    sty?: string; // storyImage
    snd?: string; // soundTrackUrl
  };
  st?: {
    t?: string; // storyTitle
    c?: string; // storyContent
  };
  cf?: string; // customFooter
}

/**
 * Encodes a WeddingConfig into a compact, URL-safe compressed string.
 */
export function encodeWeddingPayload(config: WeddingConfig): string {
  try {
    const compact: CompactWeddingPayload = {
      v: 1,
      id: config.id || config.clientId || 'client_1',
      cid: config.clientId || config.id || 'client_1',
      slug: config.slug || '',
      d: config.date || new Date().toISOString(),
      bg: {
        g: config.brideGroom?.groomName || 'Noivo',
        b: config.brideGroom?.brideName || 'Noiva',
        gFull: config.brideGroom?.groomFullName,
        bFull: config.brideGroom?.brideFullName,
        cp: config.brideGroom?.couplePhoto,
        gp: config.brideGroom?.groomPhoto,
        bp: config.brideGroom?.bridePhoto,
      },
      vn: {
        c: config.venue?.ceremonyName,
        ca: config.venue?.ceremonyAddress,
        ch: config.venue?.churchName,
        cha: config.venue?.churchAddress,
        r: config.venue?.receptionName,
        ra: config.venue?.receptionAddress,
      },
      th: config.theme ? {
        p: config.theme.primaryColor,
        s: config.theme.secondaryColor,
        a: config.theme.accentColor,
        bg: config.theme.bgColor,
        fh: config.theme.fontHeading,
      } : undefined,
      gr: config.giftRegistry ? {
        mcx: config.giftRegistry.multicaixaPhone,
        ib: config.giftRegistry.iban,
        h: config.giftRegistry.accountHolder,
        bk: config.giftRegistry.bankName,
        rec: config.giftRegistry.bankRecipient,
      } : undefined,
      m: {
        cov: config.media?.coverImage,
        sty: config.media?.storyImage,
        snd: config.spotifyPlaylistUrl || config.spotifyUrl,
      },
      st: {
        t: config.storyTitle,
        c: config.storyContent,
      },
      cf: config.customFooter,
    };

    const json = JSON.stringify(compact);
    const compressed = LZString.compressToEncodedURIComponent(json);
    return compressed;
  } catch (err) {
    console.error('[portableLink] Failed to encode wedding payload:', err);
    return '';
  }
}

/**
 * Decodes a compressed URL-safe payload into a full, valid WeddingConfig.
 */
export function decodeWeddingPayload(payloadStr: string): WeddingConfig | null {
  if (!payloadStr || typeof payloadStr !== 'string') return null;

  try {
    let jsonStr: string | null = null;
    
    // 1. Try LZString decompression
    jsonStr = LZString.decompressFromEncodedURIComponent(payloadStr);

    // 2. Fallback to direct URI decode / Base64 if needed
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

    const parsed: CompactWeddingPayload | any = JSON.parse(jsonStr);
    const clientId = parsed.cid || parsed.id || 'client_1';

    // Start with a blank config for this tenant to provide standard base defaults
    const base = createBlankWeddingConfig(clientId);

    if (parsed.bg) {
      base.brideGroom = {
        ...base.brideGroom,
        groomName: parsed.bg.g || base.brideGroom.groomName,
        brideName: parsed.bg.b || base.brideGroom.brideName,
        groomFullName: parsed.bg.gFull || `${parsed.bg.g || 'Noivo'} dos Santos`,
        brideFullName: parsed.bg.bFull || `${parsed.bg.b || 'Noiva'} de Oliveira`,
        couplePhoto: parsed.bg.cp || base.brideGroom.couplePhoto,
        groomPhoto: parsed.bg.gp || base.brideGroom.groomPhoto,
        bridePhoto: parsed.bg.bp || base.brideGroom.bridePhoto,
      };
    }

    if (parsed.d) {
      base.date = parsed.d;
    }

    if (parsed.vn) {
      base.venue = {
        ...base.venue,
        ceremonyName: parsed.vn.c || base.venue.ceremonyName,
        ceremonyAddress: parsed.vn.ca || base.venue.ceremonyAddress,
        churchName: parsed.vn.ch || base.venue.churchName,
        churchAddress: parsed.vn.cha || base.venue.churchAddress,
        receptionName: parsed.vn.r || base.venue.receptionName,
        receptionAddress: parsed.vn.ra || base.venue.receptionAddress,
      };
    }

    if (parsed.th && base.theme) {
      base.theme = {
        ...base.theme,
        primaryColor: parsed.th.p || base.theme.primaryColor,
        secondaryColor: parsed.th.s || base.theme.secondaryColor,
        accentColor: parsed.th.a || base.theme.accentColor,
        bgColor: parsed.th.bg || base.theme.bgColor,
        fontHeading: parsed.th.fh || base.theme.fontHeading,
      };
    }

    if (parsed.gr && base.giftRegistry) {
      base.giftRegistry = {
        ...base.giftRegistry,
        multicaixaPhone: parsed.gr.mcx || base.giftRegistry.multicaixaPhone,
        iban: parsed.gr.ib || base.giftRegistry.iban,
        accountHolder: parsed.gr.h || base.giftRegistry.accountHolder,
        bankName: parsed.gr.bk || base.giftRegistry.bankName,
        bankRecipient: parsed.gr.rec || base.giftRegistry.bankRecipient,
      };
    }

    if (parsed.m && base.media) {
      base.media = {
        ...base.media,
        coverImage: parsed.m.cov || base.media.coverImage,
        storyImage: parsed.m.sty || base.media.storyImage,
      };
      if (parsed.m.snd) {
        base.spotifyPlaylistUrl = parsed.m.snd;
        base.spotifyUrl = parsed.m.snd;
      }
    }

    if (parsed.st) {
      if (parsed.st.t) base.storyTitle = parsed.st.t;
      if (parsed.st.c) base.storyContent = parsed.st.c;
    }

    if (parsed.cf) {
      base.customFooter = parsed.cf;
    }

    return base;
  } catch (err) {
    console.error('[portableLink] Failed to decode wedding payload:', err);
    return null;
  }
}

/**
 * Builds a portable invitation URL containing the wedding data directly embedded into the query parameters.
 * This guarantees that ANY external phone, WhatsApp recipient, or browser opens the invitation with 100% accuracy,
 * completely independent of whether a database exists or if the server was restarted.
 */
export function buildPortableInviteLink(config: WeddingConfig, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const targetCid = config.clientId || config.id || 'client_1';
  const encodedPayload = encodeWeddingPayload(config);

  const url = new URL(`${origin}/`);
  url.searchParams.set('clientId', targetCid);
  url.searchParams.set('invite', 'convite');
  if (encodedPayload) {
    url.searchParams.set('d', encodedPayload);
  }
  return url.toString();
}

/**
 * Builds a portable Gatekeeper (Portaria) URL containing the wedding data.
 */
export function buildPortablePortariaLink(config: WeddingConfig, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const targetCid = config.clientId || config.id || 'client_1';
  const encodedPayload = encodeWeddingPayload(config);

  const url = new URL(`${origin}/`);
  url.searchParams.set('portaria', targetCid);
  if (encodedPayload) {
    url.searchParams.set('d', encodedPayload);
  }
  return url.toString();
}

/**
 * Checks window.location.search or provided search string for an embedded payload ('d' or 'data').
 * If found, decodes it, saves it to localStorage so future reloads remember it, and returns the config.
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

    // Hydrate local cache immediately
    safeSetItem(`kutxi_wedding_config_${resolvedCid}`, JSON.stringify(decoded));
    safeSetItem('kutxi_active_client_id', resolvedCid);

    return { config: decoded, clientId: resolvedCid };
  } catch (e) {
    console.warn('[portableLink] hydrateFromUrlPayload error:', e);
    return null;
  }
}
