import LZString from 'lz-string';
import { WeddingConfig } from '../types';
import { createBlankWeddingConfig, CONFIG_JOAO_ALICE, THEME_PRESETS } from '../data/defaultConfig';
import { safeSetItem } from './storage';

/**
 * Resilient, complete yet ultra-compressed wedding payload schema (v3).
 * Preserves the full richness of the invitation (Love story, timeline, venue, gifts, photos)
 * while excluding massive base64 blobs to keep URLs short and WhatsApp-safe.
 */
interface CompactWeddingPayload {
  v: 3;
  id: string;
  s?: string; // slug
  g: string; // groomName
  b: string; // brideName
  gf?: string; // groomFullName
  bf?: string; // brideFullName
  gb?: string; // groomBio
  bb?: string; // brideBio
  gp?: string; // groomPhoto
  bp?: string; // bridePhoto
  cp?: string; // couplePhoto
  d?: string; // date YYYY-MM-DDTHH:mm:ss
  st?: string; // storyTitle
  sc?: string; // storyContent
  vn?: {
    c?: string; // ceremonyName / churchName
    ca?: string; // ceremonyAddress / churchAddress
    ct?: string; // ceremonyTime
    r?: string; // receptionName
    ra?: string; // receptionAddress
    rt?: string; // receptionTime
  };
  tl?: Array<{
    id: string;
    t: string; // time
    tt: string; // title
    d?: string; // description
    i?: string; // icon
  }>;
  gr?: {
    ph?: string; // multicaixaPhone
    ib?: string; // iban
    bn?: string; // bankName
    rec?: string; // bankRecipient
    items?: Array<{
      id: string;
      n: string; // name
      p: number; // price
      c?: string; // category
      img?: string;
    }>;
  };
  dc?: {
    t?: string; // title
    d?: string; // description
  };
  m?: {
    cv?: string; // coverImage
    p?: string[]; // photos
  };
  co?: string; // theme primaryColor
  u?: number; // updatedAt timestamp
}

function sanitizeUrlForPayload(url: string | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  // Strictly disallow base64 data URIs from payload to prevent URL blowout
  if (trimmed.startsWith('data:')) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.length < 220 ? trimmed : undefined;
  }
  return undefined;
}

/**
 * Encodes a complete WeddingConfig into a safe, compressed string.
 */
export function encodeWeddingPayload(config: WeddingConfig): string {
  try {
    const groom = (config.brideGroom?.groomName || 'Noivo').trim().slice(0, 35);
    const bride = (config.brideGroom?.brideName || 'Noiva').trim().slice(0, 35);
    const date = config.date ? config.date.split('T')[0] : '';
    const ceremony = (config.venue?.ceremonyName || config.venue?.churchName || '').trim().slice(0, 60);
    const ceremonyAddr = (config.venue?.ceremonyAddress || config.venue?.churchAddress || '').trim().slice(0, 60);
    const reception = (config.venue?.receptionName || '').trim().slice(0, 60);
    const receptionAddr = (config.venue?.receptionAddress || '').trim().slice(0, 60);

    const couplePhoto = sanitizeUrlForPayload(config.brideGroom?.couplePhoto);
    const groomPhoto = sanitizeUrlForPayload(config.brideGroom?.groomPhoto);
    const bridePhoto = sanitizeUrlForPayload(config.brideGroom?.bridePhoto);
    const coverImage = sanitizeUrlForPayload(config.media?.coverImage);

    const rawPhotos = (config.media?.photos || [])
      .map(p => sanitizeUrlForPayload(p))
      .filter((p): p is string => Boolean(p))
      .slice(0, 4);

    const timeline = (config.timeline || []).slice(0, 5).map(t => ({
      id: t.id,
      t: t.time,
      tt: t.title.slice(0, 40),
      d: t.description ? t.description.slice(0, 80) : undefined,
      i: t.icon
    }));

    const registryItems = (config.giftRegistry?.registryItems || []).slice(0, 5).map(item => ({
      id: item.id,
      n: item.name.slice(0, 50),
      p: item.price,
      c: item.category,
      img: sanitizeUrlForPayload(item.imageUrl)
    }));

    const resolvedId = config.clientId && config.clientId !== 'system' ? config.clientId : (config.id && config.id !== 'system' ? config.id : 'client_joao_alice');
    const resolvedSlug = config.slug && config.slug !== 'system' ? config.slug : (resolvedId === 'client_joao_alice' ? 'joao-alice' : resolvedId.replace(/^client_/, ''));

    const payload: CompactWeddingPayload = {
      v: 3,
      id: resolvedId,
      s: resolvedSlug,
      g: groom,
      b: bride,
      gf: config.brideGroom?.groomFullName ? config.brideGroom.groomFullName.slice(0, 50) : undefined,
      bf: config.brideGroom?.brideFullName ? config.brideGroom.brideFullName.slice(0, 50) : undefined,
      gb: config.brideGroom?.groomBio ? config.brideGroom.groomBio.slice(0, 160) : undefined,
      bb: config.brideGroom?.brideBio ? config.brideGroom.brideBio.slice(0, 160) : undefined,
      gp: groomPhoto,
      bp: bridePhoto,
      cp: couplePhoto,
      d: date ? `${date}T16:00:00` : undefined,
      st: config.storyTitle ? config.storyTitle.slice(0, 50) : undefined,
      sc: config.storyContent ? config.storyContent.slice(0, 260) : undefined,
      vn: (ceremony || reception) ? {
        c: ceremony || undefined,
        ca: ceremonyAddr || undefined,
        ct: config.venue?.ceremonyTime || '15:30',
        r: reception || undefined,
        ra: receptionAddr || undefined,
        rt: config.venue?.receptionTime || '18:00'
      } : undefined,
      tl: timeline.length > 0 ? timeline : undefined,
      gr: {
        ph: config.giftRegistry?.multicaixaPhone || undefined,
        ib: config.giftRegistry?.iban || undefined,
        bn: config.giftRegistry?.bankName || undefined,
        rec: config.giftRegistry?.bankRecipient || `${groom} & ${bride}`,
        items: registryItems.length > 0 ? registryItems : undefined
      },
      dc: config.dressCode ? {
        t: config.dressCode.title?.slice(0, 50),
        d: config.dressCode.description?.slice(0, 120)
      } : undefined,
      m: (coverImage || rawPhotos.length > 0) ? {
        cv: coverImage,
        p: rawPhotos.length > 0 ? rawPhotos : undefined
      } : undefined,
      co: config.theme?.primaryColor,
      u: config.updatedAt || Date.now()
    };

    const json = JSON.stringify(payload);
    const compressed = LZString.compressToEncodedURIComponent(json);
    return compressed || '';
  } catch (err) {
    console.warn('[portableLink] Failed to encode wedding payload:', err);
    return '';
  }
}

