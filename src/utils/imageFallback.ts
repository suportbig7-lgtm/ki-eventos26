/**
 * Kutxi Resilient Image Fallback & CDN Helper
 * Provides guaranteed, high-resolution wedding photography fallbacks
 * and auto-recovery for broken or unresolvable image URLs.
 */

export const WEDDING_FALLBACK_IMAGES = {
  // Couple Cover & Hero
  cover: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1600',
  coverAlternative: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1600',

  // Couple Story & Romance
  story: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1200',
  storyAlternative: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=1200',

  // Groom & Bride Portraits
  groom: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
  bride: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
  couple: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',

  // Gallery Moments
  gallery: [
    'https://images.unsplash.com/photo-1519225495810-7517ccd358ee?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1482618722475-5531547346c7?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1520854221256-17451cc359df?auto=format&fit=crop&q=80&w=800'
  ],

  // Gift Registry Categories
  giftEletro: 'https://images.unsplash.com/photo-1594385208974-2e75f9d8a8be?auto=format&fit=crop&q=80&w=600',
  giftCozinha: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=600',
  giftMesa: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600',
  giftViagem: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=600',
  giftQuarto: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600',
  giftExperiencias: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600',
  giftDefault: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600',

  // Avatars
  avatarFemale: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
  avatarMale: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
};

/**
 * Returns a valid URL or a reliable fallback if empty/undefined
 */
export function getSafeImageUrl(url: string | undefined | null, type: keyof typeof WEDDING_FALLBACK_IMAGES = 'cover'): string {
  if (url && typeof url === 'string' && url.trim().length > 10) {
    return url.trim();
  }
  const fallback = WEDDING_FALLBACK_IMAGES[type];
  if (typeof fallback === 'string') return fallback;
  if (Array.isArray(fallback) && fallback.length > 0) return fallback[0];
  return WEDDING_FALLBACK_IMAGES.cover;
}

/**
 * Image onError handler to recover broken images without showing browser broken-icon
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackType: keyof typeof WEDDING_FALLBACK_IMAGES = 'cover') {
  const target = e.currentTarget;
  const fallback = WEDDING_FALLBACK_IMAGES[fallbackType];
  const fallbackUrl = typeof fallback === 'string' ? fallback : (Array.isArray(fallback) ? fallback[0] : WEDDING_FALLBACK_IMAGES.cover);
  if (target.src !== fallbackUrl) {
    target.onerror = null;
    target.src = fallbackUrl;
  }
}
