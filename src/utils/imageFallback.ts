/**
 * Kutxi Resilient Image Fallback & CDN Helper
 * Provides guaranteed, high-resolution wedding photography fallbacks
 * and auto-recovery for broken or unresolvable image URLs.
 */

export const WEDDING_FALLBACK_IMAGES = {
  // Couple Cover & Hero
  cover: '/assets/aistudio/capa_eeb23baf.jpeg',
  coverAlternative: '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',

  // Couple Story & Romance
  story: '/assets/aistudio/nossa_historia_0790376f.jpeg',
  storyAlternative: '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',

  // Groom & Bride Portraits
  groom: '/assets/aistudio/noivo_cb7dee44.jpeg',
  bride: '/assets/aistudio/noivaa_f3d108c5.jpeg',
  couple: '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',

  // Gallery Moments
  gallery: [
    '/assets/aistudio/galeria_do_casal1_aefb2fb2.jpeg',
    '/assets/aistudio/galeria_do_casal_2_026437d5.jpeg',
    '/assets/aistudio/galeria_do_casal_0790376f.jpeg',
    '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',
    '/assets/aistudio/capa_eeb23baf.jpeg',
    '/assets/aistudio/nossa_historia_0790376f.jpeg'
  ],

  // Gift Registry Categories
  giftEletro: '/assets/aistudio/capa_eeb23baf.jpeg',
  giftCozinha: '/assets/aistudio/nossa_historia_0790376f.jpeg',
  giftMesa: '/assets/aistudio/galeria_do_casal1_aefb2fb2.jpeg',
  giftViagem: '/assets/aistudio/galeria_do_casal_0790376f.jpeg',
  giftQuarto: '/assets/aistudio/galeria_do_casal_2_026437d5.jpeg',
  giftExperiencias: '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',
  giftDefault: '/assets/aistudio/capa_eeb23baf.jpeg',

  // Avatars
  avatarFemale: '/assets/aistudio/noivaa_f3d108c5.jpeg',
  avatarMale: '/assets/aistudio/noivo_cb7dee44.jpeg'
};

/**
 * Returns a valid URL or the real couple photo fallback if empty or generic Unsplash placeholder
 */
export function getSafeImageUrl(url: string | undefined | null, type: keyof typeof WEDDING_FALLBACK_IMAGES = 'cover'): string {
  const fallback = WEDDING_FALLBACK_IMAGES[type];
  const defaultFallbackUrl = typeof fallback === 'string' ? fallback : (Array.isArray(fallback) && fallback.length > 0 ? fallback[0] : WEDDING_FALLBACK_IMAGES.cover);

  if (!url || typeof url !== 'string' || url.trim().length <= 5) {
    return defaultFallbackUrl;
  }

  const cleanUrl = url.trim();

  // Replace any generic Unsplash placeholder with real local couple photography
  if (cleanUrl.includes('images.unsplash.com')) {
    return defaultFallbackUrl;
  }

  return cleanUrl;
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