/**
 * Decodes a compressed URL-safe payload into a full, valid, and rich WeddingConfig.
 * Handles v3, v2, and v1 schemas seamlessly.
 */
export function decodeWeddingPayload(payloadStr: string): WeddingConfig | null {
  if (!payloadStr || typeof payloadStr !== 'string') return null;

  try {
    let jsonStr: string | null = null;
    try {
      jsonStr = LZString.decompressFromEncodedURIComponent(payloadStr);
    } catch (e) {
      jsonStr = null;
    }

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

    const clientId = parsed.id && parsed.id !== 'system' ? parsed.id : 'client_joao_alice';
    const groomName = parsed.g || parsed.bg?.g || 'João';
    const brideName = parsed.b || parsed.bg?.b || 'Alice';
    const slug = parsed.s || (clientId === 'client_joao_alice' ? 'joao-alice' : clientId.replace(/^client_/, ''));

    // Start with rich baseline config to guarantee all sections render smoothly
    const base = { ...CONFIG_JOAO_ALICE };
    base.id = clientId;
    base.clientId = clientId;
    base.slug = slug;
    base.isNewProfile = false;
    base.onboardingCompleted = true;

    // Hydrate bride and groom details
    base.brideGroom = {
      groomName,
      brideName,
      groomFullName: parsed.gf || parsed.bg?.gFull || `${groomName} dos Santos`,
      brideFullName: parsed.bf || parsed.bg?.bFull || `${brideName} de Oliveira`,
      groomBio: parsed.gb || base.brideGroom.groomBio,
      brideBio: parsed.bb || base.brideGroom.brideBio,
      groomParents: base.brideGroom.groomParents,
      brideParents: base.brideGroom.brideParents,
      groomPhoto: parsed.gp || base.brideGroom.groomPhoto,
      bridePhoto: parsed.bp || base.brideGroom.bridePhoto,
      couplePhoto: parsed.cp || parsed.bg?.cp || base.brideGroom.couplePhoto,
    };

    // Hydrate date
    if (parsed.d) {
      base.date = parsed.d.includes('T') ? parsed.d : `${parsed.d}T16:00:00`;
    }

    // Hydrate story
    if (parsed.st) base.storyTitle = parsed.st;
    if (parsed.sc) base.storyContent = parsed.sc;

    // Hydrate venue
    if (parsed.vn || parsed.c || parsed.ca) {
      const cName = parsed.vn?.c || parsed.c || base.venue.ceremonyName;
      const cAddr = parsed.vn?.ca || parsed.ca || base.venue.ceremonyAddress;
      const rName = parsed.vn?.r || base.venue.receptionName;
      const rAddr = parsed.vn?.ra || base.venue.receptionAddress;

      base.venue = {
        ...base.venue,
        ceremonyName: cName,
        ceremonyAddress: cAddr,
        churchName: cName,
        churchAddress: cAddr,
        ceremonyTime: parsed.vn?.ct || '15:30',
        churchTime: parsed.vn?.ct || '15:30',
        receptionName: rName,
        receptionAddress: rAddr,
        receptionTime: parsed.vn?.rt || '18:00',
        receptionMapsUrl: 'https://maps.google.com'
      };
    }

    // Hydrate timeline
    if (Array.isArray(parsed.tl) && parsed.tl.length > 0) {
      base.timeline = parsed.tl.map((t: any) => ({
        id: t.id || 't_' + Math.random().toString(36).slice(2, 6),
        time: t.t || '16:00',
        title: t.tt || 'Momento Especial',
        description: t.d || '',
        icon: t.i || 'Heart'
      }));
    }

    // Hydrate gifts
    if (parsed.gr || parsed.ph || parsed.ib) {
      const items = Array.isArray(parsed.gr?.items) && parsed.gr.items.length > 0 
        ? parsed.gr.items.map((i: any) => ({
            id: i.id || 'gi_' + Math.random().toString(36).slice(2, 6),
            name: i.n || 'Presente aos Noivos',
            price: Number(i.p) || 150000,
            totalCollected: 0,
            category: i.c || 'mesa',
            description: 'Contribuição especial para o casal.',
            imageUrl: i.img || 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400',
            status: 'disponivel' as const,
            contributors: []
          }))
        : base.giftRegistry.registryItems;

      base.giftRegistry = {
        ...base.giftRegistry,
        multicaixaPhone: parsed.gr?.ph || parsed.ph || base.giftRegistry.multicaixaPhone,
        iban: parsed.gr?.ib || parsed.ib || base.giftRegistry.iban,
        bankName: parsed.gr?.bn || base.giftRegistry.bankName,
        bankRecipient: parsed.gr?.rec || `${groomName} & ${brideName}`,
        registryItems: items
      };
    }

    // Hydrate dressCode
    if (parsed.dc) {
      base.dressCode = {
        ...base.dressCode,
        title: parsed.dc.t || base.dressCode.title,
        description: parsed.dc.d || base.dressCode.description
      };
    }

    // Hydrate media
    if (parsed.m) {
      base.media = {
        coverImage: parsed.m.cv || base.media.coverImage,
        storyImage: base.media.storyImage,
        photos: Array.isArray(parsed.m.p) && parsed.m.p.length > 0 ? parsed.m.p : base.media.photos
      };
    }

    // Hydrate theme color
    if (parsed.co && base.theme) {
      base.theme = {
        ...base.theme,
        primaryColor: parsed.co
      };
    }

    base.updatedAt = parsed.u || Date.now();
    base.customFooter = `Com amor, sempre. — ${groomName} & ${brideName}`;
    return base;
  } catch (err) {
    console.warn('[portableLink] Failed to decode wedding payload:', err);
    return null;
  }
}

/**
 * Builds a clean, portable invitation URL utilizing friendly slugs and hashes.
 * Format: https://domain/?invite=joao-alice (with optional compact payload for cross-domain resilience)
 */
export function buildPortableInviteLink(config: WeddingConfig, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  let resolvedId = config.clientId || config.id || 'client_joao_alice';
  if (resolvedId === 'system') {
    resolvedId = 'client_joao_alice';
  }

  let slug = (config.slug || '').trim();
  if (!slug || slug === 'system') {
    slug = resolvedId === 'client_joao_alice' ? 'joao-alice' : resolvedId.replace(/^client_/, '');
  }

  // Format: https://domain/?invite=joao-alice
  const url = new URL(`${origin}/`);
  url.searchParams.set('invite', slug);
  return url.toString();
}

/**
 * Builds a clean, friendly Gatekeeper (Portaria) URL.
 */
export function buildPortablePortariaLink(config: WeddingConfig, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  let targetCid = config.clientId || config.id || 'client_joao_alice';
  if (targetCid === 'system') targetCid = 'client_joao_alice';
  const slug = config.slug || targetCid.replace(/^client_/, '');

  const url = new URL(`${origin}/`);
  url.searchParams.set('portaria', slug);
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

    const resolvedCid = decoded.clientId || decoded.id || 'client_joao_alice';

    safeSetItem(`kutxi_wedding_config_${resolvedCid}`, JSON.stringify(decoded));
    safeSetItem('kutxi_active_client_id', resolvedCid);

    return { config: decoded, clientId: resolvedCid };
  } catch (e) {
    console.warn('[portableLink] hydrateFromUrlPayload error:', e);
    return null;
  }
}
